import { describe, expect, it } from 'vitest';
import type { Piece, Rotation, YPiece } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import {
  classifyAction,
  isAdvancing,
  rotatePieceCW,
  togglePieceArm,
  withRotatedPiece,
} from '../../src/core/actions';
import {
  board,
  EMPTY,
  entry,
  gameState,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainSetup,
  y,
} from './helpers';

/** Corredor de 5×3: entrada a oeste, 3 retas e estação a leste. */
function corridor(firstRot: Rotation = 1) {
  return makeLevel(
    'corridor',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [entry('east'), straight(firstRot), straight(1), straight(1), station(RED)],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 1))],
  );
}

describe('rotatePieceCW', () => {
  it('gira a reta 90° CW nos quatro estados', () => {
    let piece: Piece = { kind: 'straight', rot: 0 };

    for (const expected of [1, 2, 3, 0] as const) {
      piece = rotatePieceCW(piece);
      expect(piece).toEqual({ kind: 'straight', rot: expected });
    }
  });

  it('gira a curva 90° CW nos quatro estados', () => {
    let piece: Piece = { kind: 'curve', rot: 0 };

    for (const expected of [1, 2, 3, 0] as const) {
      piece = rotatePieceCW(piece);
      expect(piece).toEqual({ kind: 'curve', rot: expected });
    }
  });

  it('gira o Y preservando o braço e voltando next para toggle', () => {
    const piece: YPiece = { kind: 'y', rot: 2, arm: 1, next: 'rotate' };

    expect(rotatePieceCW(piece)).toEqual({
      kind: 'y',
      rot: 3,
      arm: 1,
      next: 'toggle',
    });
  });
});

describe('togglePieceArm', () => {
  it('alterna o braço 0↔1 e agenda rotate', () => {
    const piece: YPiece = { kind: 'y', rot: 1, arm: 0, next: 'toggle' };

    expect(togglePieceArm(piece)).toEqual({
      kind: 'y',
      rot: 1,
      arm: 1,
      next: 'rotate',
    });
    expect(togglePieceArm({ ...piece, arm: 1 })).toEqual({
      kind: 'y',
      rot: 1,
      arm: 0,
      next: 'rotate',
    });
  });
});

describe('ABAB por peça (D8)', () => {
  it('1º toque troca, 2º gira, alternando para sempre', () => {
    const cell = pos(0, 0);
    let state = gameState(board([[y(0, 0, 'toggle')]]), []);
    const expectedKinds = ['toggled', 'rotated', 'toggled', 'rotated'];
    const expectedPieces = [
      { kind: 'y', rot: 0, arm: 1, next: 'rotate' },
      { kind: 'y', rot: 1, arm: 1, next: 'toggle' },
      { kind: 'y', rot: 1, arm: 0, next: 'rotate' },
      { kind: 'y', rot: 2, arm: 0, next: 'toggle' },
    ];

    for (let tap = 0; tap < 4; tap += 1) {
      const outcome = classifyAction(state, { kind: 'tap', cell });

      expect(outcome.kind).toBe(expectedKinds[tap]);
      expect(isAdvancing(outcome)).toBe(true);

      if (outcome.kind !== 'toggled' && outcome.kind !== 'rotated') {
        throw new Error('esperava toggled/rotated');
      }

      expect(outcome.to).toEqual(expectedPieces[tap]);
      state = {
        ...state,
        board: withRotatedPiece(state.board, cell, outcome.to),
      };
    }
  });

  it('dois Ys têm alternâncias independentes', () => {
    const cellA = pos(0, 0);
    const cellB = pos(1, 0);
    let state = gameState(
      board([[y(0, 0, 'toggle'), y(0, 0, 'toggle')]]),
      [],
    );

    const first = classifyAction(state, { kind: 'tap', cell: cellA });

    expect(first.kind).toBe('toggled');

    if (first.kind !== 'toggled') {
      throw new Error('esperava toggled em A');
    }

    state = {
      ...state,
      board: withRotatedPiece(state.board, cellA, first.to),
    };

    // B não foi tocado: continua arm 0 / next toggle.
    expect(cellAt(state.board, cellB)).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 0, arm: 0, next: 'toggle' },
    });

    const second = classifyAction(state, { kind: 'tap', cell: cellB });

    expect(second.kind).toBe('toggled');

    if (second.kind !== 'toggled') {
      throw new Error('esperava toggled em B');
    }

    state = {
      ...state,
      board: withRotatedPiece(state.board, cellB, second.to),
    };

    // A manteve o resultado do primeiro toque.
    expect(cellAt(state.board, cellA)).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 0, arm: 1, next: 'rotate' },
    });
  });
});

describe('withRotatedPiece', () => {
  it('produz um board novo e não muta o original', () => {
    const cells = board([
      [EMPTY, EMPTY],
      [EMPTY, straight(0)],
    ]);
    const rotated = withRotatedPiece(cells, pos(1, 1), {
      kind: 'straight',
      rot: 1,
    });

    expect(cellAt(rotated, pos(1, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
    expect(cellAt(cells, pos(1, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 0 },
    });
    expect(rotated).not.toBe(cells);
  });

  it('lança quando a célula não tem peça', () => {
    const cells = board([[EMPTY]]);

    expect(() =>
      withRotatedPiece(cells, pos(0, 0), { kind: 'straight', rot: 1 }),
    ).toThrow(/peça/);
  });
});

describe('classifyAction', () => {
  it('toque em peça livre é giro e não aplica o passo sozinho', () => {
    const game = makeGame(corridor(0));
    const outcome = classifyAction(game.state, {
      kind: 'tap',
      cell: pos(1, 1),
    });

    expect(outcome).toEqual({
      kind: 'rotated',
      cell: pos(1, 1),
      from: { kind: 'straight', rot: 0 },
      to: { kind: 'straight', rot: 1 },
    });
    expect(isAdvancing(outcome)).toBe(true);
    expect(game.state.step).toBe(0);
  });

  it('passar turno é ação válida', () => {
    const game = makeGame(corridor());
    const outcome = classifyAction(game.state, { kind: 'pass' });

    expect(outcome).toEqual({ kind: 'passed' });
    expect(isAdvancing(outcome)).toBe(true);
  });

  it('toque nulo: vazio, estação e fora da grade', () => {
    const game = makeGame(corridor());

    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(0, 0) }),
    ).toEqual({ kind: 'null', reason: 'empty' });
    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(4, 1) }),
    ).toEqual({ kind: 'null', reason: 'fixed' });
    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(-1, 0) }),
    ).toEqual({ kind: 'null', reason: 'outOfBounds' });
  });

  it('célula ocupada pelo trem é bloqueada', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' });
    const atEntry = classifyAction(game.state, {
      kind: 'tap',
      cell: pos(0, 1),
    });

    expect(atEntry).toEqual({ kind: 'blocked', reason: 'train' });
    expect(isAdvancing(atEntry)).toBe(false);

    game.apply({ kind: 'pass' });
    const atPiece = classifyAction(game.state, {
      kind: 'tap',
      cell: pos(1, 1),
    });

    expect(atPiece).toEqual({ kind: 'blocked', reason: 'train' });
    expect(isAdvancing(atPiece)).toBe(false);
  });

  it('depois do fim, qualquer ação é ignorada', () => {
    const game = makeGame(corridor());

    for (let step = 0; step < 5; step += 1) {
      game.apply({ kind: 'pass' });
    }

    expect(game.state.status).toBe('won');

    const pass = classifyAction(game.state, { kind: 'pass' });
    const tap = classifyAction(game.state, {
      kind: 'tap',
      cell: pos(1, 1),
    });

    expect(pass).toEqual({ kind: 'ignored', reason: 'finished' });
    expect(tap).toEqual({ kind: 'ignored', reason: 'finished' });
    expect(isAdvancing(pass)).toBe(false);
    expect(isAdvancing(tap)).toBe(false);
  });
});
