/**
 * Lista de fases — a home do jogo (M2/D30).
 *
 * Grade de 2 colunas desenhada por código: número + nome + selo (estrela
 * dourada, D30) ou cadeado (fase bloqueada). O card da fase recomendada pulsa
 * na família do hint D6 (`firstHintPulseMs`), sem texto. Toque em card
 * bloqueado só acende um flash nulo D3 — a decisão de não carregar a fase é do
 * `main.ts`, este módulo só desenha.
 *
 * Estética feia-e-funcional coerente com o tabuleiro: superfícies e glifos na
 * cor estrutural do trilho, ouro só na moeda e no selo (forma + cor, nunca cor
 * sozinha). Nenhum estado de jogo vive aqui: o quadro é derivado do `SaveState`
 * que o `main.ts` já validou.
 */

import type { LevelLayout } from '../core/types';
import { TUNING } from '../config/tuning';
import { COIN_COLOR, COIN_HIGHLIGHT, drawCoinGlyph } from './coin';
import { CELL_FLASH_MS, hintPulseIntensity } from './fx';
import type { PhaseListLayout, Rect } from './layout';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
/** Opacidade do conteúdo de uma fase bloqueada (o cadeado manda no card). */
const LOCKED_CONTENT_ALPHA = 0.38;

/** Contexto de apresentação da lista, todo derivado do save + fases. */
export interface PhaseListContext {
  readonly phases: readonly LevelLayout[];
  /** Ids de fase com selo de perfeição; M2 só lê. */
  readonly seals: readonly string[];
  /** Menor índice desbloqueado (a fase recomendada). */
  readonly unlockedIndex: number;
  /** Índice que pulsa (minúsculo no card, sem texto) — D6. */
  readonly recommendedIndex: number;
  /** Saldo da carteira, exibido no cabeçalho. */
  readonly wallet: number;
  /** Relógio do quadro: pulso D6 e flash nulo D3. */
  readonly now: number;
  /** Card bloqueado tocado recentemente; `null` = sem flash. */
  readonly lockedFlash: { readonly index: number; readonly startedAt: number } | null;
}

/** Desenha a lista inteira: fundo, cabeçalho, cards e feedbacks. */
export function drawPhaseList(
  ctx: CanvasRenderingContext2D,
  layout: PhaseListLayout,
  context: PhaseListContext,
): void {
  ctx.save();
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawHeader(ctx, layout, context.wallet);

  for (const [index, phase] of context.phases.entries()) {
    const rect = layout.cards[index];

    if (rect === undefined) {
      continue;
    }

    const locked = index > context.unlockedIndex;
    const sealed = context.seals.includes(phase.id);
    const recommended =
      index === context.recommendedIndex && !locked;

    drawCard(
      ctx,
      layout,
      rect,
      index,
      phase,
      locked,
      sealed,
      recommended,
      context,
    );
  }

  ctx.restore();
}

/** Título discreto à esquerda; carteira (glifo + saldo) à direita. */
function drawHeader(
  ctx: CanvasRenderingContext2D,
  layout: PhaseListLayout,
  wallet: number,
): void {
  const { header, titleFontSize, walletFontSize } = layout;
  const cy = header.y + header.height / 2;

  ctx.save();
  ctx.globalAlpha = 0.86;
  ctx.fillStyle = PALETTE.track;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `700 ${titleFontSize}px ${FONT_STACK}`;
  ctx.fillText('Trails', header.x, cy, header.width * 0.5);

  // Carteira: número primeiro (alinhado à direita), glifo à esquerda dele.
  const walletText = String(Math.max(0, Math.trunc(wallet)));
  const right = header.x + header.width;

  ctx.font = `600 ${walletFontSize}px ${FONT_STACK}`;
  const textWidth = ctx.measureText(walletText).width;
  const radius = Math.max(4, walletFontSize * 0.34);
  const gap = Math.max(4, walletFontSize * 0.26);

  ctx.globalAlpha = 0.82;
  ctx.textAlign = 'right';
  ctx.fillText(walletText, right, cy);

  drawCoinGlyph(ctx, right - textWidth - gap - radius, cy, radius);
  ctx.restore();
}

/** Um card: superfície, pulso D6, número/nome, selo/cadeado e flash D3. */
function drawCard(
  ctx: CanvasRenderingContext2D,
  layout: PhaseListLayout,
  rect: Rect,
  index: number,
  phase: LevelLayout,
  locked: boolean,
  sealed: boolean,
  recommended: boolean,
  context: PhaseListContext,
): void {
  const { cardRadius, cardNumberFontSize, cardNameFontSize } = layout;
  const cy = rect.y + rect.height / 2;

  // Superfície: tint leve do trilho sobre o fundo. O cadeado escurece o card
  // inteiro; o contorno continua visível para a grade não virar lama.
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, cardRadius);
  ctx.fillStyle = PALETTE.track;
  ctx.globalAlpha = locked ? 0.035 : 0.065;
  ctx.fill();
  ctx.globalAlpha = locked ? 0.16 : 0.28;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = 1.25;
  ctx.stroke();
  ctx.restore();

  if (recommended) {
    drawRecommendedPulse(ctx, layout, rect, context.now);
  }

  const contentAlpha = locked ? LOCKED_CONTENT_ALPHA : 1;
  const textX = rect.x + rect.width * 0.1;
  const reserve = rect.width * 0.4;

  ctx.save();
  ctx.globalAlpha = contentAlpha;
  ctx.fillStyle = PALETTE.track;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${cardNumberFontSize}px ${FONT_STACK}`;
  ctx.fillText(
    String(index + 1),
    textX,
    rect.y + rect.height * 0.36,
    rect.width - reserve,
  );

  ctx.globalAlpha = contentAlpha * 0.82;
  ctx.font = `500 ${cardNameFontSize}px ${FONT_STACK}`;
  ctx.fillText(
    phase.name,
    textX,
    rect.y + rect.height * 0.72,
    rect.width - reserve,
  );
  ctx.restore();

  const glyphSize = Math.max(
    7,
    Math.min(18, Math.min(rect.width, rect.height) * 0.2),
  );
  const glyphX = rect.x + rect.width - Math.max(14, rect.width * 0.16);

  if (locked) {
    drawLockGlyph(ctx, glyphX, cy, glyphSize * 1.35, LOCKED_CONTENT_ALPHA);
  } else if (sealed) {
    drawSealStar(ctx, glyphX, cy, glyphSize * 1.05);
  }

  if (context.lockedFlash !== null && context.lockedFlash.index === index) {
    drawLockedFlash(ctx, layout, rect, context);
  }
}

/** Pulso sutil do card recomendado, na família de `firstHintPulseMs` (D6). */
function drawRecommendedPulse(
  ctx: CanvasRenderingContext2D,
  layout: PhaseListLayout,
  rect: Rect,
  now: number,
): void {
  const intensity = hintPulseIntensity(now);
  const inset = 1.5;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    rect.x + inset,
    rect.y + inset,
    Math.max(0, rect.width - inset * 2),
    Math.max(0, rect.height - inset * 2),
    Math.max(0, layout.cardRadius - inset),
  );
  ctx.globalAlpha = 0.14 + 0.22 * intensity;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = 1.25 + 0.45 * intensity;
  ctx.stroke();
  ctx.restore();
}

/**
 * Flash nulo de card bloqueado (D3): o card acende e apaga, nada carrega.
 *
 * Mesma janela curta do flash de célula; o alpha cai linearmente e o contorno
 * engrossa, o suficiente para confirmar o toque sem parecer erro.
 */
function drawLockedFlash(
  ctx: CanvasRenderingContext2D,
  layout: PhaseListLayout,
  rect: Rect,
  context: PhaseListContext,
): void {
  const flash = context.lockedFlash;

  if (flash === null) {
    return;
  }

  const progress = (context.now - flash.startedAt) / CELL_FLASH_MS;

  if (progress < 0 || progress >= 1) {
    return;
  }

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, layout.cardRadius);
  ctx.fillStyle = PALETTE.track;
  ctx.globalAlpha = 0.16 * (1 - progress);
  ctx.fill();
  ctx.globalAlpha = 0.42 * (1 - progress);
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

/** Estrela dourada do selo de perfeição (D30): forma + cor, nunca só cor. */
function drawSealStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const points = 5;
  const inner = radius * 0.45;

  ctx.save();
  ctx.beginPath();

  for (let point = 0; point < points * 2; point += 1) {
    const r = point % 2 === 0 ? radius : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / points;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    if (point === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fillStyle = COIN_COLOR;
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = Math.max(1, radius * 0.16);
  ctx.stroke();

  // Um brilho no miolo repete a leitura da moeda sem virar gradiente.
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = COIN_HIGHLIGHT;
  ctx.beginPath();
  ctx.arc(cx - radius * 0.16, cy - radius * 0.18, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Cadeado de fase bloqueada: corpo arredondado + alça, desenhado por código. */
function drawLockGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  alpha: number,
): void {
  const bodyWidth = size * 0.82;
  const bodyHeight = size * 0.62;
  const bodyX = cx - bodyWidth / 2;
  const bodyY = cy - size * 0.04;
  const shackleRadius = size * 0.26;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = PALETTE.track;
  ctx.fillStyle = PALETTE.track;
  ctx.lineWidth = Math.max(1.5, size * 0.13);
  ctx.lineCap = 'round';

  // Alça: arco de meia-volta apoiado no topo do corpo.
  ctx.beginPath();
  ctx.arc(cx, bodyY, shackleRadius, Math.PI, Math.PI * 2);
  ctx.stroke();

  // Corpo.
  ctx.beginPath();
  ctx.roundRect(bodyX, bodyY, bodyWidth, bodyHeight, size * 0.12);
  ctx.fill();

  // Fechadura vazada na cor do fundo (lê como buraco, não como detalhe).
  ctx.globalAlpha = alpha * 0.9;
  ctx.fillStyle = PALETTE.background;
  ctx.beginPath();
  ctx.arc(cx, bodyY + bodyHeight * 0.36, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(
    cx - size * 0.028,
    bodyY + bodyHeight * 0.4,
    size * 0.056,
    bodyHeight * 0.3,
  );
  ctx.restore();
}
