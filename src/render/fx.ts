/**
 * Feel do passo: matemática de animação e feedbacks visuais (E3/E8).
 *
 * Este módulo concentra o que é «sensação» e não é regra: curvas de tempo,
 * flashes de toque sem ação (D3), pulse de entrega (D5), saída do trem
 * descarrilado (D1), halo do primeiro giro (D6), varredura da agulha do Y e
 * pulse da marca de vida perdida (E8). Tudo é função de `now` — nenhum estado
 * escondido, nenhum timer próprio — para o loop único de `main.ts` desenhar
 * qualquer quadro a partir do mesmo relógio.
 *
 * A duração de cada efeito vem de `config/tuning.ts` (`yToggleMs`,
 * `lifeLostPulseMs`); aqui só vivem as curvas e o traço. O flash usa uma
 * constante curta (o suficiente para confirmar o toque sem ensinar por ruído);
 * o halo do D6 respira no período `firstHintPulseMs`.
 */

import type {
  CellPos,
  Color,
  Direction,
  GameEvent,
  GameState,
  Prediction,
  Train,
  TrainId,
} from '../core/types';
import { cellAt, directionOffset } from '../core/types';
import type { StepEasing } from '../config/tuning';
import { TUNING } from '../config/tuning';
import { cellCenter, cellRect, type SceneLayout } from './layout';
import { directionAngle, drawTrainAt } from './train';

/** Duração do flash de toque nulo/bloqueado (D3). */
export const CELL_FLASH_MS = 220;

/** Flash de uma célula: `startedAt` reinicia se a mesma célula for tocada de novo. */
export interface CellFlash {
  readonly cell: CellPos;
  readonly startedAt: number;
}

/**
 * Alvo do hint do primeiro frame (D6), derivado do estado — sem coordenada de
 * fase escrita no render.
 *
 * A peça que pede o primeiro giro é exatamente onde a previsão pré-primeiro-
 * passo morre: um `stop` `noExit` cuja célula contém uma peça. Um toque nulo
 * não muda o estado, então o halo continua; a primeira ação válida incrementa
 * `step` e o alvo desaparece sozinho. `null` quando não há esse ponto (layout
 * com a rota já aberta, jogo começado, etc.).
 *
 * Futuras fases com mais de um trem usam o primeiro trem `waiting` — o P0 tem
 * um só; a derivação continua correta quando o layout mudar.
 */
export function firstHintTarget(
  state: GameState,
  predictions: readonly Prediction[],
): CellPos | null {
  if (state.step !== 0 || state.status !== 'ready') {
    return null;
  }

  for (const train of state.trains) {
    if (train.status.kind !== 'waiting') {
      continue;
    }

    const prediction = predictions.find(
      (candidate) => candidate.trainId === train.id,
    );

    if (prediction === undefined || prediction.stop.kind !== 'noExit') {
      continue;
    }

    const content = cellAt(state.board, prediction.stop.cell);

    if (content?.kind === 'piece') {
      return prediction.stop.cell;
    }
  }

  return null;
}

/**
 * Intensidade (0–1) do halo que «respira» na peça do primeiro giro (D6).
 *
 * Uma senoide completa a cada `period`, sem pisca: o halo acende e apaga
 * devagar. `period <= 0` desliga o hint por completo — é o interruptor do
 * designer, sem parâmetro novo no tuning.
 */
export function hintPulseIntensity(
  now: number,
  period = TUNING.firstHintPulseMs,
): number {
  if (!(period > 0) || !Number.isFinite(period) || !Number.isFinite(now)) {
    return 0;
  }

  return 0.5 - 0.5 * Math.cos((now / period) * Math.PI * 2);
}

/** Halo do hint do primeiro frame: anel fino + disco levemente tingido (D6). */
export function drawFirstHint(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  cell: CellPos,
  now: number,
): void {
  const intensity = hintPulseIntensity(now);

  if (TUNING.firstHintPulseMs <= 0 || layout.cell <= 0) {
    return;
  }

  const center = cellCenter(layout, cell);
  const radius = layout.cell * (0.33 + 0.035 * intensity);

  ctx.save();

  // Disco de baixíssima opacidade: chama a célula sem apagar o trilho.
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = TUNING.palette.track;
  ctx.globalAlpha = 0.02 + 0.04 * intensity;
  ctx.fill();

  // Anel que respira: fino, escuro o bastante para o olho achar sem piscar.
  ctx.globalAlpha = 0.14 + 0.14 * intensity;
  ctx.strokeStyle = TUNING.palette.track;
  ctx.lineWidth = Math.max(1.5, layout.cell * 0.022);
  ctx.stroke();

  ctx.restore();
}

/** Pulse de entrega na estação (D5). */
export interface DeliveryPulse {
  readonly cell: CellPos;
  readonly color: Color;
  readonly startedAt: number;
}

/** Fantasma do trem que sai do tabuleiro após descarrilar (D1). */
export interface DerailExit {
  readonly train: Train;
  readonly cell: CellPos;
  readonly direction: Direction;
  readonly startedAt: number;
}

/** Trem que descarrilou num passo, antes de virar fantasma com `startedAt`. */
export interface DerailVisual {
  readonly train: Train;
  readonly at: CellPos;
  readonly direction: Direction;
}

/**
 * Um fantasma por `trainDerailed` — inclusive DOIS na colisão (o core emite um
 * evento por participante). A ordem é a dos eventos; a cena desenha todos.
 */
export function derailVisuals(
  events: readonly GameEvent[],
  trains: readonly Train[],
): DerailVisual[] {
  const byId = new Map<TrainId, Train>(trains.map((train) => [train.id, train]));
  const visuals: DerailVisual[] = [];

  for (const event of events) {
    if (event.kind !== 'trainDerailed') {
      continue;
    }

    const train = byId.get(event.trainId);

    if (train !== undefined) {
      visuals.push({ train, at: event.at, direction: event.direction });
    }
  }

  return visuals;
}

/** Marca de vida que acabou de esvaziar no HUD (E8). */
export interface LifeLostPulse {
  /**
   * Índice da marca (0 = primeira). É o `remaining` do evento `lifeLost`: as
   * marcas `0..remaining-1` continuam cheias; a que esvaziou é a `remaining`.
   */
  readonly markIndex: number;
  readonly startedAt: number;
}

/**
 * Índices das marcas que esvaziaram num passo, na ordem dos eventos.
 *
 * Duas perdas no mesmo passo geram dois índices (e duas marcas pulsando): as
 * colisões custam uma vida por evento; dois descarrilamentos independentes
 * custam uma cada (D7).
 */
export function lifeLostMarkIndices(events: readonly GameEvent[]): number[] {
  const indices: number[] = [];

  for (const event of events) {
    if (event.kind === 'lifeLost') {
      indices.push(event.remaining);
    }
  }

  return indices;
}

/** Limita um número ao intervalo [0, 1]. */
export function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }

  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

function easeOutCubic(t: number): number {
  const inverse = 1 - t;
  return 1 - inverse * inverse * inverse;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2;
}

/**
 * Curva do deslocamento de um passo, escolhida em `tuning.stepEasing`.
 *
 * A duração da animação É o ritmo do jogo (§3.3): quem chama passa o mesmo
 * `stepDurationMs` para todos os trens do passo.
 */
export function easeStep(easing: StepEasing, t: number): number {
  const progress = clamp01(t);

  switch (easing) {
    case 'linear':
      return progress;
    case 'easeOutQuad':
      return easeOutQuad(progress);
    case 'easeInOutQuad':
      return easeInOutQuad(progress);
    case 'easeOutCubic':
      return easeOutCubic(progress);
  }
}

/** Fração do giro em que o sobregiro atinge o pico. */
const ROTATION_PEAK_AT = 0.72;

/**
 * Progresso do giro de uma peça, de 0 a 1, com sobregiro opcional.
 *
 * O valor ultrapassa 1 (por `rotationOvershoot`) perto de 72% do giro e volta
 * a 1 no fim — a leitura de «a peça encaixou» sem som. `overshoot <= 1` vira
 * uma desaceleração simples.
 */
export function rotationProgress(t: number, overshoot: number): number {
  const progress = clamp01(t);
  const peak = Number.isFinite(overshoot) && overshoot > 1 ? overshoot : 1;

  if (peak === 1) {
    return easeOutCubic(progress);
  }

  if (progress <= ROTATION_PEAK_AT) {
    return easeOutCubic(progress / ROTATION_PEAK_AT) * peak;
  }

  const settle = (progress - ROTATION_PEAK_AT) / (1 - ROTATION_PEAK_AT);
  return peak + (1 - peak) * easeOutQuad(settle);
}

/**
 * Ângulo LOCAL da agulha do Y durante um toggle (E8), em [0, π].
 *
 * 0 = braço 0 (leste canônico), π = braço 1 (oeste canônico). A varredura
 * escolhida passa pelo lado FECHADO (local +π/2): a lâmina cruza o vazio em
 * vez de varrer por cima do talo, então nunca parece que o tronco virou a rota
 * ativa. `easeOutQuad` — o toggle é curto e seco, sem o sobregiro do giro da
 * peça. O passo de 180 ms continua; a agulha termina em `yToggleMs` (120).
 */
export function yNeedleSweepAngle(
  fromArm: 0 | 1,
  toArm: 0 | 1,
  progress: number,
): number {
  const start = fromArm === 0 ? 0 : Math.PI;

  if (fromArm === toArm) {
    return start;
  }

  const eased = easeOutQuad(clamp01(progress));

  return start === 0 ? Math.PI * eased : Math.PI * (1 - eased);
}

/** Intensidade do flash (1 no toque, 0 no fim); curva quadrática discreta. */
export function flashIntensity(
  flash: CellFlash,
  now: number,
  duration = CELL_FLASH_MS,
): number {
  const age = now - flash.startedAt;

  if (!(age >= 0) || age >= duration) {
    return 0;
  }

  const remaining = 1 - age / duration;
  return remaining * remaining;
}

/**
 * Escala da estação durante o pulse de entrega.
 *
 * Sobe de 1 até `deliverPulseScale` no meio do efeito e volta a 1 — o corpo da
 * estação participa do momento de sucesso (D5), não só um anel em volta dele.
 */
export function stationPulseScale(progress: number, peak = TUNING.deliverPulseScale): number {
  const t = clamp01(progress);
  const target = Number.isFinite(peak) ? peak : 1;
  return 1 + (target - 1) * Math.sin(Math.PI * t);
}

/** Progresso do pulse de entrega em [0, 1]. */
export function pulseProgress(pulse: DeliveryPulse, now: number): number {
  const duration = Math.max(1, TUNING.deliverPulseMs);
  return clamp01((now - pulse.startedAt) / duration);
}

/** Progresso do pulse da marca de vida perdida em [0, 1]. */
export function lifePulseProgress(pulse: LifeLostPulse, now: number): number {
  const duration = Math.max(1, TUNING.lifeLostPulseMs);
  return clamp01((now - pulse.startedAt) / duration);
}

/**
 * Escala da marca de vida durante o pulse de perda.
 *
 * Sobe de 1 até 1,55 no meio e volta a 1 — a marca vazia «pula» uma vez para
 * o olho achar a vida que acabou de sair, sem tocar no texto do HUD.
 */
export function lifePulseScale(progress: number): number {
  return 1 + 0.55 * Math.sin(Math.PI * clamp01(progress));
}

/**
 * Anel do pulse de vida, em múltiplos do tamanho da marca.
 *
 * O anel expande de 0,55× até 1,6× e some; fica no cabeçalho, na cor do
 * trilho, sem competir com as marcas vizinhas.
 */
export function lifePulseRing(progress: number): {
  readonly radius: number;
  readonly alpha: number;
} {
  const t = clamp01(progress);

  return {
    radius: 0.55 + 1.05 * easeOutCubic(t),
    alpha: 0.55 * (1 - easeOutQuad(t)),
  };
}

/** Progresso da saída do trem descarrilado em [0, 1]. */
export function derailProgress(exit: DerailExit, now: number): number {
  const duration = Math.max(1, TUNING.derailExitMs);
  return clamp01((now - exit.startedAt) / duration);
}

/** Flash discreto na célula: confirma o toque sem virar ruído (D3). */
export function drawCellFlash(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  flash: CellFlash,
  now: number,
): void {
  const intensity = flashIntensity(flash, now);

  if (intensity <= 0 || layout.cell <= 0) {
    return;
  }

  const rect = cellRect(layout, flash.cell);
  const inset = layout.cell * 0.09;
  const radius = Math.max(2, layout.cell * 0.12);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    rect.x + inset,
    rect.y + inset,
    rect.width - inset * 2,
    rect.height - inset * 2,
    radius,
  );

  ctx.globalAlpha = 0.16 * intensity;
  ctx.fillStyle = TUNING.palette.track;
  ctx.fill();

  ctx.globalAlpha = 0.22 * intensity;
  ctx.strokeStyle = TUNING.palette.track;
  ctx.lineWidth = Math.max(1, layout.cell * 0.02);
  ctx.stroke();
  ctx.restore();
}

/**
 * Halo do pulse de entrega.
 *
 * A estação em si é escalada em `board.ts` pelo mesmo pulse; este desenho
 * adiciona o anel que «espalha» o momento pelo tabuleiro e continua legível
 * quando `deliverPulseScale` é 1.
 */
export function drawDeliveryPulse(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  pulse: DeliveryPulse,
  now: number,
): void {
  const t = pulseProgress(pulse, now);

  if (t >= 1 || layout.cell <= 0) {
    return;
  }

  const center = cellCenter(layout, pulse.cell);
  const eased = easeOutCubic(t);
  const alpha = 0.42 * (1 - easeOutQuad(t));

  ctx.save();
  ctx.strokeStyle = pulse.color;

  // Anel principal: expande do interior da célula para além do corpo da casa.
  const radius = layout.cell * (0.34 + 0.4 * eased);
  ctx.globalAlpha = alpha;
  ctx.lineWidth = Math.max(2, layout.cell * 0.055);
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Segundo anel, defasado: dá corpo ao pulse sem alongar a duração.
  if (t > 0.22) {
    const second = (t - 0.22) / 0.78;
    ctx.globalAlpha = alpha * 0.55;
    ctx.lineWidth = Math.max(1.5, layout.cell * 0.032);
    ctx.beginPath();
    ctx.arc(
      center.x,
      center.y,
      layout.cell * (0.3 + 0.48 * easeOutCubic(second)),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }

  ctx.restore();
}

/** Trem descarrilado saindo: desliza na direção da falha e encolhe até sumir. */
export function drawDerailExit(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  exit: DerailExit,
  now: number,
): void {
  const t = derailProgress(exit, now);

  if (t >= 1 || layout.cell <= 0) {
    return;
  }

  const center = cellCenter(layout, exit.cell);
  const offset = directionOffset(exit.direction);
  const travel = layout.cell * 0.8 * easeOutQuad(t);
  const scale = 1 - 0.5 * t;
  const alpha = 1 - t * t;

  drawTrainAt(
    ctx,
    layout.cell,
    exit.train,
    center.x + offset.col * travel,
    center.y + offset.row * travel,
    directionAngle(exit.direction),
    scale,
    alpha,
  );
}
