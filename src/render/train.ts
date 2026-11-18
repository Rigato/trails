/**
 * Locomotiva: corpo arredondado + símbolo da forma (GDD §5).
 *
 * A cor do par vem do dado (`train.color`); a forma é o segundo canal de
 * acessibilidade. O corpo aponta a direção de deslocamento, mas o símbolo é
 * desenhado de pé — orientação não pode custar legibilidade da forma.
 *
 * O desenho é exposto por posição/ângulo/escala (não por célula) porque o E3
 * interpola o trem entre duas células e o E3 também desenha o fantasma da
 * saída do descarrilamento.
 */

import type { Direction, Train } from '../core/types';
import { TUNING } from '../config/tuning';
import { drawShapeSymbol } from './symbol';

const PALETTE = TUNING.palette;

/** Ângulo do eixo local +x para cada direção de deslocamento. */
const DIRECTION_ANGLE: Readonly<Record<Direction, number>> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: -Math.PI / 2,
};

/** Ângulo (radianos) do corpo para uma direção de deslocamento. */
export function directionAngle(direction: Direction): number {
  return DIRECTION_ANGLE[direction];
}

/**
 * Desenha o trem centrado em (x, y) px CSS, girado por `angle`.
 *
 * `scale` e `alpha` existem para a interpolação e para o fantasma do
 * descarrilamento; o símbolo acompanha a mesma transformação para o trem não
 * «desmontar» ao encolher.
 */
export function drawTrainAt(
  ctx: CanvasRenderingContext2D,
  cellSize: number,
  train: Train,
  x: number,
  y: number,
  angle: number,
  scale = 1,
  alpha = 1,
): void {
  if (cellSize <= 0 || alpha <= 0 || scale <= 0) {
    return;
  }

  const length = cellSize * TUNING.trainSizeRatio;
  const width = length * 0.78;
  const radius = width * 0.34;
  const nose = length * 0.1;

  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  // Corpo e bico giram com a direção de viagem.
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = train.color;

  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length, width, radius);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(length / 2 - radius * 0.35, -width * 0.34);
  ctx.lineTo(length / 2 + nose, 0);
  ctx.lineTo(length / 2 - radius * 0.35, width * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Símbolo sempre de pé (acessibilidade, GDD §5).
  drawShapeSymbol(
    ctx,
    train.shape,
    0,
    0,
    cellSize * TUNING.symbolSizeRatio,
    PALETTE.background,
  );

  ctx.restore();
}
