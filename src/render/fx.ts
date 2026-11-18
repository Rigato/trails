/**
 * Feel do passo: matemática de animação e feedbacks visuais (E3).
 *
 * Este módulo concentra o que é «sensação» e não é regra: curvas de tempo,
 * flashes de toque sem ação (D3), pulse de entrega (D5) e saída do trem
 * descarrilado (D1). Tudo é função de `now` — nenhum estado escondido, nenhum
 * timer próprio — para o loop único de `main.ts` desenhar qualquer quadro a
 * partir do mesmo relógio.
 *
 * A duração de cada efeito vem de `config/tuning.ts`; aqui só vivem as curvas
 * e o traço. O flash é o único efeito sem parâmetro de duração na tabela §6:
 * usa uma constante curta (o suficiente para confirmar o toque sem ensinar por
 * ruído).
 */

import type { CellPos, Color, Direction, Train } from '../core/types';
import { directionOffset } from '../core/types';
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
