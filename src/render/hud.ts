/**
 * HUD mínimo desenhado no canvas: cabeçalho (fase, passo, estado) e os dois
 * botões de 44 pt do E2 — «Passar turno» e «Recomeçar».
 *
 * Sem ícones, sem menu: a única função do HUD nesta fase é dar acesso ao passo
 * sem peça e ao recomeço instantâneo, além de não deixar o estado final
 * («entregue» / sem trem) invisível.
 */

import type { GameState } from '../core/types';
import { TUNING } from '../config/tuning';
import type { Rect, SceneLayout } from './layout';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEADER_ALPHA = 0.82;

/** Desenha o cabeçalho e os botões do HUD. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
): void {
  drawHeader(ctx, layout, state, levelName);
  drawButton(ctx, layout, layout.resetButton, 'Recomeçar', false, true);
  drawButton(
    ctx,
    layout,
    layout.passButton,
    'Passar turno',
    true,
    state.status !== 'won' && state.status !== 'deadEnd',
  );
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
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
    header.width * 0.38,
  );
  ctx.restore();
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
  }
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  rect: Rect,
  label: string,
  primary: boolean,
  enabled: boolean,
): void {
  const radius = rect.height * 0.3;

  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.42;

  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);

  if (primary) {
    ctx.fillStyle = PALETTE.track;
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
