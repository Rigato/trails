/**
 * HUD desenhado no canvas: cabeçalho (fase, passo, estado, vidas) e botões.
 *
 * Em jogo, os dois botões de 44 pt são «Passar turno» e «Recomeçar». Quando a
 * run termina, os dois viram UM botão de largura total: «Próxima fase» quando
 * a vitória tem sucessora (D10), «Jogar de novo» na última fase e «Recomeçar»
 * em deadEnd/lost. O caminho para seguir/rejogar fica óbvio sem menu.
 *
 * Vidas são marcas geométricas no centro do cabeçalho: diamantes cheios =
 * vivas, vazios = perdidas. Fase sem vidas (`lives: null`) não desenha nada.
 * E8: a marca que acabou de esvaziar pulsa (cresce + anel, `lifeLostPulseMs`),
 * ancorada no relógio do loop; duas perdas no mesmo passo = duas marcas.
 */

import type { GameState } from '../core/types';
import { TUNING } from '../config/tuning';
import {
  lifePulseProgress,
  lifePulseRing,
  lifePulseScale,
  type LifeLostPulse,
} from './fx';
import type { Rect, SceneLayout } from './layout';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEADER_ALPHA = 0.82;
const EMPTY_LIFE_ALPHA = 0.5;

/** Contexto de HUD que não vive no snapshot do core. */
export interface HudContext {
  /** Total de vidas da fase; `null` = tutorial sem vidas (D1). */
  readonly livesTotal: number | null;
  /** A fase atual tem sucessora? Decide «Próxima fase» vs. «Jogar de novo». */
  readonly hasNextPhase: boolean;
  /** Relógio do quadro — anima o pulse das marcas de vida (E8). */
  readonly now: number;
  /** Marcas que acabaram de esvaziar e ainda pulsam (E8). */
  readonly lifePulses: readonly LifeLostPulse[];
}

/**
 * Retângulo do botão único de fim de run: a união dos dois botões, incluindo o
 * vão central. Exportado para o hit-test do input usar exatamente a mesma área
 * que o desenho.
 */
export function fullWidthHudButton(layout: SceneLayout): Rect {
  const left = layout.passButton;
  const right = layout.resetButton;
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const rightEdge = Math.max(left.x + left.width, right.x + right.width);
  const bottom = Math.max(left.y + left.height, right.y + right.height);

  return { x, y, width: rightEdge - x, height: bottom - y };
}

/** Desenha o cabeçalho e os botões do HUD. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
  context: HudContext,
): void {
  drawHeader(ctx, layout, state, levelName, context);

  if (isEnded(state)) {
    const winner = state.trains.find((train) => train.status.kind === 'delivered');
    const accent =
      state.status === 'won' ? (winner?.color ?? PALETTE.pairs[0]) : undefined;

    drawButton(
      ctx,
      layout,
      fullWidthHudButton(layout),
      endLabel(state, context.hasNextPhase),
      true,
      true,
      accent,
    );
    return;
  }

  drawButton(ctx, layout, layout.resetButton, 'Recomeçar', false, true);
  drawButton(ctx, layout, layout.passButton, 'Passar turno', true, true);
}

function isEnded(state: GameState): boolean {
  return (
    state.status === 'won' ||
    state.status === 'deadEnd' ||
    state.status === 'lost'
  );
}

/** Rótulo do botão único de fim de run (D1/D5/D10). */
function endLabel(state: GameState, hasNextPhase: boolean): string {
  if (state.status === 'won') {
    return hasNextPhase ? 'Próxima fase' : 'Jogar de novo';
  }

  return 'Recomeçar';
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
  context: HudContext,
): void {
  const { header, headerFontSize } = layout;

  ctx.save();
  ctx.globalAlpha = HEADER_ALPHA;
  ctx.fillStyle = PALETTE.track;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${headerFontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(levelName, header.x, header.y + header.height / 2, header.width * 0.58);

  ctx.textAlign = 'right';
  ctx.font = `600 ${headerFontSize}px ${FONT_STACK}`;
  ctx.fillText(
    statusLabel(state),
    header.x + header.width,
    header.y + header.height / 2,
    header.width * 0.42,
  );
  ctx.restore();

  if (context.livesTotal !== null && context.livesTotal > 0) {
    drawLifeMarks(
      ctx,
      layout,
      state.lives ?? 0,
      context.livesTotal,
      context.now,
      context.lifePulses,
    );
  }
}

/** Rótulo curto do estado; o passo é a informação padrão durante o jogo. */
function statusLabel(state: GameState): string {
  switch (state.status) {
    case 'ready':
      return 'passo 0';
    case 'playing':
      return `passo ${state.step}`;
    case 'won':
      return 'entregue';
    case 'deadEnd':
      return 'sem trem ativo';
    case 'lost':
      return 'sem vidas';
  }
}

/**
 * Marcas de vida no centro do cabeçalho: cheias = vivas, vazias = perdidas.
 *
 * Diamantes pequenos (não os símbolos dos pares) mantêm o HUD neutro em cor e
 * legível em DPR 1; a quantidade total vem da fase, o saldo do snapshot.
 *
 * E8: a marca que acabou de esvaziar pulsa — cresce e volta, com um anel na
 * cor do trilho expandindo e sumindo (`lifeLostPulseMs`). O índice vem do
 * `remaining` do evento `lifeLost` (marcas `0..remaining-1` seguem cheias), então
 * duas perdas no mesmo passo fazem DUAS marcas pulsarem. O pulse é ancorado no
 * relógio do loop, como os demais fx.
 */
function drawLifeMarks(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  current: number,
  total: number,
  now: number,
  pulses: readonly LifeLostPulse[],
): void {
  const size = Math.max(6, layout.headerFontSize * 0.55);
  const gap = size * 0.55;
  const marksWidth = total * size + (total - 1) * gap;
  const startX = layout.header.x + layout.header.width / 2 - marksWidth / 2 + size / 2;
  const cy = layout.header.y + layout.header.height / 2;
  const alive = Math.max(0, Math.min(total, Math.trunc(current)));

  ctx.save();

  for (let index = 0; index < total; index += 1) {
    const cx = startX + index * (size + gap);
    const pulse = pulses.find((candidate) => candidate.markIndex === index);
    const progress = pulse === undefined ? 1 : lifePulseProgress(pulse, now);
    const pulsing = pulse !== undefined && progress < 1;
    const scale = pulsing ? lifePulseScale(progress) : 1;

    // Anel de perda: atrás da marca, na cor do trilho, expande e desaparece.
    if (pulsing) {
      const ring = lifePulseRing(progress);

      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = PALETTE.track;
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.beginPath();
      ctx.arc(cx, cy, size * ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);

    if (scale !== 1) {
      ctx.scale(scale, scale);
    }

    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, size / 2);
    ctx.lineTo(-size / 2, 0);
    ctx.closePath();

    if (index < alive) {
      ctx.globalAlpha = HEADER_ALPHA;
      ctx.fillStyle = PALETTE.track;
      ctx.fill();
    } else {
      ctx.globalAlpha = pulsing
        ? 0.55 + 0.4 * (1 - progress)
        : EMPTY_LIFE_ALPHA;
      ctx.strokeStyle = PALETTE.track;
      ctx.lineWidth = Math.max(1, size * 0.16);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  rect: Rect,
  label: string,
  primary: boolean,
  enabled: boolean,
  accent?: string,
): void {
  const radius = rect.height * 0.3;

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.42;

  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);

  if (primary) {
    ctx.fillStyle = accent ?? PALETTE.track;
    ctx.fill();
    ctx.fillStyle = PALETTE.background;
  } else {
    ctx.fillStyle = PALETTE.background;
    ctx.fill();
    ctx.strokeStyle = PALETTE.track;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = PALETTE.track;
  }

  ctx.font = `600 ${layout.buttonFontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    rect.x + rect.width / 2,
    rect.y + rect.height / 2 + 0.5,
    rect.width * 0.86,
  );
  ctx.restore();
}
