import { describe, expect, it } from 'vitest';
import type { Piece, Rotation } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import {
  classifyAction,
  isAdvancing,
  rotatePieceCW,
  withRotatedPiece,
} from '../../src/core/actions';
import {
  board,
  EMPTY,
  entry,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainSetup,
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

  it('toque nulo: vazio, estação, entrada e fora da grade', () => {
    const game = makeGame(corridor());

    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(0, 0) }),
    ).toEqual({ kind: 'null', reason: 'empty' });
    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(4, 1) }),
    ).toEqual({ kind: 'null', reason: 'fixed' });
    expect(
      classifyAction(game.state, { kind: 'tap', cell: pos(0, 1) }),
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
