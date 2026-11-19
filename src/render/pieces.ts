/**
 * Peças móveis desenhadas por código — sem nenhum asset.
 *
 * A orientação canônica é a do contrato (`core/types.ts`): reta rot 0 = N–S;
 * curva rot 0 = N–E; Y rot 0 = talo N, braços L/O e lado S fechado. `rot` gira
 * o conjunto 90° CW. O desenho aplica a mesma rotação de contexto, então
 * render e regra não podem divergir.
 *
 * `angleRad` opcional é o gancho do E3: durante o giro animado a peça é
 * desenhada num ângulo contínuo (fora dos múltiplos de 90°) sem que a regra
 * saiba da animação.
 *
 * Y: três stubs (talo + duas pontas) e uma agulha clara alinhada ao canal
 * ativo. O lado fechado não tem trilho. D9: `next` não é desenhado — a agulha
 * mostra só o estado atual, nunca a próxima ação ABAB.
 */

import type { Piece, YPiece } from '../core/types';
import { TUNING } from '../config/tuning';

/** Espessura mínima do trilho em px CSS (legibilidade em DPR 1). */
const MIN_TRACK_WIDTH = 2;
/** Contorno mínimo da agulha em px CSS. */
const MIN_NEEDLE_OUTLINE = 1.5;

/**
 * Constrói o traçado canônico de uma peça no contexto atual, sem espessura nem
 * cor. O chamador decide o stroke. A previsão pontilhada reconstrói a mesma
 * geometria canônica (reta entre bordas opostas; arco no canto; Y com três
 * stubs) em um caminho contínuo, então a rota nunca «descola» do trilho.
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
  } else if (piece.kind === 'curve') {
    // Canônico: norte–leste. Centro no canto NE; arco pela borda interna do
    // canto, tangente aos lados norte e leste.
    ctx.arc(cell, 0, half, Math.PI / 2, Math.PI, false);
  } else {
    // Y canônico: talo N + braços L/O até o centro; o lado S fechado fica sem
    // traço. O encontro no centro é coberto pelo pino desenhado em drawPiece.
    ctx.moveTo(half, 0);
    ctx.lineTo(half, half);
    ctx.moveTo(cell, half);
    ctx.lineTo(half, half);
    ctx.moveTo(0, half);
    ctx.lineTo(half, half);
  }

  ctx.restore();
}

/**
 * Desenha uma peça com o canto superior esquerdo da célula em (x, y).
 *
 * Reta: traço dos dois lados opostos (N–S canônico). Curva: arco de um quarto
 * de volta que encosta no canto entre os dois lados conectados (N–E canônico).
 * Y: três stubs + agulha clara no braço ativo; o lado fechado fica vazio.
 * `angleRad` permite o giro animado do E3. `needleAngleRad` é o ângulo LOCAL
 * da agulha (0 = braço 0, π = braço 1): o E8 o usa para varrer a agulha na
 * troca de ponta sem girar os três stubs.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  color: string,
  angleRad?: number,
  needleAngleRad?: number,
): void {
  const lineWidth = Math.max(MIN_TRACK_WIDTH, cell * TUNING.trackWidthRatio);
  const angle = angleRad ?? (piece.rot * Math.PI) / 2;

  ctx.save();
  tracePiecePath(ctx, piece, x, y, cell, angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  if (piece.kind === 'y') {
    drawYNeedle(ctx, piece, x, y, cell, color, lineWidth, angle, needleAngleRad);
  }
}

/**
 * Agulha do Y alinhada ao braço ativo.
 *
 * Uma lâmina clara (cor de fundo) com contorno do trilho: a cor do trilho
 * sumiria sobre os próprios stubs. Os três stubs continuam aceitando trem — a
 * agulha só comunica qual ponta o talo alcança agora. O pino escuro no centro
 * fecha o encontro dos stubs e dá a leitura de eixo do desvio.
 *
 * `needleAngleRad` é local à peça: 0 aponta ao braço 0, π ao braço 1. A
 * varredura animada do E8 passa pelo lado FECHADO (+π/2): a lâmina cruza o
 * vazio em vez de varrer por cima do talo, então nunca parece que o tronco
 * virou a rota ativa. Sem override, a agulha fica no braço do snapshot.
 */
function drawYNeedle(
  ctx: CanvasRenderingContext2D,
  piece: YPiece,
  x: number,
  y: number,
  cell: number,
  color: string,
  trackWidth: number,
  angle: number,
  needleAngleRad?: number,
): void {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const length = cell * TUNING.yNeedleRatio;
  const base = Math.max(MIN_TRACK_WIDTH, trackWidth * 0.52);
  const localAngle = needleAngleRad ?? (piece.arm === 0 ? 0 : Math.PI);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);
  ctx.rotate(localAngle);

  // Lâmina em forma de cunha: base no pino, ponta no canal ativo (+x local).
  ctx.beginPath();
  ctx.moveTo(0, -base);
  ctx.lineTo(length, 0);
  ctx.lineTo(0, base);
  ctx.closePath();
  ctx.fillStyle = TUNING.palette.background;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(MIN_NEEDLE_OUTLINE, cell * 0.02);
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Pino central: cobre a junção dos três stubs e a base da agulha.
  ctx.beginPath();
  ctx.arc(0, 0, trackWidth * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}
