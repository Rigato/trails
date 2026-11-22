/**
 * r6 «O atalho do túnel» — testes da fase real 6 (faixa 2, sobe).
 *
 * O contrário da r5: o X é a rota segura (2 toques, 1 moeda) e o túnel é a
 * perfeita (3 toques, 5 moedas). Os dois CCW do canto direito são a
 * combinação do túnel.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R6_LEVEL } from '../../src/level/real/r6';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const TUNNEL: Action = { kind: 'tap', cell: pos(2, 6) };
const SAFE_CCW: Action = { kind: 'tap', cell: pos(3, 5), turn: 'ccw' };
const CORNER_CCW: Action = { kind: 'tap', cell: pos(6, 7), turn: 'ccw' };
const LAST_CCW: Action = { kind: 'tap', cell: pos(6, 3), turn: 'ccw' };
const Y_FOR_BLUE: Action = { kind: 'tap', cell: pos(5, 1) };

const SAFE: readonly Action[] = [
  SAFE_CCW,
  ...Array.from({ length: 5 }, () => PASS),
  Y_FOR_BLUE,
  ...Array.from({ length: 6 }, () => PASS),
];

const PERFECT: readonly Action[] = [
  TUNNEL,
  CORNER_CCW,
  LAST_CCW,
  ...Array.from({ length: 9 }, () => PASS),
];

const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 4) },
  Y_FOR_BLUE,
  ...Array.from({ length: 4 }, () => PASS),
];

function run(game: Game, actions: readonly Action[]): GameEvent[] {
  const events: GameEvent[] = [];

  for (const action of actions) {
    const result = game.apply(action);

    expect(result.advanced).toBe(true);
    events.push(...result.events);
  }

  return events;
}

describe('r6 «O atalho do túnel» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas; X, Ys e túnel simétrico', () => {
    expect(R6_LEVEL.board.width).toBe(7);
    expect(R6_LEVEL.board.height).toBe(8);
    expect(R6_LEVEL.lives).toBe(3);
    expect(R6_LEVEL.tutorial).toBe(false);
    expect(R6_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R6_LEVEL.board, pos(3, 4))?.kind).toBe('piece');
    expect(cellAt(R6_LEVEL.board, pos(3, 7))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(5, 7) },
    });
    expect(cellAt(R6_LEVEL.board, pos(5, 7))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(3, 7) },
    });
    expect(cellAt(R6_LEVEL.board, pos(2, 6))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R6_LEVEL.board, pos(5, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });

    const game = setup(R6_LEVEL);
    const blue = trainInState(game.state, 'blue');
    const green = trainInState(game.state, 'green');

    expect(cellAt(R6_LEVEL.board, pos(5, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });
    expect(cellAt(R6_LEVEL.board, pos(4, 4))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: green.color, shape: green.shape },
    });

    for (const train of R6_LEVEL.trains) {
      expect(cellAt(R6_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }
    for (const coin of R6_LEVEL.coins ?? []) {
      expect(cellAt(R6_LEVEL.board, coin)?.kind).toBe('piece');
    }
  });

  it('o primeiro quadro: o azul default morre na curva (3,5)', () => {
    const game = setup(R6_LEVEL);

    expect(game.prediction('blue', 24)?.stop).toEqual({
      kind: 'noExit',
      cell: pos(3, 5),
    });
    expect(game.prediction('green', 24)?.path).toEqual([
      pos(0, 4), pos(1, 4), pos(2, 4), pos(3, 4), pos(4, 4),
    ]);
  });
});

describe('r6 «O atalho do túnel» — dois andares de sucesso', () => {
  it('SEGURA: 13 ações, 3/3, 1/5 moedas', () => {
    const game = setup(R6_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(13);
    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([pos(3, 4)]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R6_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 12 ações, 3/3, 5/5 moedas; dois CCW no canto', () => {
    const game = setup(R6_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(12);
    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(5);
    expect(game.state.coinsCollected).toEqual(
      expect.arrayContaining([
        pos(2, 7), pos(3, 4), pos(6, 6), pos(6, 4), pos(6, 3),
      ]),
    );
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R6_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r6 «O atalho do túnel» — falhas e lost', () => {
  it('SEM O CCW (3,5): 2/3 no 5, 1 moeda', () => {
    const game = setup(R6_LEVEL);

    for (let index = 0; index < 5; index += 1) {
      game.apply(PASS);
    }

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(5);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toEqual([pos(3, 4)]);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('LOST: verde no 3, azul no 5/6 e vermelho no 6', () => {
    const game = setup(R6_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(0);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(3);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }
  });
});
