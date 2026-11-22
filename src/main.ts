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
 * 7. M2/D30–D31: o boot abre a LISTA DE FASES (home), não a partida. O save
 *    entre sessões é lido uma vez pelo `StorageService` e persiste a cada
 *    vitória (desbloqueio da sucessora), na hora; reset de run e abandono para
 *    a lista não tocam no save. O seletor CW/CCW atravessa lista ↔ jogo sem
 *    resetar.
 * 8. M3/D27/D30/D31: a vitória banca as moedas da run + bônus n×(n−1) por
 *    trem entregue e grava o selo de perfeição (todos os trens, todas as
 *    moedas, run sem consumíveis) UMA vez por fase. A persistência é única,
 *    junto do desbloqueio. Derrota/abandono não bancam nada; a carteira no
 *    header é o saldo persistente, e o painel de vitória mostra a conta.
 * 9. M4/D28: no deadEnd de fase não-tutorial, a fileira inferior oferece
 *    «Resgatar · 8» (carteira, 1/run) ou «Desistir» (grátis). O resgate NÃO é
 *    ação: restaura o último trem perdido como `waiting` na entrada original,
 *    não devolve a vida, deduz a carteira na hora (persistida) e marca
 *    `consumableUsed` (selo bloqueado). O tutorial mantém o «Recomeçar» (D1);
 *    `won`/`lost` não oferecem resgate (D11).
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
import { attachPointerInput, type ScreenMode } from './input/pointer';
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
import {
  cellCenter,
  computeLayout,
  computePhaseListLayout,
  type PhaseListLayout,
  type Rect,
  type SceneLayout,
} from './render/layout';
import { drawPhaseList } from './render/phasesList';
import { drawScene, type TrainView } from './render/scene';
import { directionAngle } from './render/train';
import { drawVictoryPanel } from './render/victoryPanel';
import {
  addSeal,
  sealCondition,
  spendFromWallet,
  victoryBanking,
} from './save/economy';
import { nextUnlockedIndex, recommendedPhaseIndex } from './save/progress';
import {
  createBrowserStorageBackend,
  createStorageService,
  defaultSaveState,
  type SaveState,
} from './save/storage';

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

/**
 * Save entre sessões (M2/D31): uma única fronteira, backend localStorage.
 *
 * `?resetSave=1` é o reset explícito de QA: limpa ANTES do primeiro load, então
 * o boot já nasce do zero. Fora do Pages/DOM, o adapter cai para memória.
 */
const storage = createStorageService({
  backend: createBrowserStorageBackend(),
  maxUnlockedIndex: PHASES.length - 1,
});

const resetSaveRequested =
  new URLSearchParams(window.location.search).get('resetSave') === '1';

if (resetSaveRequested) {
  storage.clear();
}

/** Progresso carregado; sem save = default seguro (fase 1, carteira 0). */
let saveState: SaveState = storage.load() ?? defaultSaveState();

/**
 * A run atual usou algum consumível (D30)?
 *
 * Nasce `false` em cada setup/reset/troca de fase. O resgate (M4) e o
 * time-travel (M5) são os únicos a marcá-lo; o selo lê este valor na vitória.
 */
let consumableUsed = false;

/**
 * Resgates comprados nesta run (M4/D28) e alvo do próximo resgate.
 *
 * `lastDerailedId` é o trem do `trainDerailed` mais recente da run — o último
 * do array de eventos quando dois caem no mesmo passo (D28). `rescuesUsed`
 * zera em setup/reset/troca de fase; o limite vive no tuning.
 */
let rescuesUsed = 0;
let lastDerailedId: TrainId | null = null;
/** Início do flash do resgate indisponível; `null` = sem flash (D3). */
let rescueDeniedAt: number | null = null;

/** Resumo do banco da última vitória (painel + hook); `null` fora de vitória. */
let lastVictoryBanking: VictorySummary | null = null;

/** Início da conquista/banco da vitória (pulso da estrela, D30/D5). */
let victoryAt: number | null = null;

/** Modo de tela: boot na lista de fases (home), toque num card entra no jogo. */
let screenMode: ScreenMode = 'list';

/** Flash nulo D3 do card bloqueado tocado na lista; `null` = sem flash. */
let lockedCardFlash: { readonly index: number; readonly startedAt: number } | null =
  null;

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

/** Fase recomendada na lista (card com pulso D6): a próxima sem vitória. */
function recommendedIndex(): number {
  return recommendedPhaseIndex(saveState.unlockedIndex, PHASES.length);
}

/** Trens com status `delivered` no snapshot (vitória/painel, M3). */
function deliveredCount(): number {
  return game.state.trains.filter(
    (train) => train.status.kind === 'delivered',
  ).length;
}

/** Resumo econômico da última vitória (hook e painel); limpo a cada reset. */
interface VictorySummary {
  readonly coins: number;
  readonly bonus: number;
  readonly banked: number;
  readonly walletAfter: number;
  readonly sealEarned: boolean;
  readonly sealNew: boolean;
}

/**
 * Persiste a vitória: desbloqueio da sucessora + banco de moedas + selo (M2/M3).
 *
 * Este é o ÚNICO ponto de escrita do save por run. O banco é a moeda coletada
 * na run + bônus n×(n−1) por trem entregue (D27); o selo de perfeição exige
 * todos os trens, todas as moedas e nenhum consumível (D30), e só é gravado
 * uma vez por fase (D31). A persistência é UMA só, com os três campos juntos —
 * um reload no meio da animação não perde a conta.
 *
 * `consumableUsed` nasce `false` a cada run e nada o liga no M3: M4 (resgate)
 * e M5 (time-travel) serão os únicos a marcá-lo.
 */
function recordVictory(now: number): void {
  if (game.state.status !== 'won') {
    return;
  }

  const delivered = deliveredCount();
  const coins = game.state.coinsCollected.length;
  const trainTotal = level.trains.length;
  const coinsTotal = level.coins?.length ?? 0;

  const banking = victoryBanking({
    delivered,
    coins,
    wallet: saveState.wallet,
    table: TUNING.bonusPerTrainTable,
  });

  const sealEarned = sealCondition({
    delivered,
    trainTotal,
    coins,
    coinsTotal,
    consumableUsed,
  });
  const sealUpdate = sealEarned
    ? addSeal(saveState.seals, level.id)
    : { seals: saveState.seals, sealNew: false };
  const unlocked = nextUnlockedIndex(
    saveState.unlockedIndex,
    phaseIndex,
    PHASES.length,
  );
  const changed =
    unlocked !== saveState.unlockedIndex ||
    sealUpdate.sealNew ||
    banking.banked > 0;

  lastVictoryBanking = {
    coins,
    bonus: banking.bonus,
    banked: banking.banked,
    walletAfter: banking.walletAfter,
    sealEarned,
    sealNew: sealUpdate.sealNew,
  };
  victoryAt = now;

  // O glifo da carteira só pulsa quando o saldo realmente sobe; uma vitória
  // de +0 (1 trem, sem moedas) não inventa festa no header.
  if (banking.banked > 0) {
    walletTickAt = now;
  }

  if (!changed) {
    return;
  }

  saveState = {
    ...saveState,
    unlockedIndex: unlocked,
    seals: sealUpdate.seals,
    wallet: banking.walletAfter,
  };
  storage.persist(saveState);
}

/** Ação drenada ainda não iniciada, esperando o `bufferedStepGapMs`. */
let pendingStepAt: number | null = null;
/** Passo visual em andamento; `null` = repouso (a marcha da previsão segue). */
let animation: StepAnimation | null = null;

let predictions: Prediction[] = collectPredictions();
/** Peça do primeiro giro que pulsa no passo 0 (D6); `null` depois da 1ª ação. */
let firstHint: CellPos | null = firstHintTarget(game.state, predictions);
let layout: SceneLayout = computeLayout(1, 1, game.state.board);
/** Layout da home; recalculado no resize, mesmo enquanto a lista está oculta. */
let phaseListLayout: PhaseListLayout = computePhaseListLayout(
  1,
  1,
  PHASES.length,
);

/** Feedbacks de vida curta, todos ancorados no relógio do loop. */
let flashes: CellFlash[] = [];
let pulses: DeliveryPulse[] = [];
let exits: DerailExit[] = [];
let lifePulses: LifeLostPulse[] = [];
let coinPulses: CoinPulse[] = [];
let coinTickAt: number | null = null;
/** Início do tick do glifo da carteira quando a vitória banca (M3). */
let walletTickAt: number | null = null;

/** O jogo terminou (vitória, «sem trem ativo» de D1 ou derrota D7)? */
function isFinished(): boolean {
  return (
    game.state.status === 'won' ||
    game.state.status === 'deadEnd' ||
    game.state.status === 'lost'
  );
}

/**
 * O prompt «Resgatar vs Desistir» está na tela? (M4/D28)
 *
 * Só em `deadEnd` de fase não-tutorial: o tutorial mantém o «Recomeçar» de
 * largura total (D1) e `won`/`lost` não oferecem resgate (a vida não volta,
 * D11). O prompt aparece mesmo sem carteira; nesse caso o botão fica opaco.
 */
function rescuePromptVisible(): boolean {
  return game.state.status === 'deadEnd' && level.tutorial !== true;
}

/**
 * O resgate é comprável agora? deadEnd + fase não-tutorial + resgate restante
 * na run + carteira para o preço + alvo descarrilado (D28).
 */
function rescueAvailable(): boolean {
  if (!rescuePromptVisible()) {
    return false;
  }

  if (rescuesUsed >= TUNING.rescueLimitPerRun || lastDerailedId === null) {
    return false;
  }

  if (saveState.wallet < TUNING.rescuePrice) {
    return false;
  }

  return game.state.trains.some(
    (train) => train.id === lastDerailedId && train.status.kind === 'derailed',
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

      // D28: o alvo do resgate é o ÚLTIMO `trainDerailed` da run. Percorrer o
      // array na ordem cobre empate no mesmo passo (o último evento vence) e
      // cada evento de colisão emite um `trainDerailed` por participante.
      for (const event of result.events) {
        if (event.kind === 'trainDerailed') {
          lastDerailedId = event.trainId;
        }
      }

      // M2/M3: a vitória grava desbloqueio + carteira + selo AGORA, não no
      // toque de «Próxima fase» — um reload no meio da animação não perde a
      // conta.
      recordVictory(now);

      // Coleta em ~0 tempo: a moeda já saiu do snapshot; o anel dourado da
      // coleta nasce no INÍCIO do passo, não em `endsAt`.
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
  consumableUsed = false;
  rescuesUsed = 0;
  lastDerailedId = null;
  rescueDeniedAt = null;
  lastVictoryBanking = null;
  victoryAt = null;
  walletTickAt = null;
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
  consumableUsed = false;
  rescuesUsed = 0;
  lastDerailedId = null;
  rescueDeniedAt = null;
  lastVictoryBanking = null;
  victoryAt = null;
  walletTickAt = null;
  phaseIndex = index;
  level = next;
  game = setup(level);
  predictions = collectPredictions();
  firstHint = firstHintTarget(game.state, predictions);
  layout = computeLayout(layout.width, layout.height, game.state.board);
  draw(performance.now());
}

/**
 * Toque num card da lista (M2).
 *
 * Fase bloqueada: flash nulo D3 e nada acontece (o `index` continua preso ao
 * save). Fase desbloqueada: entra no modo de jogo pelo MESMO `loadPhase` da
 * sequência — vidas, buffer e animações nascem do layout. O seletor CW/CCW é
 * ferramenta global e não é tocado aqui.
 */
function onPhaseCardTap(index: number): void {
  if (screenMode !== 'list') {
    return;
  }

  const phase = PHASES[index];

  if (phase === undefined) {
    return;
  }

  if (index > saveState.unlockedIndex) {
    lockedCardFlash = { index, startedAt: performance.now() };
    draw(lockedCardFlash.startedAt);
    return;
  }

  lockedCardFlash = null;
  screenMode = 'game';
  loadPhase(index);
}

/**
 * Glifo do cabeçalho: abandona a run e volta para a lista (M2).
 *
 * Sem confirmação e sem custo — derrota barata (GDD §3.7). NÃO toca no save:
 * só a vitória persiste progresso. A run fica para trás inteira (buffer,
 * animação e feedbacks limpos); entrar de novo recarrega a fase do zero.
 */
function returnToList(): void {
  if (screenMode === 'list') {
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
  consumableUsed = false;
  rescuesUsed = 0;
  lastDerailedId = null;
  rescueDeniedAt = null;
  lastVictoryBanking = null;
  victoryAt = null;
  walletTickAt = null;
  lockedCardFlash = null;
  screenMode = 'list';
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

/**
 * Compra do «Resgate de trem» (M4/D28).
 *
 * A dedução da carteira é persistida NA HORA (a carteira é um valor entre
 * sessões) e `consumableUsed` bloqueia o selo da run. O core restaura o último
 * trem perdido como `waiting` na entrada original; a compra NÃO é ação e não
 * avança `step` — o trem entra no próximo passo, como na partida (D13). A run
 * continua em `playing`; o buffer é limpo para nenhuma ação da run morta
 * sobreviver.
 *
 * Sem carteira ou sem resgate restante o botão já está opaco; um toque nele
 * apenas pisca (D3) e nada muda.
 */
function onRescue(): void {
  const now = performance.now();

  if (!rescueAvailable() || lastDerailedId === null) {
    rescueDeniedAt = now;
    draw(now);
    return;
  }

  const trainId = lastDerailedId;
  const entry = level.trains.find((train) => train.id === trainId)?.entry;
  const walletAfter = spendFromWallet(saveState.wallet, TUNING.rescuePrice);

  if (entry === undefined || walletAfter === null) {
    rescueDeniedAt = now;
    draw(now);
    return;
  }

  const rescued = game.rescue(trainId);

  if (rescued === undefined) {
    rescueDeniedAt = now;
    draw(now);
    return;
  }

  // Persistência imediata só da carteira; desbloqueio/selo continuam sendo
  // escritos apenas na vitória. Uma falha de storage mantém o saldo em memória.
  saveState = { ...saveState, wallet: walletAfter };
  storage.persist(saveState);

  consumableUsed = true;
  rescuesUsed += 1;
  rescueDeniedAt = null;
  buffer.clear();
  pendingStepAt = null;

  // Pulso na entrada do trem resgatado — família D5/E13, sem passo gasto.
  const train = rescued.trains.find((candidate) => candidate.id === trainId);

  if (train !== undefined) {
    pulses.push({ cell: entry.cell, color: train.color, startedAt: now });
  }

  predictions = collectPredictions();
  firstHint = firstHintTarget(game.state, predictions);
  draw(now);
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
  if (screenMode === 'list') {
    drawPhaseList(ctx, phaseListLayout, {
      phases: PHASES,
      seals: saveState.seals,
      unlockedIndex: saveState.unlockedIndex,
      recommendedIndex: recommendedIndex(),
      wallet: saveState.wallet,
      now,
      lockedFlash: lockedCardFlash,
    });
    return;
  }

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
    coinPulses,
    wallet: saveState.wallet,
    walletTickAt,
    rotationDirection,
    selectorPulseAt,
    tutorial: level.tutorial === true,
    rescuePrice: TUNING.rescuePrice,
    rescueEnabled: rescueAvailable(),
    rescueDeniedAt,
  });

  // M3: a leitura econômica da run vive no painel sobre o tabuleiro; o botão
  // único de fim de run continua sendo o do HUD, intocado.
  if (game.state.status === 'won' && lastVictoryBanking !== null) {
    drawVictoryPanel(ctx, layout, {
      delivered: deliveredCount(),
      trainTotal: level.trains.length,
      coins: lastVictoryBanking.coins,
      coinsTotal: level.coins?.length ?? 0,
      bonus: lastVictoryBanking.bonus,
      wallet: lastVictoryBanking.walletAfter,
      sealed: saveState.seals.includes(level.id),
      sealNew: lastVictoryBanking.sealNew,
      now,
      startedAt: victoryAt,
    });
  }
}

/** Loop único: fecha o passo, drena a fila e desenha — sempre, sem setInterval. */
function frame(timestamp: number): void {
  if (
    lockedCardFlash !== null &&
    timestamp - lockedCardFlash.startedAt >= CELL_FLASH_MS
  ) {
    lockedCardFlash = null;
  }

  if (
    rescueDeniedAt !== null &&
    timestamp - rescueDeniedAt >= CELL_FLASH_MS
  ) {
    rescueDeniedAt = null;
  }

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
  phaseListLayout = computePhaseListLayout(
    cssWidth,
    cssHeight,
    PHASES.length,
  );
  draw(performance.now());
}

attachPointerInput(canvas, {
  getLayout: () => layout,
  getScreenMode: () => screenMode,
  getPhaseListLayout: () => phaseListLayout,
  onPhaseCardTap,
  onListBack: returnToList,
  onAction,
  onReset,
  onFinishedAction,
  isFinished,
  isRescuePrompt: rescuePromptVisible,
  onRescue,
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
      /** Início da última coleta de moeda na run (QA E13); o pulse visível é o do tabuleiro. */
      readonly coinTickAt: number | null;
      /** Início/fim do passo visual em andamento (QA de duração). */
      readonly stepStartedAt: number | null;
      readonly stepEndsAt: number | null;
      /** Sentido ativo do seletor CW/CCW (M1/D22–D26), somente leitura. */
      readonly rotationDirection: RotationDirection;
      /** Modo de tela (M2): home da lista ou partida. */
      readonly screenMode: ScreenMode;
      /** Snapshot somente-leitura do save carregado (M2/M3). */
      readonly save: SaveState;
      /** Saldo da carteira do save, já pós-banco da última vitória (M3). */
      readonly wallet: number;
      /** Ids de fase com selo de perfeição (M3; leitura do save). */
      readonly seals: readonly string[];
      /** A run atual usou consumível? M4 liga no resgate; M5 no time-travel. */
      readonly consumableUsed: boolean;
      /** Resgates comprados nesta run (M4/D28), zerado a cada run. */
      readonly rescuesUsed: number;
      /** O resgate está comprável agora (deadEnd + não-tutorial + restante + carteira). */
      readonly rescueAvailable: boolean;
      /** Preço do resgate (tuning/D28). */
      readonly rescuePrice: number;
      /** Trem do último `trainDerailed` da run; alvo do resgate. */
      readonly lastDerailedId: TrainId | null;
      /** A fase atual é de ensino (D23)? */
      readonly tutorialPhase: boolean;
      /** Banco da última vitória (M3); `null` após reset/troca de fase. */
      readonly lastVictoryBanking: VictorySummary | null;
      /** Menor índice de fase desbloqueado (a recomendada). */
      readonly unlockedIndex: number;
      /** Índice do card que pulsa na lista (D6). */
      readonly recommendedIndex: number;
      /** Rect dos cards da lista, na ordem de `PHASES` (hit-test/QA). */
      readonly phaseListRects: readonly Rect[];
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
  get screenMode() {
    return screenMode;
  },
  get save() {
    return saveState;
  },
  get wallet() {
    return saveState.wallet;
  },
  get seals() {
    return saveState.seals;
  },
  get consumableUsed() {
    return consumableUsed;
  },
  get rescuesUsed() {
    return rescuesUsed;
  },
  get rescueAvailable() {
    return rescueAvailable();
  },
  get rescuePrice() {
    return TUNING.rescuePrice;
  },
  get lastDerailedId() {
    return lastDerailedId;
  },
  get tutorialPhase() {
    return level.tutorial === true;
  },
  get lastVictoryBanking() {
    return lastVictoryBanking;
  },
  get unlockedIndex() {
    return saveState.unlockedIndex;
  },
  get recommendedIndex() {
    return recommendedIndex();
  },
  get phaseListRects() {
    return phaseListLayout.cards;
  },
};

resize();
requestAnimationFrame(frame);
