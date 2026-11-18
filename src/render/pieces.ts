/**
 * Peças móveis desenhadas por código — sem nenhum asset.
 *
 * A orientação canônica é a do contrato (`core/types.ts`): reta rot 0 = N–S;
 * curva rot 0 = N–E; `rot` é quarto de volta no sentido horário. O desenho
 * aplica a mesma rotação de contexto, então render e regra não podem divergir.
 *
 * `angleRad` opcional é o gancho do E3: durante o giro animado a peça é
 * desenhada num ângulo contínuo (fora dos múltiplos de 90°) sem que a regra
 * saiba da animação.
 */

import type { Piece } from '../core/types';
import { TUNING } from '../config/tuning';

/** Espessura mínima do trilho em px CSS (legibilidade em DPR 1). */
const MIN_TRACK_WIDTH = 2;

/**
 * Constrói o traçado canônico de uma peça no contexto atual, sem espessura nem
 * cor. O chamador decide o stroke. A previsão pontilhada reconstrói a mesma
 * geometria canônica (reta entre bordas opostas; arco no canto) em um caminho
 * contínuo, então a rota nunca «descola» do trilho.
 */
export function tracePiecePath(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  angleRad: number = (piece.rot * Math.PI) / 2,
): void {
  const half = cell / 2;

  ctx.save();
  ctx.translate(x + half, y + half);
  ctx.rotate(angleRad);
  ctx.translate(-half, -half);

  ctx.beginPath();

  if (piece.kind === 'straight') {
    // Canônico: norte–sul, atravessando a célula de ponta a ponta.
    ctx.moveTo(half, 0);
    ctx.lineTo(half, cell);
  } else {
    // Canônico: norte–leste. Centro no canto NE; arco pela borda interna do
    // canto, tangente aos lados norte e leste.
    ctx.arc(cell, 0, half, Math.PI / 2, Math.PI, false);
  }

  ctx.restore();
}

/**
 * Desenha uma peça com o canto superior esquerdo da célula em (x, y).
 *
 * Reta: traço dos dois lados opostos (N–S canônico). Curva: arco de um quarto
 * de volta que encosta no canto entre os dois lados conectados (N–E canônico).
 * `angleRad` permite o giro animado do E3.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  color: string,
  angleRad?: number,
): void {
  const lineWidth = Math.max(MIN_TRACK_WIDTH, cell * TUNING.trackWidthRatio);

  ctx.save();
  tracePiecePath(ctx, piece, x, y, cell, angleRad);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}
