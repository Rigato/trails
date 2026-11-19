/**
 * Classificação de ações e mutação de peças do core.
 *
 * Este módulo traduz a entrada bruta do jogador (`Action`) na classificação
 * do GDD §3.2–§3.3. Um toque nulo ou bloqueado não é ação: não avança passo.
 * O giro de uma peça livre é ação válida e produz um novo `Board` imutável;
 * `game.ts` usa esse board para resolver o passo.
 */

import type {
  Action,
  ActionOutcome,
  Board,
  Cell,
  CellPos,
  GameState,
  Piece,
  Rotation,
  Train,
  YPiece,
} from './types';
import { cellAt, cellsEqual, inBounds } from './types';

/** Próxima rotação CW: 0→1→2→3→0. */
const NEXT_ROTATION: Readonly<Record<Rotation, Rotation>> = {
  0: 1,
  1: 2,
  2: 3,
  3: 0,
};

/**
 * Gira uma peça 90° no sentido horário.
 *
 * Reta, curva e Y compartilham a aritmética de `rot`; no Y o braço é preservado
 * e `next` volta para `'toggle'` (o toque foi um giro). A escolha ABAB entre
 * girar e trocar o braço fica em `classifyTap`/`togglePieceArm`.
 */
export function rotatePieceCW(piece: Piece): Piece {
  const rot = NEXT_ROTATION[piece.rot];

  switch (piece.kind) {
    case 'straight':
      return { kind: 'straight', rot };
    case 'curve':
      return { kind: 'curve', rot };
    case 'y':
      return {
        kind: 'y',
        rot,
        arm: piece.arm,
        next: 'toggle',
      };
  }
}

/**
 * Troca a ponta ativa do Y (ABAB/D8): o braço relativo Alterna 0↔1 e a próxima
 * ação passa a ser `'rotate'`. O `rot` não muda.
 */
export function togglePieceArm(piece: YPiece): YPiece {
  return {
    kind: 'y',
    rot: piece.rot,
    arm: piece.arm === 0 ? 1 : 0,
    next: 'rotate',
  };
}

/** Trem `running` que ocupa `cell`, se houver. Trem `waiting` não ocupa. */
export function runningTrainAt(state: GameState, cell: CellPos): Train | undefined {
  return state.trains.find(
    (train) => train.status.kind === 'running' && cellsEqual(train.status.cell, cell),
  );
}

/** O jogo terminou (vitória, estado não-vencível de D1 ou derrota D7/D11)? */
function isFinished(state: GameState): boolean {
  return (
    state.status === 'won' ||
    state.status === 'deadEnd' ||
    state.status === 'lost'
  );
}

/**
 * Classifica um toque.
 *
 * Ordem de checagem:
 * 1. jogo terminado → `ignored` (a UI oferece recomeço);
 * 2. fora da grade → `null/outOfBounds`;
 * 3. célula ocupada por trem → `blocked/train` (§3.2);
 * 4. vazio → `null/empty`; elemento fixo → `null/fixed`;
 * 5. peça livre → `rotated` ou `toggled`, com a peça antes/depois. No Y, o
 *    ABAB por peça decide: `next === 'toggle'` troca o braço; `next ===
 *    'rotate'` gira 90° CW.
 */
export function classifyTap(state: GameState, cell: CellPos): ActionOutcome {
  if (isFinished(state)) {
    return { kind: 'ignored', reason: 'finished' };
  }

  if (!inBounds(state.board, cell)) {
    return { kind: 'null', reason: 'outOfBounds' };
  }

  if (runningTrainAt(state, cell) !== undefined) {
    return { kind: 'blocked', reason: 'train' };
  }

  const content = cellAt(state.board, cell);

  if (content === undefined) {
    return { kind: 'null', reason: 'outOfBounds' };
  }

  if (content.kind === 'empty') {
    return { kind: 'null', reason: 'empty' };
  }

  if (content.kind === 'fixed') {
    return { kind: 'null', reason: 'fixed' };
  }

  const piece = content.piece;

  if (piece.kind === 'y' && piece.next === 'toggle') {
    return {
      kind: 'toggled',
      cell,
      from: piece,
      to: togglePieceArm(piece),
    };
  }

  return {
    kind: 'rotated',
    cell,
    from: piece,
    to: rotatePieceCW(piece),
  };
}

/**
 * Classifica uma ação do jogador.
 *
 * `pass` é sempre uma ação válida enquanto o jogo não terminou. Um `tap` passa
 * pela classificação de `classifyTap`. `rotated`, `toggled` e `passed` avançam
 * exatamente um passo; o buffer revalida a ação aplicando-a no momento de
 * drenar (D4).
 */
export function classifyAction(state: GameState, action: Action): ActionOutcome {
  if (isFinished(state)) {
    return { kind: 'ignored', reason: 'finished' };
  }

  switch (action.kind) {
    case 'tap':
      return classifyTap(state, action.cell);
    case 'pass':
      return { kind: 'passed' };
  }
}

/** A classificação é uma ação válida que avança exatamente um passo? */
export function isAdvancing(outcome: ActionOutcome): boolean {
  return (
    outcome.kind === 'rotated' ||
    outcome.kind === 'toggled' ||
    outcome.kind === 'passed'
  );
}

/**
 * Devolve um novo `Board` com a peça de `cell` substituída por `piece`.
 *
 * O board anterior não é mutado. Só a linha afetada é recriada; as demais
 * linhas são compartilhadas. Aceita giro e troca de braço do Y. Lança se a
 * célula não contiver peça (o chamador só usa isto depois de uma classificação
 * `rotated`/`toggled`).
 */
export function withRotatedPiece(board: Board, cell: CellPos, piece: Piece): Board {
  const current: Cell | undefined = cellAt(board, cell);

  if (current === undefined || current.kind !== 'piece') {
    throw new Error(`withRotatedPiece: a célula (${cell.col},${cell.row}) não tem peça`);
  }

  const rows: readonly (readonly Cell[])[] = board.rows.map((row, rowIndex) => {
    if (rowIndex !== cell.row) {
      return row;
    }

    return row.map((content, colIndex) =>
      colIndex === cell.col ? { kind: 'piece', piece } : content,
    );
  });

  return { ...board, rows };
}
