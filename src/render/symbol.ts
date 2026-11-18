/**
 * Símbolos de forma dos pares trem/estação (GDD §5).
 *
 * A cor identifica o par na regra; a forma é o segundo canal obrigatório para
 * daltonismo. Por isso o símbolo é sempre desenhado «de pé», mesmo quando o
 * corpo do trem gira para apontar a direção de viagem.
 */

import type { Shape } from '../core/types';

/**
 * Desenha uma forma preenchida centrada em (cx, cy) com caixa `size`×`size`.
 *
 * As quatro formas têm silhuetas distintas em tamanho pequeno (DPR 1).
 */
export function drawShapeSymbol(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  cx: number,
  cy: number,
  size: number,
  color: string,
): void {
  const half = size / 2;

  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();

  switch (shape) {
    case 'circle':
      ctx.arc(cx, cy, half, 0, Math.PI * 2);
      break;
    case 'square':
      ctx.rect(cx - half, cy - half, size, size);
      break;
    case 'triangle':
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy + half * 0.78);
      ctx.lineTo(cx - half, cy + half * 0.78);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(cx, cy - half);
      ctx.lineTo(cx + half, cy);
      ctx.lineTo(cx, cy + half);
      ctx.lineTo(cx - half, cy);
      ctx.closePath();
      break;
  }

  ctx.fill();
  ctx.restore();
}
