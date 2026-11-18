/**
 * HUD mínimo desenhado no canvas: cabeçalho (fase, passo, estado) e os botões.
 *
 * Em jogo, os dois botões de 44 pt são «Passar turno» e «Recomeçar». Quando a
 * run termina, os dois viram UM botão de largura total: «Jogar de novo» na
 * vitória (D5) e «Recomeçar» no estado sem trem ativo (D1). O caminho para
 * rejogar fica óbvio sem menu — é o sinal de sucesso do P0.
 */

import type { GameState } from '../core/types';
import { TUNING } from '../config/tuning';
import type { Rect, SceneLayout } from './layout';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEADER_ALPHA = 0.82;

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
): void {
  drawHeader(ctx, layout, state, levelName);

  if (state.status === 'won' || state.status === 'deadEnd') {
    const winner = state.trains.find((train) => train.status.kind === 'delivered');
    const accent = state.status === 'won' ? (winner?.color ?? PALETTE.pair) : undefined;

    drawButton(
      ctx,
      layout,
      fullWidthHudButton(layout),
      state.status === 'won' ? 'Jogar de novo' : 'Recomeçar',
      true,
      true,
      accent,
    );
    return;
  }

  drawButton(ctx, layout, layout.resetButton, 'Recomeçar', false, true);
  drawButton(ctx, layout, layout.passButton, 'Passar turno', true, true);
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
