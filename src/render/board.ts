/**
 * Tabuleiro: grade, elementos fixos e peças.
 *
 * Tudo geometria desenhada por código. A estação usa cor + forma redundantes
 * (GDD §5) e a entrada é marcada na borda apontando para dentro (GDD §3.4).
 *
 * O E3 acrescenta dois ganchos de animação, ambos opcionais: o ângulo contínuo
 * de uma peça girando e a escala da estação durante o pulse de entrega. O E8
 * acrescenta um terceiro: o ângulo local da agulha do Y no toggle. O estado
 * continua sendo o snapshot do core; os overrides só existem no quadro.
 */

import type { Board, Entry, Station } from '../core/types';
import { TUNING } from '../config/tuning';
import type { SceneLayout } from './layout';
import { drawPiece } from './pieces';
import { drawShapeSymbol } from './symbol';

const PALETTE = TUNING.palette;

/** Espessura mínima de linha da grade em px CSS. */
const GRID_LINE_WIDTH = 1;

/**
 * Desenha a grade inteira: painel, linhas, peças, estações e entradas.
 *
 * A ordem importa: peças por cima das linhas; a estação e a entrada são
 * elementos fixos e nunca giram.
 *
 * `pieceAngles` mapeia `cellKey` → ângulo em radianos (giro animado),
 * `stationScales` mapeia `cellKey` → escala (pulse de entrega) e
 * `needleAngles` mapeia `cellKey` → ângulo local da agulha do Y (toggle
 * animado do E8). Mapas ausentes ou vazios desenham o estado repousado.
 */
export function drawBoard(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  board: Board,
  pieceAngles?: ReadonlyMap<string, number>,
  stationScales?: ReadonlyMap<string, number>,
  needleAngles?: ReadonlyMap<string, number>,
): void {
  drawGrid(ctx, layout);

  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const content = board.rows[row]?.[col];

      if (content === undefined) {
        continue;
      }

      const x = layout.board.x + col * layout.cell;
      const y = layout.board.y + row * layout.cell;
      const key = `${col}:${row}`;

      if (content.kind === 'piece') {
        drawPiece(
          ctx,
          content.piece,
          x,
          y,
          layout.cell,
          PALETTE.track,
          pieceAngles?.get(key),
          needleAngles?.get(key),
        );
      } else if (content.kind === 'fixed') {
        if (content.fixed.kind === 'station') {
          drawStation(
            ctx,
            content.fixed,
            x,
            y,
            layout.cell,
            stationScales?.get(key) ?? 1,
          );
        } else {
          drawEntry(ctx, content.fixed, x, y, layout.cell);
        }
      }
    }
  }

  ctx.save();
  ctx.strokeStyle = PALETTE.track;
  ctx.globalAlpha = 0.22;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(layout.board.x, layout.board.y, layout.board.width, layout.board.height);
  ctx.restore();
}

/** Painel e linhas de célula — discretos para não competir com as peças. */
function drawGrid(ctx: CanvasRenderingContext2D, layout: SceneLayout): void {
  const { board, cell } = layout;

  ctx.save();

  // Painel levemente mais escuro que o fundo: delimita a área de jogo.
  ctx.fillStyle = PALETTE.track;
  ctx.globalAlpha = 0.035;
  ctx.fillRect(board.x, board.y, board.width, board.height);
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = GRID_LINE_WIDTH;

  ctx.beginPath();
  for (let col = 1; col < layout.columns; col += 1) {
    const x = board.x + col * cell;
    ctx.moveTo(x, board.y);
    ctx.lineTo(x, board.y + board.height);
  }
  for (let row = 1; row < layout.rows; row += 1) {
    const y = board.y + row * cell;
    ctx.moveTo(board.x, y);
    ctx.lineTo(board.x + board.width, y);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * Estação em forma de casa: telhado triangular + bloco arredondado, na cor do
 * par, com o símbolo da forma vazado no centro. O símbolo é o canal redundante
 * à cor (daltonismo, GDD §5).
 *
 * `scale` > 1 é o pulse de entrega (D5), aplicado em volta do centro da célula
 * para a casa crescer sem sair do lugar.
 */
function drawStation(
  ctx: CanvasRenderingContext2D,
  station: Station,
  x: number,
  y: number,
  cell: number,
  scale: number,
): void {
  const size = cell * TUNING.stationInsetRatio;
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const roofTop = cy - size / 2;
  const roofBottom = cy - size * 0.1;
  const bodyBottom = cy + size / 2;
  const bodyWidth = size * 0.88;
  const bodyTop = roofBottom;
  const bodyRadius = Math.min(cell * 0.08, size * 0.14);

  ctx.save();

  if (scale !== 1) {
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
  }

  ctx.fillStyle = station.color;

  // Telhado.
  ctx.beginPath();
  ctx.moveTo(cx, roofTop);
  ctx.lineTo(cx + size / 2, roofBottom);
  ctx.lineTo(cx - size / 2, roofBottom);
  ctx.closePath();
  ctx.fill();

  // Corpo.
  ctx.beginPath();
  ctx.roundRect(cx - bodyWidth / 2, bodyTop, bodyWidth, bodyBottom - bodyTop, bodyRadius);
  ctx.fill();

  drawShapeSymbol(
    ctx,
    station.shape,
    cx,
    cy + size * 0.16,
    cell * TUNING.symbolSizeRatio,
    PALETTE.background,
  );
  ctx.restore();
}

/**
 * Entrada na borda: chevron apontando para dentro da grade, na direção em que
 * a locomotiva entra. Fica encostado na borda externa da célula de entrada.
 */
function drawEntry(
  ctx: CanvasRenderingContext2D,
  entry: Entry,
  x: number,
  y: number,
  cell: number,
): void {
  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const dx = entry.direction === 'east' ? 1 : entry.direction === 'west' ? -1 : 0;
  const dy = entry.direction === 'south' ? 1 : entry.direction === 'north' ? -1 : 0;
  const px = -dy;
  const py = dx;
  const size = cell * 0.26;
  // O chevron fica na borda EXTERNA (o lado oposto à direção de entrada),
  // majoritariamente fora da grade: assim a marca continua visível mesmo com o
  // trem waiting pousado na célula.
  const edgeX = cx - dx * cell * 0.5;
  const edgeY = cy - dy * cell * 0.5;
  const anchorX = edgeX - dx * size * 0.35;
  const anchorY = edgeY - dy * size * 0.35;
  const tipX = anchorX + dx * size * 0.5;
  const tipY = anchorY + dy * size * 0.5;
  const backX = anchorX - dx * size * 0.4;
  const backY = anchorY - dy * size * 0.4;

  ctx.save();
  ctx.strokeStyle = PALETTE.track;
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = Math.max(2, cell * 0.055);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(backX + px * size * 0.45, backY + py * size * 0.45);
  ctx.lineTo(tipX, tipY);
  ctx.lineTo(backX - px * size * 0.45, backY - py * size * 0.45);
  ctx.stroke();
  ctx.restore();
}
