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

/**
 * Alvo de toque do HUD.
 *
 * `rotation` é o botão-ferramenta do seletor CW/CCW (D22/D25): alternar o
 * sentido é imediato e não passa pelo buffer. `list` é a saída para a lista de
 * fases (M2): abandona a run sem confirmar e sem tocar no save. `rescue` e
 * `surrender` só existem no prompt de não-vencível (M4/D28): resgatar o último
 * trem perdido ou desistir da run.
 */
export type HudTarget =
  | 'pass'
  | 'reset'
  | 'rotation'
  | 'list'
  | 'rescue'
  | 'surrender';

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
  /** «Passar turno» — extremidade esquerda da fileira inferior. */
  readonly passButton: Rect;
  /** «Recomeçar» — extremidade direita da fileira inferior. */
  readonly resetButton: Rect;
  /** Seletor CW/CCW compacto, entre os dois botões (D25). */
  readonly rotationButton: Rect;
  /**
   * «Resgatar · preço» — metade esquerda da fileira inferior no prompt de
   * não-vencível (D28). Só é desenhado/hit-testado nesse prompt; nos demais
   * estados a fileira é a de três alvos.
   */
  readonly rescueButton: Rect;
  /** «Desistir» — metade direita do prompt de não-vencível (D28). */
  readonly surrenderButton: Rect;
  /**
   * Glifo de volta para a lista, no canto esquerdo do cabeçalho (M2).
   *
   * O alvo tem no mínimo `buttonMinCssPt` (44 pt) e pode exceder a faixa do
   * cabeçalho — é o preço de manter o toque confortável sem engordar o header.
   */
  readonly listButton: Rect;
  readonly headerFontSize: number;
  readonly buttonFontSize: number;
}

/**
 * Layout da lista de fases (home do jogo, M2).
 *
 * Grade de 2 colunas; cada card é um alvo de toque de no mínimo 44 pt. Até 16
 * fases cabem sem scroll no shell 9:16 (8 linhas de cards).
 */
export interface PhaseListLayout {
  readonly width: number;
  readonly height: number;
  /** Faixa do título «Trails» + carteira. */
  readonly header: Rect;
  readonly columns: number;
  readonly rows: number;
  /** Rect de cada fase, na ordem de `PHASES`; o índice é o da fase. */
  readonly cards: readonly Rect[];
  readonly gap: number;
  readonly titleFontSize: number;
  readonly walletFontSize: number;
  readonly cardNumberFontSize: number;
  readonly cardNameFontSize: number;
  readonly cardRadius: number;
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

  // Fileira inferior: «Passar turno» | seletor CW/CCW | «Recomeçar» (D25),
  // preservando as posições que os dois botões já tinham. O seletor é
  // quadrado e compacto, mas nunca abaixo do alvo mínimo de toque
  // (`buttonHeight` já parte de `buttonMinCssPt`); os dois botões de texto
  // dividem o resto da largura.
  const buttonRowWidth = Math.max(0, usableWidth);
  const buttonRowX = (width - buttonRowWidth) / 2;
  const buttonY = height - pad - buttonHeight;
  const rotationWidth = buttonHeight;
  const buttonWidth = Math.max(
    0,
    (buttonRowWidth - rotationWidth - gap * 2) / 2,
  );
  const promptButtonWidth = Math.max(0, (buttonRowWidth - gap) / 2);

  // Glifo da lista: alvo quadrado de 44 pt ancorado no canto esquerdo do
  // cabeçalho. Em shells estreitos ele desce alguns pixels sobre a primeira
  // fileira do tabuleiro (o alvo manda mais que a faixa); em shells normais
  // fica inteiro na margem + cabeçalho.
  const listSize = Math.max(TUNING.buttonMinCssPt, headerHeight * 1.6);
  const listButton: Rect = {
    x: pad,
    y: Math.max(0, pad + headerHeight / 2 - listSize / 2),
    width: listSize,
    height: listSize,
  };

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
    rotationButton: {
      x: buttonRowX + buttonWidth + gap,
      y: buttonY,
      width: rotationWidth,
      height: buttonHeight,
    },
    resetButton: {
      x: buttonRowX + buttonWidth + gap + rotationWidth + gap,
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
    },
    rescueButton: {
      x: buttonRowX,
      y: buttonY,
      width: promptButtonWidth,
      height: buttonHeight,
    },
    surrenderButton: {
      x: buttonRowX + promptButtonWidth + gap,
      y: buttonY,
      width: promptButtonWidth,
      height: buttonHeight,
    },
    listButton,
    headerFontSize: clamp(width * 0.034, 11, 15),
    buttonFontSize: clamp(buttonHeight * 0.3, 13, 17),
  };
}

/**
 * Calcula a lista de fases para um canvas `width`×`height` px CSS.
 *
 * A grade é sempre 2 colunas (card largo o bastante para número + nome +
 * selo/cadeado). O cabeçalho é uma faixa própria, mais alta que o do jogo,
 * porque carrega o título e a carteira. O vão entre cards é o mesmo nos dois
 * eixos; o cálculo cabe 16 fases sem scroll no shell portrait de 320×568.
 */
export function computePhaseListLayout(
  width: number,
  height: number,
  phaseCount: number,
): PhaseListLayout {
  const pad = clamp(width * 0.04, PAD_MIN, PAD_MAX);
  const gap = clamp(width * 0.028, 7, 14);
  const headerHeight = clamp(width * 0.1, 38, 56);
  const header: Rect = {
    x: pad,
    y: pad,
    width: width - pad * 2,
    height: headerHeight,
  };
  const columns = 2;
  const count = Math.max(0, Math.trunc(phaseCount));
  const rows = Math.max(1, Math.ceil(count / columns));
  const contentTop = header.y + header.height + gap;
  const availableHeight = Math.max(0, height - pad - contentTop);
  const cardHeight = Math.max(
    TUNING.buttonMinCssPt,
    (availableHeight - gap * (rows - 1)) / rows,
  );
  const cardWidth = Math.max(
    TUNING.buttonMinCssPt,
    (header.width - gap * (columns - 1)) / columns,
  );
  const cards: Rect[] = [];

  for (let index = 0; index < count; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;

    cards.push({
      x: header.x + column * (cardWidth + gap),
      y: contentTop + row * (cardHeight + gap),
      width: cardWidth,
      height: cardHeight,
    });
  }

  return {
    width,
    height,
    header,
    columns,
    rows,
    cards,
    gap,
    titleFontSize: clamp(headerHeight * 0.56, 20, 30),
    walletFontSize: clamp(headerHeight * 0.42, 15, 22),
    cardNumberFontSize: clamp(cardHeight * 0.34, 18, 30),
    cardNameFontSize: clamp(cardHeight * 0.19, 10, 14),
    cardRadius: Math.max(8, Math.min(14, cardHeight * 0.18)),
  };
}

/** Índice do card de fase sob um ponto da lista, ou `null`. */
export function phaseCardAtPoint(
  layout: PhaseListLayout,
  x: number,
  y: number,
): number | null {
  for (const [index, card] of layout.cards.entries()) {
    if (containsPoint(card, x, y)) {
      return index;
    }
  }

  return null;
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
  options?: { readonly rescuePrompt?: boolean },
): HudTarget | null {
  if (containsPoint(layout.listButton, x, y)) {
    return 'list';
  }

  // No prompt de não-vencível (D28) a fileira inferior é só
  // resgatar/desistir; os três alvos normais estão cobertos por ela.
  if (options?.rescuePrompt === true) {
    if (containsPoint(layout.rescueButton, x, y)) {
      return 'rescue';
    }

    if (containsPoint(layout.surrenderButton, x, y)) {
      return 'surrender';
    }

    return null;
  }

  if (containsPoint(layout.passButton, x, y)) {
    return 'pass';
  }

  if (containsPoint(layout.resetButton, x, y)) {
    return 'reset';
  }

  if (containsPoint(layout.rotationButton, x, y)) {
    return 'rotation';
  }

  return null;
}
