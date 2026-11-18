/**
 * Locomotiva: corpo arredondado + símbolo da forma (GDD §5).
 *
 * A cor do par vem do dado (`train.color`); a forma é o segundo canal de
 * acessibilidade. O corpo aponta a direção de deslocamento (`incoming` para
 * trem em campo, `direction` para trem ainda fora da grade), mas o símbolo é
 * desenhado de pé — orientação não pode custar legibilidade da forma.
 */

import type { CellPos, Direction, Train } from '../core/types';
import { TUNING } from '../config/tuning';
import { cellCenter, type SceneLayout } from './layout';
import { drawShapeSymbol } from './symbol';

const PALETTE = TUNING.palette;

/** Ângulo do eixo local +x para cada direção de deslocamento. */
const DIRECTION_ANGLE: Readonly<Record<Direction, number>> = {
  east: 0,
  south: Math.PI / 2,
  west: Math.PI,
  north: -Math.PI / 2,
};

/** Desenha o trem se ele está em campo; entregue/descarrilado não aparece. */
export function drawTrain(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  train: Train,
): void {
  const status = train.status;
  let cell: CellPos;
  let direction: Direction;

  if (status.kind === 'waiting') {
    cell = status.cell;
    direction = status.direction;
  } else if (status.kind === 'running') {
    cell = status.cell;
    direction = status.incoming;
  } else {
    return;
  }

  const center = cellCenter(layout, cell);
  const cellSize = layout.cell;
  const length = cellSize * TUNING.trainSizeRatio;
  const width = length * 0.78;
  const radius = width * 0.34;
  const nose = length * 0.1;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate(DIRECTION_ANGLE[direction]);
  ctx.fillStyle = train.color;

  // Corpo.
  ctx.beginPath();
  ctx.roundRect(-length / 2, -width / 2, length, width, radius);
  ctx.fill();

  // Bico: ponta à frente do corpo, mesma cor — silhueta indica o sentido.
  ctx.beginPath();
  ctx.moveTo(length / 2 - radius * 0.35, -width * 0.34);
  ctx.lineTo(length / 2 + nose, 0);
  ctx.lineTo(length / 2 - radius * 0.35, width * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  drawShapeSymbol(
    ctx,
    train.shape,
    center.x,
    center.y,
    cellSize * TUNING.symbolSizeRatio,
    PALETTE.background,
  );
}
