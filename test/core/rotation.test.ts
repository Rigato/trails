import { describe, expect, it } from 'vitest';
import type { Board, CellPos, Piece } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import {
  classifyAction,
  classifyTap,
  isAdvancing,
  rotatePiece,
  rotatePieceCW,
  withRotatedPiece,
} from '../../src/core/actions';
import { ActionBuffer } from '../../src/core/buffer';
import { PHASES } from '../../src/level';
import {
  board,
  crossing,
  EMPTY,
  entry,
  gameState,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainById,
  trainSetup,
  y,
} from './helpers';

/** Corredor de 5×3: entrada a oeste, 3 retas e estação a leste. */
function corridor() {
  return makeLevel(
    'corridor',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [entry('east'), straight(1), straight(1), straight(1), station(RED)],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 1))],
  );
}

/**
 * Corredor com duas retas livres na linha 0, fora da rota do trem: dá para
 * enfileirar dois giros sem que a animação/passo os torne inválidos.
 */
function decoyCorridor() {
  return makeLevel(
    'rotation-buffer',
    board([
      [straight(0), straight(0), EMPTY, EMPTY, EMPTY],
      [entry('east'), straight(1), straight(1), straight(1), station(RED)],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 1))],
  );
}

/** Primeira peça straight/curve (girável) de um tabuleiro publicado. */
function firstRotatable(cells: Board): CellPos {
  for (let row = 0; row < cells.rows.length; row += 1) {
    const line = cells.rows[row];

    if (line === undefined) {
      continue;
    }

    for (let col = 0; col < line.length; col += 1) {
      const content = line[col];

      if (
        content?.kind === 'piece' &&
        (content.piece.kind === 'straight' || content.piece.kind === 'curve')
      ) {
        return { col, row };
      }
    }
  }

  throw new Error('Tabuleiro sem peça straight/curve para o teste de rajada.');
}

describe('rotatePiece — CCW (D22)', () => {
  it('gira a reta 90° CCW nos quatro estados', () => {
    let piece: Piece = { kind: 'straight', rot: 0 };

    for (const expected of [3, 2, 1, 0] as const) {
      piece = rotatePiece(piece, 'ccw');
      expect(piece).toEqual({ kind: 'straight', rot: expected });
    }
  });

  it('gira a curva 90° CCW nos quatro estados', () => {
    let piece: Piece = { kind: 'curve', rot: 0 };

    for (const expected of [3, 2, 1, 0] as const) {
      piece = rotatePiece(piece, 'ccw');
      expect(piece).toEqual({ kind: 'curve', rot: expected });
    }
  });

  it('gira o Y CCW preservando o braço e voltando next para toggle', () => {
    let piece: Piece = { kind: 'y', rot: 0, arm: 1, next: 'rotate' };

    for (const expected of [3, 2, 1, 0] as const) {
      piece = rotatePiece(piece, 'ccw');

      expect(piece).toEqual({
        kind: 'y',
        rot: expected,
        arm: 1,
        next: 'toggle',
      });

      if (piece.kind !== 'y') {
        throw new Error('esperava Y após o giro');
      }

      piece = { ...piece, next: 'rotate' };
    }
  });

  it('CW continua inalterado (default e rotatePieceCW)', () => {
    const piece: Piece = { kind: 'curve', rot: 0 };

    expect(rotatePiece(piece)).toEqual({ kind: 'curve', rot: 1 });
    expect(rotatePiece(piece, 'cw')).toEqual(rotatePieceCW(piece));
  });
});

describe('classifyTap/classifyAction — turn', () => {
  it('classifyTap com ccw gira para trás; sem turn continua cw', () => {
    const cell = pos(0, 0);
    const state = gameState(board([[straight(0)]]), []);

    expect(classifyTap(state, cell)).toEqual({
      kind: 'rotated',
      cell,
      from: { kind: 'straight', rot: 0 },
      to: { kind: 'straight', rot: 1 },
    });
    expect(classifyTap(state, cell, 'ccw')).toEqual({
      kind: 'rotated',
      cell,
      from: { kind: 'straight', rot: 0 },
      to: { kind: 'straight', rot: 3 },
    });
  });

  it('classifyAction usa o turn da ação', () => {
    const cell = pos(0, 0);
    const state = gameState(board([[straight(0)]]), []);
    const outcome = classifyAction(state, { kind: 'tap', cell, turn: 'ccw' });

    expect(outcome).toEqual({
      kind: 'rotated',
      cell,
      from: { kind: 'straight', rot: 0 },
      to: { kind: 'straight', rot: 3 },
    });
  });
});

describe('Y ABAB com seletor (D26)', () => {
  it('toggle ignora o seletor; o giro do ABAB usa o turn; next alterna como antes', () => {
    const cell = pos(0, 0);
    let state = gameState(board([[y(0, 0, 'toggle')]]), []);
    const turns = ['ccw', 'ccw', 'cw', 'ccw'] as const;
    const expected = [
      { kind: 'toggled', piece: { kind: 'y', rot: 0, arm: 1, next: 'rotate' } },
      { kind: 'rotated', piece: { kind: 'y', rot: 3, arm: 1, next: 'toggle' } },
      { kind: 'toggled', piece: { kind: 'y', rot: 3, arm: 0, next: 'rotate' } },
      { kind: 'rotated', piece: { kind: 'y', rot: 2, arm: 0, next: 'toggle' } },
    ] as const;

    for (let tap = 0; tap < turns.length; tap += 1) {
      const outcome = classifyAction(state, {
        kind: 'tap',
        cell,
        turn: turns[tap],
      });
      const step = expected[tap];

      if (step === undefined) {
        throw new Error('esperava um passo do ABAB');
      }

      expect(outcome.kind).toBe(step.kind);

      if (outcome.kind !== 'toggled' && outcome.kind !== 'rotated') {
        throw new Error('esperava toggled/rotated no Y');
      }

      // O toggle nunca muda rot; o giro do ABAB obedece ao turn da ação.
      expect(outcome.to).toEqual(step.piece);
      state = {
        ...state,
        board: withRotatedPiece(state.board, cell, outcome.to),
      };
    }
  });
});

describe('Buffer — sentido capturado no enqueue (D4/D26)', () => {
  it('rajada com sentidos misturados mantém o turn de cada ação no dreno', () => {
    const game = makeGame(decoyCorridor());
    const buffer = new ActionBuffer();

    // O seletor estava em CCW no primeiro toque e em CW no segundo; o dreno
    // acontece depois, com os dois sentidos já capturados nas ações.
    buffer.enqueue({ kind: 'tap', cell: pos(0, 0), turn: 'ccw' });
    buffer.enqueue({ kind: 'tap', cell: pos(1, 0), turn: 'cw' });

    const results = buffer.drain(game.apply);

    expect(results).toHaveLength(2);
    expect(results[0]?.action).toEqual({
      kind: 'tap',
      cell: pos(0, 0),
      turn: 'ccw',
    });
    expect(results[1]?.action).toEqual({
      kind: 'tap',
      cell: pos(1, 0),
      turn: 'cw',
    });
    expect(results[0]?.advanced).toBe(true);
    expect(results[1]?.advanced).toBe(true);
    expect(cellAt(game.state.board, pos(0, 0))).toEqual(straight(3));
    expect(cellAt(game.state.board, pos(1, 0))).toEqual(straight(1));
    expect(game.state.step).toBe(2);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'east',
    });
    expect(buffer.isEmpty).toBe(true);
  });

  it('ação enfileirada que virou ocupada é descartada sem passo (mesmo ccw)', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' }); // trem na entrada

    const buffer = new ActionBuffer();

    buffer.enqueue({ kind: 'pass' }); // move o trem para (1,1)
    buffer.enqueue({ kind: 'tap', cell: pos(1, 1), turn: 'ccw' }); // vira ocupado

    const results = buffer.drain(game.apply);

    expect(results).toHaveLength(2);
    expect(results[0]?.advanced).toBe(true);
    expect(results[1]?.advanced).toBe(false);
    expect(results[1]?.outcome).toEqual({ kind: 'blocked', reason: 'train' });
    expect(game.state.step).toBe(2);
    expect(cellAt(game.state.board, pos(1, 1))).toEqual(straight(1));
    expect(buffer.isEmpty).toBe(true);
  });
});

describe('Toques sem passo com ccw', () => {
  it('vazio, elemento fixo e fora da grade com ccw não avançam', () => {
    const game = makeGame(corridor());

    const empty = game.apply({
      kind: 'tap',
      cell: pos(0, 0),
      turn: 'ccw',
    });
    const fixed = game.apply({
      kind: 'tap',
      cell: pos(4, 1),
      turn: 'ccw',
    });
    const outside = game.apply({
      kind: 'tap',
      cell: pos(-1, 0),
      turn: 'ccw',
    });

    expect(empty.advanced).toBe(false);
    expect(empty.outcome).toEqual({ kind: 'null', reason: 'empty' });
    expect(fixed.advanced).toBe(false);
    expect(fixed.outcome).toEqual({ kind: 'null', reason: 'fixed' });
    expect(outside.advanced).toBe(false);
    expect(outside.outcome).toEqual({ kind: 'null', reason: 'outOfBounds' });
    expect(game.state.step).toBe(0);
  });

  it('cruzamento com ccw continua toque nulo, sem passo', () => {
    const cell = pos(0, 0);
    const state = gameState(board([[crossing()]]), []);
    const outcome = classifyAction(state, { kind: 'tap', cell, turn: 'ccw' });

    expect(outcome).toEqual({ kind: 'null', reason: 'crossing' });
    expect(isAdvancing(outcome)).toBe(false);
    expect(state.step).toBe(0);
  });

  it('célula ocupada com ccw é bloqueada sem avançar', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' }); // trem pisa na entrada (0,1)

    const blocked = game.apply({
      kind: 'tap',
      cell: pos(0, 1),
      turn: 'ccw',
    });

    expect(blocked.advanced).toBe(false);
    expect(blocked.outcome).toEqual({ kind: 'blocked', reason: 'train' });
    expect(game.state.step).toBe(1);
    expect(cellAt(game.state.board, pos(0, 1))).toEqual(straight(1));
  });
});

describe('Rajada mista nos tabuleiros publicados', () => {
  it('cada giro aplica o próprio sentido em todas as fases da cadeia', () => {
    const turns = ['cw', 'ccw', 'ccw', 'cw'] as const;

    for (const level of PHASES) {
      const cell = firstRotatable(level.board);
      let state = gameState(level.board, []);

      for (const turn of turns) {
        const outcome = classifyAction(state, {
          kind: 'tap',
          cell,
          turn,
        });

        if (outcome.kind !== 'rotated') {
          throw new Error(
            `${level.id}: esperava rotated em (${cell.col},${cell.row}), veio ${outcome.kind}`,
          );
        }

        // CW anda +1 quarto; CCW anda +3 (= um quarto para trás).
        const delta = (outcome.to.rot - outcome.from.rot + 4) % 4;

        expect(delta).toBe(turn === 'cw' ? 1 : 3);
        state = {
          ...state,
          board: withRotatedPiece(state.board, cell, outcome.to),
        };
      }
    }
  });
});
