/**
 * Boot do protótipo Trails (P0 «Contrato» → P1 «Sincronia») e costura
 * render ↔ input ↔ core.
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
 *    previsão viva mesmo com o jogo parado;
 * 5. E8: o toggle do Y anima só a agulha (`yToggleMs`) e cada vida perdida
 *    pulsa a marca no HUD (`lifeLostPulseMs`), no mesmo relógio.
 * 6. M1/D22–D26: o seletor CW/CCW é ferramenta, não turno — alternar muda só
 *    o sentido dos próximos taps (capturado no enqueue), pulsa o glifo e não
 *    toca no buffer; o estado sobrevive a reset e troca de fase. A varredura
 *    do giro deriva o sentido real de `from.rot → to.rot` (CCW = −90°).
 *
 * O recomeço é síncrono: cancelar animação + limpar buffer + resetar o core +
 * redesenhar — nenhuma ação de uma run morta sobrevive, e as vidas voltam ao
 * valor do layout (D1/D5/D7).
 */

import { TUNING } from './config/tuning';
import type {
  Action,
  ApplyResult,
  CellPos,
  Color,
  Direction,
  GameState,
  LevelLayout,
  Piece,
  Prediction,
  Rotation,
  RotationDirection,
  Train,
  TrainId,
} from './core/types';
import { cellKey, directionOffset, opposite } from './core/types';
import { ActionBuffer } from './core/buffer';
import { setup } from './core/game';
import { attachPointerInput } from './input/pointer';
import { PHASES } from './level';
import {
  CELL_FLASH_MS,
  derailVisuals,
  easeStep,
  firstHintTarget,
  isInsideTunnel,
  lifeLostMarkIndices,
  rotationProgress,
  stationPulseScale,
  tunnelEmergeMix,
  tunnelEnterAlpha,
  tunnelMotion,
  yNeedleSweepAngle,
  type CellFlash,
  type CoinPulse,
  type DeliveryPulse,
  type DerailExit,
  type DerailVisual,
  type LifeLostPulse,
  type TunnelMotion,
} from './render/fx';
import { cellCenter, computeLayout, type SceneLayout } from './render/layout';
import { drawScene, type TrainView } from './render/scene';
import { directionAngle } from './render/train';

/** Proporção máxima largura/altura da faixa de jogo no desktop. */
const SHELL_ASPECT = 9 / 16;

/** Teto de DPR: acima disso o custo de fill rate não paga a nitidez. */
const MAX_DPR = 2;

/**
 * Início da emergência do túnel: quanto o trem nasce atrás do centro do portal
 * parceiro, contra a direção de viagem, em fração da célula (E18).
 */
const TUNNEL_EMERGE_BACK_RATIO = 0.38;

/** Trem em animação de um passo: posição/ângulo de origem e destino. */
interface MoveAnimation {
  readonly train: Train;
  /** `null` no primeiro passo: origem é o ponto externo de espera. */
  readonly from: CellPos | null;
  readonly to: CellPos;
  readonly fromDirection: Direction;
  readonly toDirection: Direction;
  /** Entrada/saída do portal (E18); `null` em movimento comum. */
  readonly tunnel: TunnelMotion;
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
  /** Troca de ponta do Y: os três stubs ficam parados; só a agulha varre. */
  readonly toggle: {
    readonly cell: CellPos;
    readonly fromArm: 0 | 1;
    readonly toArm: 0 | 1;
  } | null;
  readonly moves: readonly MoveAnimation[];
  readonly deliveries: readonly {
    readonly station: CellPos;
    readonly color: Color;
  }[];
  readonly derails: readonly DerailVisual[];
  /** Índices das marcas de vida esvaziadas neste passo (E8). */
  readonly lifeLostMarks: readonly number[];
  /** Células de moeda coletadas neste passo (E13). */
  readonly coins: readonly CellPos[];
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

const firstPhase = PHASES[0];

if (firstPhase === undefined) {
  throw new Error('PHASES vazio: o boot precisa de ao menos uma fase.');
}

/** Fase atual e posição na sequência D10. */
let phaseIndex = 0;
let level: LevelLayout = firstPhase;
let game = setup(level);
const buffer = new ActionBuffer(TUNING.maxBufferedActions);

/**
 * Sentido ativo do seletor CW/CCW (D22/D26).
 *
 * Estado de FERRAMENTA: nasce CW no boot, alterna por toque imediato e não é
 * tocado por reset de run nem por troca de fase.
 */
let rotationDirection: RotationDirection = 'cw';

/** Início do pulso do glifo do seletor ao alternar; `null` = sem pulso. */
let selectorPulseAt: number | null = null;

/** A fase atual tem sucessora? Decide «Próxima fase» vs. «Jogar de novo». */
function hasNextPhase(): boolean {
  return phaseIndex < PHASES.length - 1;
}

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
let lifePulses: LifeLostPulse[] = [];
let coinPulses: CoinPulse[] = [];
let coinTickAt: number | null = null;

/** O jogo terminou (vitória, «sem trem ativo» de D1 ou derrota D7)? */
function isFinished(): boolean {
  return (
    game.state.status === 'won' ||
    game.state.status === 'deadEnd' ||
    game.state.status === 'lost'
  );
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
 * ativos sem evento de movimento continuam visíveis parados — o conteúdo atual
 * não tem esse caso, mas o render não deve depender disso.
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
  let toggle: StepAnimation['toggle'] = null;
  const deliveries: { station: CellPos; color: Color }[] = [];
  const coins: CellPos[] = [];

  for (const event of result.events) {
    switch (event.kind) {
      case 'pieceRotated':
        rotation = { cell: event.cell, from: event.from, to: event.to };
        break;

      case 'pieceToggled':
        if (event.from.kind === 'y' && event.to.kind === 'y') {
          toggle = {
            cell: event.cell,
            fromArm: event.from.arm,
            toArm: event.to.arm,
          };
        }
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
          tunnel: tunnelMotion(previous.board, event.from, event.to),
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

      case 'coinCollected':
        coins.push(event.cell);
        break;

      case 'trainDerailed':
        // Os fantasmas saem de `derailVisuals` (um por evento, inclusive os
        // DOIS participantes de uma colisão).
        break;

      case 'collision':
      case 'lifeLost':
      case 'victory':
      case 'deadEnd':
        break;
    }
  }

  const derails = derailVisuals(result.events, previous.trains);
  const lifeLostMarks = lifeLostMarkIndices(result.events);

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
        tunnel: null,
      });
    }
  }

  return {
    startedAt,
    endsAt: startedAt + Math.max(0, TUNING.stepDurationMs),
    rotation,
    toggle,
    moves: [...moves.values()],
    deliveries,
    derails,
    lifeLostMarks,
    coins,
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

      // Coleta em ~0 tempo: a moeda já saiu do snapshot; o anel e o tick do
      // contador nascem no INÍCIO do passo, não em `endsAt`.
      for (const cell of animation.coins) {
        coinPulses.push({ cell, startedAt: now });
      }
      if (animation.coins.length > 0) {
        coinTickAt = now;
      }

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
      reason: derail.reason,
      startedAt: step.endsAt,
    });
  }

  // Cada marca esvaziada pulsa quando o trem termina de sair (step.endsAt),
  // junto com o fantasma: a perda e a consequência visual batem no mesmo quadro.
  for (const markIndex of step.lifeLostMarks) {
    lifePulses.push({ markIndex, startedAt: step.endsAt });
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
 * Alterna o sentido do seletor CW↔CCW (D25/D26).
 *
 * Executa na hora, sem `Action`, sem buffer e sem passo: é ferramenta, não
 * turno. O pulso do glifo nasce agora; o sentido ativo só é consumido quando
 * um tap de célula o captura no enqueue. Reset e troca de fase não tocam aqui.
 */
function onRotationToggle(): void {
  rotationDirection = rotationDirection === 'cw' ? 'ccw' : 'cw';
  selectorPulseAt = performance.now();
  draw(selectorPulseAt);
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
  lifePulses = [];
  coinPulses = [];
  coinTickAt = null;
  game.reset();
  predictions = collectPredictions();
  firstHint = firstHintTarget(game.state, predictions);
  draw(performance.now());
}

/**
 * Carrega uma fase da sequência (D10) do zero, como o boot faria. Vidas vêm do
 * layout pelo `setup`; nada da run anterior sobrevive (buffer, animação, fx).
 */
function loadPhase(index: number): void {
  const next = PHASES[index];

  if (next === undefined) {
    return;
  }

  buffer.clear();
  animation = null;
  pendingStepAt = null;
  flashes = [];
  pulses = [];
  exits = [];
  lifePulses = [];
  coinPulses = [];
  coinTickAt = null;
  phaseIndex = index;
  level = next;
  game = setup(level);
  predictions = collectPredictions();
  firstHint = firstHintTarget(game.state, predictions);
  layout = computeLayout(layout.width, layout.height, game.state.board);
  draw(performance.now());
}

/**
 * Ação do botão único de fim de run: vitória com sucessora avança; vitória na
 * última fase e deadEnd/lost recomeçam a fase atual (D10).
 */
function onFinishedAction(): void {
  if (game.state.status === 'won' && hasNextPhase()) {
    loadPhase(phaseIndex + 1);
    return;
  }

  onReset();
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

/**
 * Centro visual de um trem `waiting`: uma célula atrás de `entry.cell`, contra
 * a direção de entrada — fora da grade. É o ponto de espera; o primeiro passo
 * desliza daqui até o centro da primeira célula de trilho.
 */
function waitingCenter(status: {
  readonly cell: CellPos;
  readonly direction: Direction;
}): { readonly x: number; readonly y: number } {
  const center = cellCenter(layout, status.cell);
  const outward = directionOffset(opposite(status.direction));

  return {
    x: center.x + outward.col * layout.cell,
    y: center.y + outward.row * layout.cell,
  };
}

/** Posições visuais dos trens no quadro: animação ou repouso. */
function buildTrainViews(now: number): TrainView[] {
  const views: TrainView[] = [];

  if (animation !== null) {
    const duration = Math.max(1, animation.endsAt - animation.startedAt);
    const raw = (now - animation.startedAt) / duration;
    const progress = easeStep(TUNING.stepEasing, raw);

    for (const move of animation.moves) {
      const from =
        move.from === null && move.train.status.kind === 'waiting'
          ? waitingCenter(move.train.status)
          : cellCenter(layout, move.from ?? move.to);
      const to = cellCenter(layout, move.to);

      if (move.tunnel === 'enter') {
        // Passo de entrada: desliza até a boca e esmaece até sumir no fim.
        views.push({
          train: move.train,
          x: from.x + (to.x - from.x) * progress,
          y: from.y + (to.y - from.y) * progress,
          angle: lerpAngle(
            directionAngle(move.fromDirection),
            directionAngle(move.toDirection),
            progress,
          ),
          scale: 1,
          alpha: tunnelEnterAlpha(raw, duration),
        });
        continue;
      }

      if (move.tunnel === 'emerge') {
        // Passo de travessia: nasce na boca do PARCEIRO (atrás do centro,
        // contra a direção), desliza para fora e fica no centro até o fim.
        // A origem geométrica do evento é o outro portal; ignorá-la é o que
        // impede o deslize reto atravessando o tabuleiro.
        const mix = tunnelEmergeMix(raw, duration);
        const back = layout.cell * TUNNEL_EMERGE_BACK_RATIO * (1 - mix);
        const outward = directionOffset(move.toDirection);

        views.push({
          train: move.train,
          x: to.x - outward.col * back,
          y: to.y - outward.row * back,
          angle: directionAngle(move.toDirection),
          scale: 1,
          alpha: mix,
        });
        continue;
      }

      views.push({
        train: move.train,
        x: from.x + (to.x - from.x) * progress,
        y: from.y + (to.y - from.y) * progress,
        angle: lerpAngle(
          directionAngle(move.fromDirection),
          directionAngle(move.toDirection),
          progress,
        ),
        scale: 1,
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

    // Entre os dois tempos da travessia o trem está DENTRO do portal: o
    // snapshot ainda o mantém em `running` na boca, mas desenhá-lo ali
    // quebraria o «entrou e sumiu» (E18).
    if (status.kind === 'running' && isInsideTunnel(game.state.board, status)) {
      continue;
    }

    const center =
      status.kind === 'waiting'
        ? waitingCenter(status)
        : cellCenter(layout, status.cell);
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

/**
 * Passo angular da varredura de giro, em quartos de volta, pelo caminho CURTO.
 *
 * A regra já decidiu o giro (`from.rot → to.rot`); aqui só se deriva o sentido
 * visual: +1 no CW e −1 no CCW — nunca um giro fake de +3 (270°). Como o giro
 * é sempre 90°, o delta normalizado é exatamente ±1.
 */
function rotationSweepQuarters(from: Rotation, to: Rotation): number {
  let delta = to - from;

  if (delta > 2) {
    delta -= 4;
  }
  if (delta < -2) {
    delta += 4;
  }

  return delta;
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
  const sweep =
    rotationSweepQuarters(rotation.from.rot, rotation.to.rot) * (Math.PI / 2);

  return new Map([[cellKey(rotation.cell), base + progress * sweep]]);
}

/**
 * Ângulo local da agulha no toggle do Y (E8).
 *
 * Os três stubs não giram; só a lâmina varre do braço antigo ao novo, pelo
 * lado fechado. A varredura dura `yToggleMs` (120), dentro do passo de 180 —
 * depois disso a agulha fica no braço do snapshot e o mapa some. Os dois
 * ângulos são locais à peça: a rotação do Y continua sendo o outro caminho
 * (`pieceAngles`).
 */
function buildNeedleAngles(now: number): ReadonlyMap<string, number> | undefined {
  const toggle = animation?.toggle;

  if (animation === null || toggle === null || toggle === undefined) {
    return undefined;
  }

  const duration = Math.max(
    1,
    Math.min(TUNING.yToggleMs, TUNING.stepDurationMs),
  );
  const progress = (now - animation.startedAt) / duration;

  if (progress >= 1) {
    return undefined;
  }

  return new Map([
    [
      cellKey(toggle.cell),
      yNeedleSweepAngle(toggle.fromArm, toggle.toArm, progress),
    ],
  ]);
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
  lifePulses = lifePulses.filter(
    (pulse) => now - pulse.startedAt < TUNING.lifeLostPulseMs,
  );
  coinPulses = coinPulses.filter(
    (pulse) => now - pulse.startedAt < TUNING.coinPulseMs,
  );
}

/** Desenha um quadro inteiro a partir do relógio. */
function draw(now: number): void {
  pruneFeedback(now);

  const collected = new Set(game.state.coinsCollected.map((coin) => cellKey(coin)));
  const coins = (level.coins ?? []).filter(
    (coin) => !collected.has(cellKey(coin)),
  );

  drawScene(ctx, layout, {
    state: game.state,
    predictions,
    levelName: level.name,
    livesTotal: level.lives ?? null,
    hasNextPhase: hasNextPhase(),
    entries: level.trains.map((train) => train.entry),
    now,
    trains: buildTrainViews(now),
    pieceAngles: buildPieceAngles(now),
    stationScales: buildStationScales(now),
    needleAngles: buildNeedleAngles(now),
    firstHint,
    flashes,
    pulses,
    exits,
    lifePulses,
    coins,
    coinsTotal: level.coins?.length ?? 0,
    coinPulses,
    coinTickAt,
    rotationDirection,
    selectorPulseAt,
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
  onFinishedAction,
  isFinished,
  getRotationDirection: () => rotationDirection,
  onRotationToggle,
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
      readonly phaseIndex: number;
      readonly phaseCount: number;
      readonly levelId: string;
      readonly levelName: string;
      readonly hasNextPhase: boolean;
      readonly bufferSize: number;
      readonly animating: boolean;
      readonly pendingStepAt: number | null;
      /** Peça do hint do primeiro frame (D6); `null` depois da 1ª ação válida. */
      readonly firstHint: CellPos | null;
      /** Marcas de vida que ainda pulsam (E8), com índice e início. */
      readonly lifePulses: readonly LifeLostPulse[];
      /** Coletas de moeda recentes (E13), com célula e início. */
      readonly coinPulses: readonly CoinPulse[];
      /** Início do tick do contador de moedas (E13); `null` = sem tick. */
      readonly coinTickAt: number | null;
      /** Início/fim do passo visual em andamento (QA de duração). */
      readonly stepStartedAt: number | null;
      readonly stepEndsAt: number | null;
      /** Sentido ativo do seletor CW/CCW (M1/D22–D26), somente leitura. */
      readonly rotationDirection: RotationDirection;
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
  get phaseIndex() {
    return phaseIndex;
  },
  get phaseCount() {
    return PHASES.length;
  },
  get levelId() {
    return level.id;
  },
  get levelName() {
    return level.name;
  },
  get hasNextPhase() {
    return hasNextPhase();
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
  get lifePulses() {
    return lifePulses;
  },
  get coinPulses() {
    return coinPulses;
  },
  get coinTickAt() {
    return coinTickAt;
  },
  get stepStartedAt() {
    return animation?.startedAt ?? null;
  },
  get stepEndsAt() {
    return animation?.endsAt ?? null;
  },
  get rotationDirection() {
    return rotationDirection;
  },
};

resize();
requestAnimationFrame(frame);
