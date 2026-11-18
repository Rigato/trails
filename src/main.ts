/**
 * Boot do protótipo P0 «Contrato» e costura render ↔ input ↔ core.
 *
 * O core é a única autoridade de regra e aplica cada ação instantaneamente. A
 * apresentação (este arquivo) guarda o snapshot anterior só para animar:
 *
 * 1. todo input entra no `ActionBuffer` e é drenado no máximo uma ação por
 *    passo — durante a animação os toques ficam na fila (§3.3, D4);
 * 2. uma ação que avança começa um passo visual de `stepDurationMs`; o giro da
 *    peça começa no mesmo instante (`rotationMs`), sem fila visual separada;
 * 3. quando o passo visual termina, o buffer drena a próxima ação (com
 *    `bufferedStepGapMs` de pausa extra, default 0 = passos encadeados);
 * 4. um único `requestAnimationFrame` desenha tudo e mantém a marcha da
 *    previsão viva mesmo com o jogo parado.
 *
 * O recomeço é síncrono: cancelar animação + limpar buffer + resetar o core +
 * redesenhar — nenhuma ação de uma run morta sobrevive (D1/D5).
 */

import { TUNING } from './config/tuning';
import type {
  Action,
  ApplyResult,
  CellPos,
  Color,
  Direction,
  GameState,
  Piece,
  Prediction,
  Train,
  TrainId,
} from './core/types';
import { cellKey } from './core/types';
import { ActionBuffer } from './core/buffer';
import { setup } from './core/game';
import { attachPointerInput } from './input/pointer';
import { P0_LEVEL } from './level/p0';
import {
  CELL_FLASH_MS,
  easeStep,
  firstHintTarget,
  rotationProgress,
  stationPulseScale,
  type CellFlash,
  type DeliveryPulse,
  type DerailExit,
} from './render/fx';
import { cellCenter, computeLayout, type SceneLayout } from './render/layout';
import { drawScene, type TrainView } from './render/scene';
import { directionAngle } from './render/train';

/** Proporção máxima largura/altura da faixa de jogo no desktop. */
const SHELL_ASPECT = 9 / 16;

/** Teto de DPR: acima disso o custo de fill rate não paga a nitidez. */
const MAX_DPR = 2;

/** Trem em animação de um passo: posição/ângulo de origem e destino. */
interface MoveAnimation {
  readonly train: Train;
  readonly from: CellPos | null;
  readonly to: CellPos;
  readonly fromDirection: Direction;
  readonly toDirection: Direction;
  /** Primeiro passo: o trem entra pela célula de entrada (pop, sem deslize). */
  readonly entering: boolean;
}

/** Um passo em andamento: o snapshot antigo virou dados de interpolação. */
interface StepAnimation {
  readonly startedAt: number;
  readonly endsAt: number;
  readonly rotation: {
    readonly cell: CellPos;
    readonly from: Piece;
    readonly to: Piece;
  } | null;
  readonly moves: readonly MoveAnimation[];
  readonly deliveries: readonly {
    readonly station: CellPos;
    readonly color: Color;
  }[];
  readonly derails: readonly {
    readonly train: Train;
    readonly at: CellPos;
    readonly direction: Direction;
  }[];
}

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Elemento obrigatório ausente no index.html: ${selector}`);
  }

  return element;
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: false });

  if (ctx === null) {
    throw new Error('Canvas 2D indisponível neste navegador.');
  }

  return ctx;
}

const stage = requiredElement<HTMLElement>('#stage');
const canvas = requiredElement<HTMLCanvasElement>('#game');
const ctx = requiredContext(canvas);

const game = setup(P0_LEVEL);
const buffer = new ActionBuffer(TUNING.maxBufferedActions);

/** Ação drenada ainda não iniciada, esperando o `bufferedStepGapMs`. */
let pendingStepAt: number | null = null;
/** Passo visual em andamento; `null` = repouso (a marcha da previsão segue). */
let animation: StepAnimation | null = null;

let predictions: Prediction[] = collectPredictions();
/** Peça do primeiro giro que pulsa no passo 0 (D6); `null` depois da 1ª ação. */
let firstHint: CellPos | null = firstHintTarget(game.state, predictions);
let layout: SceneLayout = computeLayout(1, 1, game.state.board);

/** Feedbacks de vida curta, todos ancorados no relógio do loop. */
let flashes: CellFlash[] = [];
let pulses: DeliveryPulse[] = [];
let exits: DerailExit[] = [];

/** O jogo terminou (vitória ou «sem trem ativo» de D1)? */
function isFinished(): boolean {
  return game.state.status === 'won' || game.state.status === 'deadEnd';
}

/** Previsões do estado atual; recalculadas a cada passo e a cada reset. */
function collectPredictions(): Prediction[] {
  const result: Prediction[] = [];

  for (const train of game.state.trains) {
    const prediction = game.prediction(train.id, TUNING.predictionSafetyCapSteps);

    if (prediction !== undefined) {
      result.push(prediction);
    }
  }

  return result;
}

/** Direção de deslocamento entre duas células vizinhas. */
function directionBetween(from: CellPos, to: CellPos): Direction | undefined {
  const dc = to.col - from.col;
  const dr = to.row - from.row;

  if (dc === 1 && dr === 0) {
    return 'east';
  }
  if (dc === -1 && dr === 0) {
    return 'west';
  }
  if (dc === 0 && dr === 1) {
    return 'south';
  }
  if (dc === 0 && dr === -1) {
    return 'north';
  }

  return undefined;
}

/** Direção em que o corpo do trem aponta no snapshot. */
function trainHeading(train: Train): Direction {
  switch (train.status.kind) {
    case 'waiting':
      return train.status.direction;
    case 'running':
      return train.status.incoming;
    case 'delivered':
    case 'derailed':
      return 'east';
  }
}

/**
 * Deriva a animação do passo dos eventos do core.
 *
 * `trainMoved` dá origem/destino; `trainDelivered`/`trainDerailed` guardam o
 * trem do snapshot anterior (ele sai da `GameState` no mesmo instante). Trens
 * ativos sem evento de movimento continuam visíveis parados — o P0 não tem
 * esse caso, mas o render não deve depender disso.
 */
function buildStepAnimation(
  previous: GameState,
  result: ApplyResult,
  startedAt: number,
): StepAnimation {
  const previousById = new Map<TrainId, Train>();
  for (const train of previous.trains) {
    previousById.set(train.id, train);
  }

  const moves = new Map<TrainId, MoveAnimation>();
  let rotation: StepAnimation['rotation'] = null;
  const deliveries: { station: CellPos; color: Color }[] = [];
  const derails: { train: Train; at: CellPos; direction: Direction }[] = [];

  for (const event of result.events) {
    switch (event.kind) {
      case 'pieceRotated':
        rotation = { cell: event.cell, from: event.from, to: event.to };
        break;

      case 'trainMoved': {
        const train = previousById.get(event.trainId);

        if (train === undefined) {
          break;
        }

        const heading = trainHeading(train);
        moves.set(event.trainId, {
          train,
          from: event.from,
          to: event.to,
          fromDirection: heading,
          toDirection:
            event.from === null
              ? heading
              : (directionBetween(event.from, event.to) ?? heading),
          entering: event.from === null,
        });
        break;
      }

      case 'trainDelivered': {
        const train = previousById.get(event.trainId);

        if (train !== undefined) {
          deliveries.push({ station: event.station, color: train.color });
        }
        break;
      }

      case 'trainDerailed': {
        const train = previousById.get(event.trainId);

        if (train !== undefined) {
          derails.push({ train, at: event.at, direction: event.direction });
        }
        break;
      }

      case 'collision':
      case 'victory':
      case 'deadEnd':
        break;
    }
  }

  for (const train of previous.trains) {
    if (moves.has(train.id)) {
      continue;
    }

    const status = train.status;

    if (status.kind === 'waiting' || status.kind === 'running') {
      const heading = trainHeading(train);
      moves.set(train.id, {
        train,
        from: status.cell,
        to: status.cell,
        fromDirection: heading,
        toDirection: heading,
        entering: false,
      });
    }
  }

  return {
    startedAt,
    endsAt: startedAt + Math.max(0, TUNING.stepDurationMs),
    rotation,
    moves: [...moves.values()],
    deliveries,
    derails,
  };
}

/** Reinicia o flash de uma célula (um toque novo reacende o mesmo efeito). */
function addFlash(cell: CellPos, now: number): void {
  const key = cellKey(cell);
  const index = flashes.findIndex((flash) => cellKey(flash.cell) === key);
  const flash: CellFlash = { cell, startedAt: now };

  if (index >= 0) {
    flashes[index] = flash;
  } else {
    flashes.push(flash);
  }
}

/** Flash de toque sem ação (D3): só `null`/`blocked`, nunca `ignored`. */
function noteTouchFeedback(result: ApplyResult, now: number): void {
  if (result.action.kind !== 'tap') {
    return;
  }

  const outcome = result.outcome;

  if (
    outcome.kind === 'null' &&
    outcome.reason !== 'outOfBounds' &&
    TUNING.nullTouchFlash !== 'none'
  ) {
    addFlash(result.action.cell, now);
    return;
  }

  if (outcome.kind === 'blocked' && TUNING.blockedTouchFlash !== 'none') {
    addFlash(result.action.cell, now);
  }
}

/**
 * Drena ações enquanto não há passo visual.
 *
 * Ação nula/bloqueada não começa animação: flash e segue para a próxima. Uma
 * ação que avança abre exatamente um passo visual — a próxima espera o fim
 * deste passo (D4: revalidação no dreno).
 */
function drainAvailable(now: number): void {
  while (animation === null && pendingStepAt === null) {
    if (isFinished()) {
      buffer.clear();
      return;
    }

    const previous = game.state;
    const result = buffer.drainNext((action) => game.apply(action));

    if (result === undefined) {
      return;
    }

    if (result.advanced) {
      predictions = collectPredictions();
      firstHint = firstHintTarget(game.state, predictions);
      animation = buildStepAnimation(previous, result, now);
      return;
    }

    noteTouchFeedback(result, now);
  }
}

/**
 * Fecha o passo visual e libera o próximo item da fila.
 *
 * Os feedbacks de fim de passo (pulse de entrega, fantasma de descarrilamento)
 * nascem em `endsAt`, não no instante do quadro, para não atrasar com jitter de
 * rAF. O dreno seguinte só entra depois do `bufferedStepGapMs`.
 */
function finishStep(now: number): void {
  const step = animation;

  if (step === null) {
    return;
  }

  animation = null;

  for (const delivery of step.deliveries) {
    pulses.push({
      cell: delivery.station,
      color: delivery.color,
      startedAt: step.endsAt,
    });
  }

  for (const derail of step.derails) {
    exits.push({
      train: derail.train,
      cell: derail.at,
      direction: derail.direction,
      startedAt: step.endsAt,
    });
  }

  if (isFinished()) {
    // A run acabou: ações enfileiradas durante o último passo não pertencem a
    // nenhuma próxima run.
    buffer.clear();
    pendingStepAt = null;
    return;
  }

  if (buffer.isEmpty) {
    return;
  }

  if (TUNING.bufferedStepGapMs > 0) {
    const nextAt = step.endsAt + TUNING.bufferedStepGapMs;

    if (nextAt > now) {
      pendingStepAt = nextAt;
      return;
    }
  }

  drainAvailable(now);
}

/**
 * Enfileira o input. A ação só é aplicada quando o passo anterior termina —
 * nada é descartado por chegar «cedo» (§3.3); o teto de 12 protege a fila de
 * rajadas absurdas.
 */
function onAction(action: Action): void {
  if (isFinished()) {
    return;
  }

  if (!buffer.enqueue(action)) {
    return;
  }

  drainAvailable(performance.now());
}

/** Recomeçar é instantâneo: buffer limpo, animação cancelada, estado inicial. */
function onReset(): void {
  buffer.clear();
  animation = null;
  pendingStepAt = null;
  flashes = [];
  pulses = [];
  exits = [];
  game.reset();
  predictions = collectPredictions();
  firstHint = firstHintTarget(game.state, predictions);
  draw(performance.now());
}

/** Interpolação angular pelo caminho mais curto (radianos). */
function lerpAngle(from: number, to: number, t: number): number {
  let delta = (to - from) % (Math.PI * 2);

  if (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  if (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  return from + delta * t;
}

/** Posições visuais dos trens no quadro: animação ou repouso. */
function buildTrainViews(now: number): TrainView[] {
  const views: TrainView[] = [];

  if (animation !== null) {
    const duration = Math.max(1, animation.endsAt - animation.startedAt);
    const progress = easeStep(
      TUNING.stepEasing,
      (now - animation.startedAt) / duration,
    );

    for (const move of animation.moves) {
      const from = cellCenter(layout, move.from ?? move.to);
      const to = cellCenter(layout, move.to);
      const enteringScale = move.entering ? 1 + 0.1 * (1 - progress) : 1;

      views.push({
        train: move.train,
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        angle: lerpAngle(
          directionAngle(move.fromDirection),
          directionAngle(move.toDirection),
          progress,
        ),
        scale: enteringScale,
        alpha: 1,
      });
    }

    return views;
  }

  for (const train of game.state.trains) {
    const status = train.status;

    if (status.kind !== 'waiting' && status.kind !== 'running') {
      continue;
    }

    const center = cellCenter(layout, status.cell);
    const heading = status.kind === 'waiting' ? status.direction : status.incoming;

    views.push({
      train,
      x: center.x,
      y: center.y,
      angle: directionAngle(heading),
      scale: 1,
      alpha: 1,
    });
  }

  return views;
}

/** Ângulo contínuo da peça que está girando (a regra já aplicou o giro). */
function buildPieceAngles(now: number): ReadonlyMap<string, number> | undefined {
  const rotation = animation?.rotation;

  if (animation === null || rotation === null || rotation === undefined) {
    return undefined;
  }

  const duration = Math.max(
    1,
    Math.min(TUNING.rotationMs, TUNING.stepDurationMs),
  );
  const progress = rotationProgress(
    (now - animation.startedAt) / duration,
    TUNING.rotationOvershoot,
  );
  const base = (rotation.from.rot * Math.PI) / 2;

  return new Map([[cellKey(rotation.cell), base + progress * (Math.PI / 2)]]);
}

/** Escala do corpo da estação durante o pulse de entrega (D5). */
function buildStationScales(now: number): ReadonlyMap<string, number> | undefined {
  if (pulses.length === 0) {
    return undefined;
  }

  const scales = new Map<string, number>();
  const duration = Math.max(1, TUNING.deliverPulseMs);

  for (const pulse of pulses) {
    const progress = (now - pulse.startedAt) / duration;

    if (progress < 0 || progress >= 1) {
      continue;
    }

    scales.set(cellKey(pulse.cell), stationPulseScale(progress));
  }

  return scales.size > 0 ? scales : undefined;
}

/** Remove feedbacks vencidos; manter as listas curtas também poupa fill rate. */
function pruneFeedback(now: number): void {
  flashes = flashes.filter((flash) => now - flash.startedAt < CELL_FLASH_MS);
  pulses = pulses.filter(
    (pulse) => now - pulse.startedAt < TUNING.deliverPulseMs,
  );
  exits = exits.filter(
    (exit) => now - exit.startedAt < TUNING.derailExitMs,
  );
}

/** Desenha um quadro inteiro a partir do relógio. */
function draw(now: number): void {
  pruneFeedback(now);

  drawScene(ctx, layout, {
    state: game.state,
    predictions,
    levelName: P0_LEVEL.name,
    now,
    trains: buildTrainViews(now),
    pieceAngles: buildPieceAngles(now),
    stationScales: buildStationScales(now),
    firstHint,
    flashes,
    pulses,
    exits,
  });
}

/** Loop único: fecha o passo, drena a fila e desenha — sempre, sem setInterval. */
function frame(timestamp: number): void {
  if (pendingStepAt !== null && timestamp >= pendingStepAt) {
    pendingStepAt = null;
  }

  if (animation !== null && timestamp >= animation.endsAt) {
    finishStep(timestamp);
  }

  if (animation === null && pendingStepAt === null) {
    drainAvailable(timestamp);
  }

  draw(timestamp);
  requestAnimationFrame(frame);
}

/** Ajusta a faixa de jogo e o backing store; recalcula layout e redesenha. */
function resize(): void {
  const { width: availableWidth, height: availableHeight } = stage.getBoundingClientRect();

  if (availableWidth <= 0 || availableHeight <= 0) {
    return;
  }

  const cssWidth = Math.min(availableWidth, availableHeight * SHELL_ASPECT);
  const cssHeight = availableHeight;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  // Desenhe sempre em px CSS; o transform escala para o backing store.
  ctx.setTransform(pixelWidth / cssWidth, 0, 0, pixelHeight / cssHeight, 0, 0);
  layout = computeLayout(cssWidth, cssHeight, game.state.board);
  draw(performance.now());
}

attachPointerInput(canvas, {
  getLayout: () => layout,
  onAction,
  onReset,
  isFinished,
});

window.addEventListener('resize', resize, { passive: true });
window.visualViewport?.addEventListener('resize', resize, { passive: true });

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => resize()).observe(stage);
}

/**
 * Instrumentação somente-leitura de QA: o orquestrador valida rajadas, duração
 * do passo e limpeza do buffer sem depender de OCR no canvas.
 */
declare global {
  interface Window {
    __trailsDebug?: {
      readonly state: GameState;
      readonly predictions: readonly Prediction[];
      readonly layout: SceneLayout;
      readonly bufferSize: number;
      readonly animating: boolean;
      readonly pendingStepAt: number | null;
      /** Peça do hint do primeiro frame (D6); `null` depois da 1ª ação válida. */
      readonly firstHint: CellPos | null;
      /** Início/fim do passo visual em andamento (QA de duração). */
      readonly stepStartedAt: number | null;
      readonly stepEndsAt: number | null;
    };
  }
}

window.__trailsDebug = {
  get state() {
    return game.state;
  },
  get predictions() {
    return predictions;
  },
  get layout() {
    return layout;
  },
  get bufferSize() {
    return buffer.size;
  },
  get animating() {
    return animation !== null;
  },
  get pendingStepAt() {
    return pendingStepAt;
  },
  get firstHint() {
    return firstHint;
  },
  get stepStartedAt() {
    return animation?.startedAt ?? null;
  },
  get stepEndsAt() {
    return animation?.endsAt ?? null;
  },
};

resize();
requestAnimationFrame(frame);
