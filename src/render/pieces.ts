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
 * Y (D12-v2, revisão pós-playtest): semântica de CONEXÃO, como um desvio
 * ferroviário físico. O talo + a ponta ativa são UM trilho contínuo em negrito
 * (×1,15); a ponta inativa continua trilho, só esmaecido (×0,7 e alpha 60%) —
 * ela aceita entrada e não pode parecer quebrada. Nada aponta direção: trilho
 * é bidirecional, então uma seta sempre contradiz metade dos fluxos. O lado
 * fechado fica vazio; o pino fecha a junção. D9: `next` não é desenhado — a
 * indicação mostra só o estado atual, nunca a próxima ação ABAB.
 *
 * O Y é desenhado no MESMO `drawPiece`; no giro ele gira com a peça (`angle`).
 * No toque-toggle, os braços trocam de peso em CROSSFADE (`yArmMix` em
 * `fx.ts`), sem varredura espacial — a varredura pertencia à metáfora
 * direcional, que morreu com a seta.
 */

import type { Piece, YPiece } from '../core/types';
import { TUNING } from '../config/tuning';
import { yArmMix } from './fx';

/** Espessura mínima do trilho em px CSS (legibilidade em DPR 1). */
const MIN_TRACK_WIDTH = 2;

/** Braço conectado: um pouco mais grosso que o trilho comum (D12-v2). */
const Y_ACTIVE_WIDTH = 1.15;
/** Braço secundário: mais fino, mas comprimento integral — ainda é trilho. */
const Y_INACTIVE_WIDTH = 0.7;
/** Opacidade do braço secundário; legível sobre o fundo sem virar «quebrado». */
const Y_INACTIVE_ALPHA = 0.6;

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
 * Y: talo + braço ativo em um trilho contínuo negrito, o outro braço esmaecido
 * e o lado fechado vazio (D12-v2). `angleRad` permite o giro animado do E3.
 * `toggleAngleRad` é o ângulo de progresso do toggle (0..π codifica a mistura
 * dos braços, via `yArmMix`); no toggle, os braços fazem crossfade sem girar
 * os stubs.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  color: string,
  angleRad?: number,
  toggleAngleRad?: number,
): void {
  const lineWidth = Math.max(MIN_TRACK_WIDTH, cell * TUNING.trackWidthRatio);
  const angle = angleRad ?? (piece.rot * Math.PI) / 2;

  if (piece.kind === 'y') {
    drawYConnection(ctx, piece, x, y, cell, color, lineWidth, angle, toggleAngleRad);
    return;
  }

  ctx.save();
  tracePiecePath(ctx, piece, x, y, cell, angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/**
 * Y como desvio físico (D12-v2).
 *
 * **Leitura:** o talo e o braço ativo formam um L contínuo em negrito — «a
 * linha ligada». O outro braço mantém o comprimento inteiro e a cor do trilho,
 * só mais fino e translúcido: lê como trilho secundário, não como quebrado
 * (ele aceita entrada). O lado fechado não é desenhado. Não há seta, cunha ou
 * triângulo: nada aponta contra o fluxo de quem entra por uma ponta e sai pelo
 * talo (trilho é bidirecional).
 *
 * **Crossfade:** `mix` 0..1 vem de `yArmMix`; 0 = braço leste ativo, 1 = oeste.
 * Cada braço interpola largura e alpha entre esmaecido e negrito, então o
 * toggle troca o destaque sem varredura espacial. O talo é sempre negrito (é o
 * tronco comum aos dois settings). O pino fecha o cotovelo e a junção.
 */
function drawYConnection(
  ctx: CanvasRenderingContext2D,
  piece: YPiece,
  x: number,
  y: number,
  cell: number,
  color: string,
  trackWidth: number,
  angle: number,
  toggleAngleRad?: number,
): void {
  const half = cell / 2;
  const mix = yArmMix(piece.arm, toggleAngleRad);
  const weights = [1 - mix, mix];
  const activeWidth = trackWidth * Y_ACTIVE_WIDTH;

  ctx.save();
  ctx.translate(x + half, y + half);
  ctx.rotate(angle);
  ctx.lineCap = 'butt';
  ctx.strokeStyle = color;

  // Braços: cada um interpola entre esmaecido e negrito no crossfade.
  for (let arm = 0; arm < 2; arm += 1) {
    const weight = weights[arm] ?? 0;
    const end = arm === 0 ? half : -half;

    ctx.globalAlpha = Y_INACTIVE_ALPHA + (1 - Y_INACTIVE_ALPHA) * weight;
    ctx.lineWidth =
      trackWidth * (Y_INACTIVE_WIDTH + (Y_ACTIVE_WIDTH - Y_INACTIVE_WIDTH) * weight);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(end, 0);
    ctx.stroke();
  }

  // Talo: sempre negrito; é o tronco comum aos dois settings.
  ctx.globalAlpha = 1;
  ctx.lineWidth = activeWidth;
  ctx.beginPath();
  ctx.moveTo(0, -half);
  ctx.lineTo(0, 0);
  ctx.stroke();

  // Pino: fecha o cotovelo do L e a junção dos três stubs.
  ctx.beginPath();
  ctx.arc(0, 0, activeWidth / 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}
