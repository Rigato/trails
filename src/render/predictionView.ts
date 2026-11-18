/**
 * Previsão de trajetória (GDD §3.8): pontilhado na cor do trem a 55%, do ponto
 * atual até o primeiro ponto de parada.
 *
 * O pontilhado segue a geometria REAL das peças (`tracePiecePath`) em vez de
 * ligar centros de célula — a rota parece trilho, não um atalho. A parada tem
 * aparência própria: anel na estação certa, X na estação errada, seta na borda,
 * sinal de proibido em célula sem saída e anel com marcador no loop (D2).
 */

import type { Board, Color, Direction, Prediction } from '../core/types';
import { cellAt } from '../core/types';
import { TUNING } from '../config/tuning';
import { cellCenter, type SceneLayout } from './layout';
import { tracePiecePath } from './pieces';

const PALETTE = TUNING.palette;

/** Espessura mínima dos pontinhos e traços em px CSS. */
const MIN_STROKE = 2;
/** Opacidade dos marcadores de parada: mais visíveis que o pontilhado. */
const STOP_ALPHA = 0.82;

interface Point {
  readonly x: number;
  readonly y: number;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Desenha a previsão de um trem.
 *
 * O trajeto já vem do core; o render só escolhe a geometria de cada célula e
 * o marcador do ponto de parada.
 */
export function drawPrediction(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  board: Board,
  prediction: Prediction,
  color: Color,
): void {
  const path = prediction.path;
  const lastIndex = path.length - 1;
  const lastCell = path[lastIndex];

  if (!lastCell || layout.cell <= 0) {
    return;
  }

  const cellSize = layout.cell;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Pontilhado: pontos redondos (traço de comprimento ~0 + lineCap round).
  ctx.globalAlpha = PALETTE.predictionAlpha;
  ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.07);
  ctx.setLineDash([0.01, cellSize * 0.16]);

  for (let index = 0; index < path.length; index += 1) {
    const cell = path[index];

    if (!cell) {
      continue;
    }

    const content = cellAt(board, cell);
    const x = layout.board.x + cell.col * cellSize;
    const y = layout.board.y + cell.row * cellSize;

    if (content?.kind === 'piece') {
      if (index === lastIndex && prediction.stop.kind === 'noExit') {
        // A rota morre nesta célula (entrou pelo lado errado): o traço vai da
        // borda de entrada ao centro. Desenhar a peça inteira prometeria uma
        // saída que o trem não tem.
        const previous = index > 0 ? path[index - 1] : undefined;

        if (previous !== undefined) {
          const center = cellCenter(layout, cell);
          const entry = midpoint(cellCenter(layout, previous), center);
          ctx.beginPath();
          ctx.moveTo(entry.x, entry.y);
          ctx.lineTo(center.x, center.y);
          ctx.stroke();
        }
      } else {
        // O trecho inteiro da peça; pontas coincidem com as células vizinhas.
        tracePiecePath(ctx, content.piece, x, y, cellSize);
        ctx.stroke();
      }
      continue;
    }

    if (content?.kind === 'fixed' && content.fixed.kind === 'station') {
      // A rota termina na borda da estação; o marcador de parada fala por ela.
      continue;
    }

    const center = cellCenter(layout, cell);
    const previous = index > 0 ? path[index - 1] : undefined;
    const next = index < lastIndex ? path[index + 1] : undefined;

    ctx.beginPath();

    if (previous) {
      const entry = midpoint(cellCenter(layout, previous), center);
      ctx.moveTo(entry.x, entry.y);
      ctx.lineTo(center.x, center.y);

      if (next) {
        const exit = midpoint(center, cellCenter(layout, next));
        ctx.lineTo(exit.x, exit.y);
      }
    } else if (next) {
      // Trem waiting na célula de entrada: a rota parte do centro para dentro.
      const exit = midpoint(center, cellCenter(layout, next));
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(exit.x, exit.y);
    }

    ctx.stroke();
  }

  ctx.setLineDash([]);
  ctx.globalAlpha = STOP_ALPHA;
  drawStopMarker(ctx, layout, prediction, color);

  ctx.restore();
}

/** Marcador do ponto onde a previsão termina. */
function drawStopMarker(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  prediction: Prediction,
  color: Color,
): void {
  const cellSize = layout.cell;
  const center = cellCenter(layout, prediction.stop.cell);
  const stop = prediction.stop;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.035);

  switch (stop.kind) {
    case 'station': {
      if (stop.correct) {
        // Anel em volta da casa: «chegou ao destino».
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.44, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // X sobre a estação: cor errada, a previsão avisa antes do passo.
        const reach = cellSize * 0.26;
        ctx.lineWidth = Math.max(MIN_STROKE + 1, cellSize * 0.075);
        ctx.beginPath();
        ctx.moveTo(center.x - reach, center.y - reach);
        ctx.lineTo(center.x + reach, center.y + reach);
        ctx.moveTo(center.x + reach, center.y - reach);
        ctx.lineTo(center.x - reach, center.y + reach);
        ctx.stroke();
      }
      break;
    }

    case 'border': {
      // Seta saindo da grade na direção de fuga.
      const angle = directionAngle(stop.direction);
      const anchor = {
        x: center.x + Math.cos(angle) * cellSize * 0.4,
        y: center.y + Math.sin(angle) * cellSize * 0.4,
      };
      drawChevron(ctx, anchor.x, anchor.y, angle, cellSize * 0.22, cellSize * 0.055);
      break;
    }

    case 'noExit': {
      // Sinal de proibido (anel + barra): a rota não tem saída. Distinto do X
      // de estação errada e legível mesmo sobre um trilho vertical.
      const radius = cellSize * 0.26;
      const diagonal = radius * 0.7;
      ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.04);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(center.x - diagonal, center.y - diagonal);
      ctx.lineTo(center.x + diagonal, center.y + diagonal);
      ctx.stroke();
      break;
    }

    case 'loop': {
      // Anel fechado com marcador de ciclo (D2).
      const radius = cellSize * 0.3;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      const arrowSize = cellSize * 0.09;
      ctx.beginPath();
      ctx.moveTo(center.x + arrowSize * 1.4, center.y - radius);
      ctx.lineTo(center.x + arrowSize * 0.2, center.y - radius - arrowSize);
      ctx.lineTo(center.x + arrowSize * 0.2, center.y - radius + arrowSize);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'limit': {
      // Trava de segurança: alvo vazado, sem prometer parada natural.
      const half = cellSize * 0.15;
      ctx.strokeRect(center.x - half, center.y - half, half * 2, half * 2);
      break;
    }
  }
}

/** Ângulo do eixo +x para uma direção de deslocamento. */
function directionAngle(direction: Direction): number {
  switch (direction) {
    case 'east':
      return 0;
    case 'south':
      return Math.PI / 2;
    case 'west':
      return Math.PI;
    case 'north':
      return -Math.PI / 2;
  }
}

/** Chevron apontando em `angle`, centrado em (x, y). */
function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  lineWidth: number,
): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;

  ctx.save();
  ctx.lineWidth = Math.max(MIN_STROKE, lineWidth);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(
    x - dx * size * 0.4 + px * size * 0.5,
    y - dy * size * 0.4 + py * size * 0.5,
  );
  ctx.lineTo(x + dx * size * 0.5, y + dy * size * 0.5);
  ctx.lineTo(
    x - dx * size * 0.4 - px * size * 0.5,
    y - dy * size * 0.4 - py * size * 0.5,
  );
  ctx.stroke();
  ctx.restore();
}
