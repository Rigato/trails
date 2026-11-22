/**
 * Painel de vitória (M3/D27/D30): a leitura econômica da run.
 *
 * Desenhado quando o jogo termina em `won`, compacto e centrado sobre a área
 * do tabuleiro — uma placa leve na linguagem feia-e-funcional do resto do jogo,
 * nunca uma janela/modal pesada. O botão único de largura total continua sendo
 * o do HUD, intocado, logo abaixo.
 *
 * Linhas, de cima para baixo:
 * - bônus por trens entregues (D27): «+6 — 3/3 trens entregues», com `+0`
 *   quando a vitória é «chocha» (a vontade de ler o número é o estímulo);
 * - moedas da run («4/4 moedas»), omitida em fase sem moedas;
 * - estrela dourada do selo (D30) quando a fase está selada; pulsa uma vez
 *   (família D5) apenas quando o selo foi conquistado NESTA run — um selo de
 *   run anterior aparece estável, sem fingir conquista nova;
 * - «carteira N», saldo já pós-banco.
 *
 * Todo o estado vem do `main.ts`; este módulo só desenha. O relógio do loop
 * anima o pulso da estrela, como os demais feedbacks.
 */

import { TUNING } from '../config/tuning';
import { drawCoinGlyph } from './coin';
import { stationPulseScale } from './fx';
import type { SceneLayout } from './layout';
import { drawSealStar } from './seal';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Escala de pico do pulso da estrela (mesma curva do pulse de entrega, D5). */
const SEAL_PULSE_PEAK = 1.18;

/** Contexto do painel, já derivado da run e do save pelo `main.ts`. */
export interface VictoryPanelContext {
  /** Trens entregues na run. */
  readonly delivered: number;
  /** Trens da fase. */
  readonly trainTotal: number;
  /** Moedas coletadas na run. */
  readonly coins: number;
  /** Moedas da fase; `0` = fase sem moedas (linha omitida). */
  readonly coinsTotal: number;
  /** Bônus da tabela D27 para `delivered`. */
  readonly bonus: number;
  /** Carteira depois do banco desta vitória. */
  readonly wallet: number;
  /** A fase tem selo no save (desta run ou de uma anterior). */
  readonly sealed: boolean;
  /** O selo foi gravado nesta run? Só então a estrela pulsa. */
  readonly sealNew: boolean;
  /** Relógio do quadro (pulso da estrela). */
  readonly now: number;
  /** Início da conquista/banco; `null` = sem pulso de conquista. */
  readonly startedAt: number | null;
}

/** Desenha o painel de vitória por cima do tabuleiro. */
export function drawVictoryPanel(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  context: VictoryPanelContext,
): void {
  const { board } = layout;

  if (board.width <= 0 || board.height <= 0) {
    return;
  }

  // Tipografia acompanha a célula, com pisos e tetos para não virar letra
  // minúscula em telas pequenas nem cartaz em telas grandes.
  const lineFont = Math.max(12, Math.min(18, layout.cell * 0.24));
  const bonusFont = Math.max(18, Math.min(27, layout.cell * 0.34));
  const base = lineFont;
  const padX = Math.max(12, base * 1.1);
  const padY = Math.max(10, base * 0.95);
  const gap = base * 0.55;
  const lineHeight = lineFont * 1.4;
  const starRadius = base * 1.05;
  const hasCoins = context.coinsTotal > 0;
  const showSeal = context.sealed;

  let contentHeight = bonusFont * 1.2;

  if (hasCoins) {
    contentHeight += gap + lineHeight;
  }

  if (showSeal) {
    contentHeight += gap + starRadius * 2;
  }

  contentHeight += gap + lineHeight;

  const width = Math.min(board.width * 0.9, 340);
  const height = contentHeight + padY * 2;
  const x = board.x + (board.width - width) / 2;
  const y = board.y + (board.height - height) / 2;
  const cx = x + width / 2;
  const radius = Math.max(10, base * 0.9);

  ctx.save();

  // Placa: fundo do jogo quase opaco (a peça embaixo atrapalharia a leitura) e
  // contorno fino do trilho. Sem sombra, sem gradiente.
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.globalAlpha = 0.96;
  ctx.fillStyle = PALETTE.background;
  ctx.fill();
  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = 1.25;
  ctx.stroke();

  ctx.restore();

  let cursor = y + padY;

  drawBonusLine(
    ctx,
    cx,
    cursor + (bonusFont * 1.2) / 2,
    context,
    bonusFont,
    lineFont,
    width - padX * 2,
  );
  cursor += bonusFont * 1.2;

  if (hasCoins) {
    cursor += gap;
    drawCoinsLine(
      ctx,
      cx,
      cursor + lineHeight / 2,
      context.coins,
      context.coinsTotal,
      lineFont,
    );
    cursor += lineHeight;
  }

  if (showSeal) {
    cursor += gap;
    drawSeal(
      ctx,
      cx,
      cursor + starRadius,
      starRadius,
      context.sealNew,
      context.startedAt,
      context.now,
    );
    cursor += starRadius * 2;
  }

  cursor += gap;
  drawWalletLine(ctx, cx, cursor + lineHeight / 2, context.wallet, lineFont);
}

/** «+6 — 3/3 trens entregues»: bônus em destaque, contagem em peso menor. */
function drawBonusLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  context: VictoryPanelContext,
  bonusFont: number,
  lineFont: number,
  maxWidth: number,
): void {
  const { delivered, trainTotal, bonus } = context;
  const bonusText = `+${bonus}`;
  const unit = trainTotal === 1 ? 'trem entregue' : 'trens entregues';
  const restText = ` — ${delivered}/${trainTotal} ${unit}`;

  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.track;

  ctx.font = `700 ${bonusFont}px ${FONT_STACK}`;
  const bonusWidth = ctx.measureText(bonusText).width;

  ctx.font = `500 ${lineFont}px ${FONT_STACK}`;
  const restWidth = ctx.measureText(restText).width;
  const totalWidth = bonusWidth + restWidth;
  const scale = totalWidth > maxWidth ? maxWidth / totalWidth : 1;

  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.globalAlpha = 1;
  ctx.fillText(bonusText, -totalWidth / 2, 0);
  ctx.globalAlpha = 0.82;
  ctx.fillText(restText, -totalWidth / 2 + bonusWidth, 0);
  ctx.restore();
}

/** «4/4 moedas» com o glifo de ouro; omitida em fase sem moedas. */
function drawCoinsLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  coins: number,
  coinsTotal: number,
  font: number,
): void {
  const unit = coinsTotal === 1 ? 'moeda' : 'moedas';
  const text = `${coins}/${coinsTotal} ${unit}`;
  const glyphRadius = Math.max(3.5, font * 0.34);
  const gap = Math.max(4, font * 0.28);

  ctx.save();
  ctx.font = `500 ${font}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const textWidth = ctx.measureText(text).width;
  const groupWidth = glyphRadius * 2 + gap + textWidth;
  const glyphX = cx - groupWidth / 2 + glyphRadius;
  const textX = glyphX + glyphRadius + gap;

  ctx.globalAlpha = 0.88;
  drawCoinGlyph(ctx, glyphX, cy, glyphRadius);

  ctx.fillStyle = PALETTE.track;
  ctx.globalAlpha = 0.82;
  ctx.fillText(text, textX, cy);
  ctx.restore();
}

/**
 * Estrela do selo (D30). `sealNew` pulsa uma vez a partir de `startedAt`
 * (curva do pulse de entrega, D5); selo anterior fica estável.
 */
function drawSeal(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  sealNew: boolean,
  startedAt: number | null,
  now: number,
): void {
  let scale = 1;

  if (sealNew && startedAt !== null) {
    const duration = Math.max(1, TUNING.deliverPulseMs);
    scale = stationPulseScale((now - startedAt) / duration, SEAL_PULSE_PEAK);
  }

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  drawSealStar(ctx, 0, 0, radius);
  ctx.restore();
}

/** «carteira 14»: saldo persistente já com o banco desta vitória. */
function drawWalletLine(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  wallet: number,
  font: number,
): void {
  ctx.save();
  ctx.font = `600 ${font}px ${FONT_STACK}`;
  ctx.fillStyle = PALETTE.track;
  ctx.globalAlpha = 0.82;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`carteira ${wallet}`, cx, cy);
  ctx.restore();
}
