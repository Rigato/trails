/**
 * Orquestração do motor: setup(layout) → apply(action) → estado.
 *
 * O layout é validado uma vez no setup. O estado é imutável por convenção:
 * cada ação válida produz um novo `GameState`; a fachada só guarda o snapshot
 * atual. `reset()` recria o estado inicial a partir do mesmo layout.
 */

import type {
  Action,
  ApplyResult,
  Board,
  CellPos,
  Direction,
  Game,
  GameEvent,
  GameState,
  LevelLayout,
  Train,
} from './types';
import { cellAt, cellKey, inBounds, neighbor } from './types';
import {
  classifyAction,
  isAdvancing,
  withRotatedPiece,
} from './actions';
import { predictPath } from './prediction';
import { resolveStep } from './step';

/**
 * A entrada está na borda e aponta para dentro?
 *
 * Exige uma direção perpendicular a uma borda em que a célula encosta e um
 * vizinho dentro da grade. Uma entrada de canto aceita as duas perpendiculares
 * internas (ex.: canto noroeste aceita `east` ou `south`).
 */
function pointsInward(
  board: Board,
  cell: CellPos,
  direction: Direction,
): boolean {
  const next = neighbor(cell, direction);

  if (!inBounds(board, next)) {
    return false;
  }

  if (cell.col === 0 && direction === 'east') {
    return true;
  }

  if (cell.col === board.width - 1 && direction === 'west') {
    return true;
  }

  if (cell.row === 0 && direction === 'south') {
    return true;
  }

  if (cell.row === board.height - 1 && direction === 'north') {
    return true;
  }

  return false;
}

/**
 * Valida as invariantes do dado da fase.
 *
 * Cobre o que o motor assume: linhas do tamanho certo, ao menos um trem,
 * IDs únicos, primeira célula de entrada dentro da grade, na borda, apontando
 * para dentro e contendo uma peça de trilho, e uma célula de entrada distinta
 * por trem. Regras de design (uma estação por cor, etc.) ficam com o layout,
 * não com o motor.
 */
export function validateLayout(layout: LevelLayout): void {
  const { board } = layout;

  if (
    !Number.isInteger(board.width) ||
    board.width <= 0 ||
    !Number.isInteger(board.height) ||
    board.height <= 0
  ) {
    throw new Error(
      'Layout inválido: width/height do board devem ser inteiros positivos.',
    );
  }

  if (board.rows.length !== board.height) {
    throw new Error(
      `Layout inválido: esperado ${board.height} linhas, recebido ${board.rows.length}.`,
    );
  }

  for (let row = 0; row < board.rows.length; row += 1) {
    const cells = board.rows[row];

    if (cells === undefined || cells.length !== board.width) {
      throw new Error(
        `Layout inválido: linha ${row} deve ter ${board.width} células.`,
      );
    }
  }

  if (
    layout.lives !== undefined &&
    (!Number.isInteger(layout.lives) || layout.lives < 1)
  ) {
    throw new Error(
      'Layout inválido: lives deve ser um inteiro ≥ 1 quando presente.',
    );
  }

  if (layout.trains.length === 0) {
    throw new Error('Layout inválido: a fase precisa de ao menos um trem.');
  }

  const ids = new Set<string>();
  const entries = new Set<string>();

  for (const trainSetup of layout.trains) {
    if (ids.has(trainSetup.id)) {
      throw new Error(
        `Layout inválido: id de trem duplicado "${trainSetup.id}".`,
      );
    }

    ids.add(trainSetup.id);

    if (!inBounds(board, trainSetup.entry.cell)) {
      throw new Error(
        `Layout inválido: entrada do trem "${trainSetup.id}" está fora da grade.`,
      );
    }

    const entryCell = cellAt(board, trainSetup.entry.cell);

    if (entryCell === undefined || entryCell.kind !== 'piece') {
      throw new Error(
        `Layout inválido: a primeira célula da entrada do trem "${trainSetup.id}" precisa conter uma peça de trilho.`,
      );
    }

    if (
      !pointsInward(
        board,
        trainSetup.entry.cell,
        trainSetup.entry.direction,
      )
    ) {
      throw new Error(
        `Layout inválido: a entrada do trem "${trainSetup.id}" precisa estar na borda e apontar para dentro.`,
      );
    }

    const key = cellKey(trainSetup.entry.cell);

    if (entries.has(key)) {
      throw new Error(
        `Layout inválido: dois trens usam a mesma entrada (${trainSetup.entry.cell.col},${trainSetup.entry.cell.row}).`,
      );
    }

    entries.add(key);
  }
}

/** Cria o snapshot inicial: todos os trens `waiting`, fora da grade. */
function makeInitialState(layout: LevelLayout): GameState {
  const trains = layout.trains.map((trainSetup): Train => ({
    id: trainSetup.id,
    color: trainSetup.color,
    shape: trainSetup.shape,
    status: {
      kind: 'waiting',
      cell: trainSetup.entry.cell,
      direction: trainSetup.entry.direction,
    },
  }));

  return {
    levelId: layout.id,
    board: layout.board,
    trains,
    lives: layout.lives ?? null,
    step: 0,
    status: 'ready',
  };
}

/** Aplica uma ação a um snapshot, produzindo o snapshot posterior. */
function applyToState(state: GameState, action: Action): ApplyResult {
  const outcome = classifyAction(state, action);

  if (!isAdvancing(outcome)) {
    return {
      action,
      outcome,
      advanced: false,
      state,
      events: [],
    };
  }

  const events: GameEvent[] = [];
  let board = state.board;

  if (outcome.kind === 'rotated' || outcome.kind === 'toggled') {
    board = withRotatedPiece(board, outcome.cell, outcome.to);

    if (outcome.kind === 'toggled') {
      events.push({
        kind: 'pieceToggled',
        cell: outcome.cell,
        from: outcome.from,
        to: outcome.to,
      });
    } else {
      events.push({
        kind: 'pieceRotated',
        cell: outcome.cell,
        from: outcome.from,
        to: outcome.to,
      });
    }
  }

  const resolution = resolveStep({ ...state, board });
  events.push(...resolution.events);

  return {
    action,
    outcome,
    advanced: true,
    state: resolution.state,
    events,
  };
}

/**
 * Fabrica o motor para uma fase.
 *
 * `layout` é validado aqui; um layout inválido lança com mensagem clara. A
 * fachada devolve o snapshot atual em `state`, aplica ações com `apply`,
 * calcula previsões com `prediction` e restaura o início com `reset`.
 */
export function setup(layout: LevelLayout): Game {
  validateLayout(layout);

  let state = makeInitialState(layout);

  return {
    get state() {
      return state;
    },

    apply(action) {
      const result = applyToState(state, action);
      state = result.state;
      return result;
    },

    prediction(trainId, maxSteps) {
      const train = state.trains.find((candidate) => candidate.id === trainId);

      if (train === undefined) {
        return undefined;
      }

      return predictPath(state.board, train, maxSteps);
    },

    reset() {
      state = makeInitialState(layout);
      return state;
    },
  };
}
