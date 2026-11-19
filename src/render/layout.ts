/**
 * Geometria da cena em px CSS: onde ficam a grade, o cabeçalho e os botões.
 *
 * O canvas é desenhado sempre em px CSS e o contexto é escalado por DPR no
 * boot. Este módulo é puro (sem DOM) para o hit-test do input e o desenho
 * usarem exatamente a mesma conta — é o que garante que tocar a célula certa
 * gira a peça certa.
 */

import type { Board, CellPos } from '../core/types';
import { TUNING } from '../config/tuning';

/** Retângulo em px CSS, origem no canto superior esquerdo do canvas. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Alvo de toque do HUD. */
export type HudTarget = 'pass' | 'reset';

/** Layout completo de um quadro. Recalculado a cada resize. */
export interface SceneLayout {
  readonly width: number;
  readonly height: number;
  /** Cabeçalho (nome da fase + passo/estado). */
  readonly header: Rect;
  /** Área exata da grade, já centrada. */
  readonly board: Rect;
  readonly columns: number;
  readonly rows: number;
  /** Lado de uma célula em px CSS (quadrada). */
  readonly cell: number;
  readonly passButton: Rect;
  readonly resetButton: Rect;
  readonly headerFontSize: number;
  readonly buttonFontSize: number;
}

/** Espaçamento externo mínimo/máximo do shell, em px CSS. */
const PAD_MIN = 10;
const PAD_MAX = 24;
/** Altura do cabeçalho e folgas do HUD (não são parâmetros de jogo). */
const HEADER_MIN = 18;
const HEADER_MAX = 26;
const GAP_MIN = 8;
const GAP_MAX = 16;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Calcula a cena para um canvas de `width`×`height` px CSS.
 *
 * Portrait-first: a grade é limitada pela largura (`boardMaxWidthRatio`) e
 * centrada; no desktop a faixa portrait já é estreita, então a célula cresce
 * junto com a tela. O rodapé reserva a altura mínima dos botões.
 */
export function computeLayout(width: number, height: number, board: Board): SceneLayout {
  const pad = clamp(width * 0.04, PAD_MIN, PAD_MAX);
  const headerHeight = clamp(width * 0.05, HEADER_MIN, HEADER_MAX);
  const gap = clamp(width * 0.03, GAP_MIN, GAP_MAX);
  const buttonHeight = Math.max(
    TUNING.buttonMinCssPt,
    clamp(width * 0.12, TUNING.buttonMinCssPt, 56),
  );

  const usableWidth = Math.min(width - pad * 2, width * TUNING.boardMaxWidthRatio);
  const contentTop = pad + headerHeight + gap;
  const contentBottom = height - pad - buttonHeight - gap;
  const contentHeight = Math.max(0, contentBottom - contentTop);

  let cell = Math.max(
    0,
    Math.min(usableWidth / board.width, contentHeight / board.height),
  );

  // `cellMinCssPt` é alvo de toque: quando a tela comporta, a célula não fica
  // abaixo dele. Em shells estreitos (907×510, 320×568) o piso assume e a
  // margem lateral fica no mínimo que a largura permite.
  const minCell = TUNING.cellMinCssPt;

  if (
    cell > 0 &&
    cell < minCell &&
    minCell * board.width <= width - 2 &&
    minCell * board.height <= contentHeight
  ) {
    cell = minCell;
  }

  const boardWidth = cell * board.width;
  const boardHeight = cell * board.height;
  const boardX = (width - boardWidth) / 2;
  const boardY = contentTop + Math.max(0, (contentHeight - boardHeight) / 2);

  const buttonRowWidth = Math.max(0, usableWidth);
  const buttonRowX = (width - buttonRowWidth) / 2;
  const buttonY = height - pad - buttonHeight;
  const buttonWidth = Math.max(0, (buttonRowWidth - gap) / 2);

  return {
    width,
    height,
    header: { x: pad, y: pad, width: width - pad * 2, height: headerHeight },
    board: { x: boardX, y: boardY, width: boardWidth, height: boardHeight },
    columns: board.width,
    rows: board.height,
    cell,
    passButton: {
      x: buttonRowX,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    resetButton: {
      x: buttonRowX + buttonWidth + gap,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    headerFontSize: clamp(width * 0.034, 11, 15),
    buttonFontSize: clamp(buttonHeight * 0.3, 13, 17),
  };
}

/** Retângulo de uma célula em px CSS. */
export function cellRect(layout: SceneLayout, cell: CellPos): Rect {
  return {
    x: layout.board.x + cell.col * layout.cell,
    y: layout.board.y + cell.row * layout.cell,
    width: layout.cell,
    height: layout.cell,
  };
}

/** Centro de uma célula em px CSS. */
export function cellCenter(
  layout: SceneLayout,
  cell: CellPos,
): { readonly x: number; readonly y: number } {
  return {
    x: layout.board.x + (cell.col + 0.5) * layout.cell,
    y: layout.board.y + (cell.row + 0.5) * layout.cell,
  };
}

function containsPoint(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

/** Célula sob um ponto do canvas, ou `null` fora da grade. */
export function cellAtPoint(
  layout: SceneLayout,
  x: number,
  y: number,
): CellPos | null {
  if (
    layout.cell <= 0 ||
    x < layout.board.x ||
    x >= layout.board.x + layout.board.width ||
    y < layout.board.y ||
    y >= layout.board.y + layout.board.height
  ) {
    return null;
  }

  const col = Math.floor((x - layout.board.x) / layout.cell);
  const row = Math.floor((y - layout.board.y) / layout.cell);

  if (col < 0 || col >= layout.columns || row < 0 || row >= layout.rows) {
    return null;
  }

  return { col, row };
}

/** Botão do HUD sob um ponto do canvas, ou `null`. */
export function hudTargetAtPoint(
  layout: SceneLayout,
  x: number,
  y: number,
): HudTarget | null {
  if (containsPoint(layout.passButton, x, y)) {
    return 'pass';
  }

  if (containsPoint(layout.resetButton, x, y)) {
    return 'reset';
  }

  return null;
}
