/**
 * Moeda: overlay sobre trilho (D16).
 *
 * A moeda é um anel com miolo transparente — o trilho embaixo continua legível
 * (a moeda é opcional; a peça é obrigatória). O ouro é fixo no desenho, fora do
 * tuning de feel: `coinRatio` controla o diâmetro no tabuleiro; `coinPulseMs`
 * anima o pulse de coleta no tabuleiro e o tick do glifo da carteira (E13/M3).
 */

import { TUNING } from '../config/tuning';

const PALETTE = TUNING.palette;

/** Ouro da moeda; distinto do vermelho/azul dos pares, do teal da água e do trilho. */
export const COIN_COLOR = '#c8952f';
/** Brilho do aro — pequeno arco claro, sem virar gradiente. */
export const COIN_HIGHLIGHT = '#f2d88f';

/** Limita um progresso ao intervalo [0, 1]. */
function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return value > 0 ? 1 : 0;
  }

  return value < 0 ? 0 : value > 1 ? 1 : value;
}

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

/**
 * Pulse de coleta no tabuleiro (E13).
 *
 * A moeda já sumiu do snapshot; o anel dourado expande do raio dela e o brilho
 * central acende por um instante. `progress` 0..1 vem de `coinPulseMs` (300)
 * ancorado no INÍCIO do passo — a coleta é lida em ~0 tempo.
 */
export function drawCoinPulse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  cell: number,
  progress: number,
): void {
  const t = clamp01(progress);

  if (t >= 1 || cell <= 0) {
    return;
  }

  const base = Math.max(2, (cell * TUNING.coinRatio) / 2);
  const eased = 1 - (1 - t) ** 3;
  const radius = base + (cell * 0.34 - base) * eased;
  const fade = 1 - t;

  ctx.save();
  ctx.lineCap = 'round';

  // Brilho central curto: a moeda «acende» ao sumir.
  ctx.globalAlpha = 0.2 * fade * fade;
  ctx.fillStyle = COIN_HIGHLIGHT;
  ctx.beginPath();
  ctx.arc(cx, cy, base * 1.05, 0, Math.PI * 2);
  ctx.fill();

  // Anel dourado principal.
  ctx.globalAlpha = 0.85 * fade ** 1.3;
  ctx.strokeStyle = COIN_COLOR;
  ctx.lineWidth = Math.max(1.5, cell * 0.022);
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Aro de brilho interno, defasado — dá o «tick» dourado sem segundo efeito.
  if (t < 0.82) {
    ctx.globalAlpha = 0.38 * fade;
    ctx.strokeStyle = COIN_HIGHLIGHT;
    ctx.lineWidth = Math.max(1, cell * 0.012);
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.76, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Tick do glifo de ouro no HUD (E13; M3 usa no glifo da carteira).
 *
 * O glifo cresce 1 → 1,34 → 1 e um anel fino de ouro expande/some; o número
 * fica estável (só o valor novo). Mesma família do pulse de vida, sutil.
 */
export function drawCoinTick(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  progress: number,
): void {
  const t = clamp01(progress);

  if (t >= 1) {
    drawCoinGlyph(ctx, cx, cy, radius);
    return;
  }

  const scale = 1 + 0.34 * Math.sin(Math.PI * t);
  const eased = 1 - (1 - t) ** 3;

  ctx.save();
  ctx.globalAlpha = 0.5 * (1 - t);
  ctx.strokeStyle = COIN_COLOR;
  ctx.lineWidth = Math.max(1, radius * 0.18);
  ctx.beginPath();
  ctx.arc(cx, cy, radius * (1.15 + 0.7 * eased), 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);
  drawCoinGlyph(ctx, cx, cy, radius);
  ctx.restore();
}
