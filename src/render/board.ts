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

import type { Board, Bridge, EntryPoint, Station } from '../core/types';
import { TUNING } from '../config/tuning';
import { cellCenter, type SceneLayout } from './layout';
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
  entries?: readonly EntryPoint[],
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
        } else if (content.fixed.kind === 'river') {
          drawRiver(ctx, x, y, layout.cell);
        } else {
          drawBridge(ctx, content.fixed, x, y, layout.cell);
        }
      }
    }
  }

  // Entradas são marcadores de borda derivados do layout, não células fixas.
  for (const entry of entries ?? []) {
    drawEntryMarker(ctx, layout, entry);
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
 * Base de água de uma célula de rio: teal próprio (nunca cinza-trilho) + duas
 * ondulações claras. A ponte usa a mesma base e desenha a travessia por cima.
 */
function drawWaterBase(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
): void {
  ctx.save();
  ctx.fillStyle = PALETTE.river;
  ctx.fillRect(x, y, cell, cell);

  ctx.strokeStyle = PALETTE.background;
  ctx.globalAlpha = 0.28;
  ctx.lineWidth = Math.max(1, cell * 0.022);
  ctx.lineCap = 'round';

  for (let band = 0; band < 2; band += 1) {
    const baseY = y + cell * (0.32 + 0.36 * band);
    const amplitude = cell * 0.045;
    const phase = band * Math.PI;
    const steps = 10;

    ctx.beginPath();
    for (let step = 0; step <= steps; step += 1) {
      const t = step / steps;
      const px = x + cell * (0.08 + 0.84 * t);
      const py = baseY + Math.sin(t * Math.PI * 2 + phase) * amplitude;

      if (step === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
}

/** Célula de rio: só água; a banda reta é formada pelas células contíguas. */
function drawRiver(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
): void {
  drawWaterBase(ctx, x, y, cell);
}

/**
 * Ponte fixa sobre a água: deck claro (levemente elevado) + trilho escuro no
 * eixo da travessia. A água aparece dos lados perpendiculares ao trilho; o
 * deck é a leitura de «travessia», não de mais um trilho.
 */
function drawBridge(
  ctx: CanvasRenderingContext2D,
  bridge: Bridge,
  x: number,
  y: number,
  cell: number,
): void {
  drawWaterBase(ctx, x, y, cell);

  const cx = x + cell / 2;
  const cy = y + cell / 2;
  const deck = cell * 0.34;
  const radius = Math.max(2, cell * 0.045);
  const horizontal = bridge.axis === 'east-west';

  ctx.save();

  // Deck claro, com uma borda fina do trilho para separar da água.
  ctx.beginPath();
  if (horizontal) {
    ctx.roundRect(x + cell * 0.015, cy - deck / 2, cell * 0.97, deck, radius);
  } else {
    ctx.roundRect(cx - deck / 2, y + cell * 0.015, deck, cell * 0.97, radius);
  }
  ctx.fillStyle = PALETTE.background;
  ctx.fill();
  ctx.strokeStyle = PALETTE.track;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = Math.max(1.5, cell * 0.022);
  ctx.stroke();

  // Trilho da travessia no eixo da ponte.
  ctx.globalAlpha = 1;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = Math.max(2, cell * TUNING.trackWidthRatio);
  ctx.lineCap = 'butt';
  ctx.beginPath();
  if (horizontal) {
    ctx.moveTo(x, cy);
    ctx.lineTo(x + cell, cy);
  } else {
    ctx.moveTo(cx, y);
    ctx.lineTo(cx, y + cell);
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
 * Entrada na borda: chevron apontando para dentro da grade, derivado de
 * `EntryPoint.cell`/`direction`. Fica encostado à borda externa da célula de
 * entrada, majoritariamente fora da grade — o trem waiting fica uma célula
 * atrás e o chevron continua legível.
 */
function drawEntryMarker(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  entry: EntryPoint,
): void {
  const cell = layout.cell;

  if (cell <= 0) {
    return;
  }

  const center = cellCenter(layout, entry.cell);
  const dx = entry.direction === 'east' ? 1 : entry.direction === 'west' ? -1 : 0;
  const dy = entry.direction === 'south' ? 1 : entry.direction === 'north' ? -1 : 0;
  const px = -dy;
  const py = dx;
  const size = cell * 0.26;
  const edgeX = center.x - dx * cell * 0.5;
  const edgeY = center.y - dy * cell * 0.5;
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
