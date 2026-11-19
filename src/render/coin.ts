/**
 * Moeda: overlay sobre trilho (contador burro do P2, D16).
 *
 * A moeda é um anel com miolo transparente — o trilho embaixo continua legível
 * (a moeda é opcional; a peça é obrigatória). O ouro é fixo no desenho, fora do
 * tuning de feel: `coinRatio` controla o diâmetro no tabuleiro; o pulse de
 * coleta é E13 (`coinPulseMs`).
 */

import { TUNING } from '../config/tuning';

const PALETTE = TUNING.palette;

/** Ouro da moeda; distinto do vermelho/azul dos pares, do teal da água e do trilho. */
export const COIN_COLOR = '#c8952f';
/** Brilho do aro — pequeno arco claro, sem virar gradiente. */
export const COIN_HIGHLIGHT = '#f2d88f';

/**
 * Anel de moeda no tabuleiro, centrado em (cx, cy), diâmetro `diameter`.
 *
 * O miolo é vazado (não pinta o trilho); o aro escuro por baixo separa o ouro
 * do trilho/água. Tamanho 0,22 célula: legível a 44 px sem esconder a peça.
 */
export function drawCoinRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  diameter: number,
): void {
  const radius = Math.max(3, diameter / 2);
  const thickness = Math.max(1.5, radius * 0.34);
  const ringRadius = Math.max(1, radius - thickness / 2);

  ctx.save();
  ctx.lineCap = 'round';

  // Aro escuro de separação.
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = thickness + 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Ouro.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COIN_COLOR;
  ctx.lineWidth = thickness;
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  // Brilho: arco fino no quadrante superior esquerdo.
  ctx.strokeStyle = COIN_HIGHLIGHT;
  ctx.lineWidth = Math.max(1, thickness * 0.36);
  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, -Math.PI * 0.78, -Math.PI * 0.3);
  ctx.stroke();
  ctx.restore();
}

/**
 * Glifo de moeda do HUD, preenchido para sobreviver ao tamanho pequeno do
 * cabeçalho (não precisa preservar o trilho embaixo).
 */
export function drawCoinGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const r = Math.max(3, radius);

  ctx.save();
  ctx.fillStyle = COIN_COLOR;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = COIN_HIGHLIGHT;
  ctx.beginPath();
  ctx.arc(cx - r * 0.28, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
