/**
 * r10 «A combinação total» — testes da fase real 10 (faixa 3, sobe).
 *
 * A r9 com a curva (2,5) torta no caminho do X: a rota segura precisa de três
 * consertos (2,5 CW, 3,5 CCW, Y) e o túnel de três (bifurcação, 6,7 CCW,
 * 6,3 CCW). Nenhuma rota vence por omissão.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R10_LEVEL } from '../../src/level/real/r10';
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
const FIRST_FIX: Action = { kind: 'tap', cell: pos(2, 5) };
const SAFE_CCW: Action = { kind: 'tap', cell: pos(3, 5), turn: 'ccw' };
const CORNER_CCW: Action = { kind: 'tap', cell: pos(6, 7), turn: 'ccw' };
const LAST_CCW: Action = { kind: 'tap', cell: pos(6, 3), turn: 'ccw' };
const Y_FOR_BLUE: Action = { kind: 'tap', cell: pos(5, 1) };

const SAFE: readonly Action[] = [
  FIRST_FIX,
  SAFE_CCW,
  ...Array.from({ length: 5 }, () => PASS),
  Y_FOR_BLUE,
  ...Array.from({ length: 5 }, () => PASS),
];

const PERFECT: readonly Action[] = [
  TUNNEL,
  CORNER_CCW,
  LAST_CCW,
  ...Array.from({ length: 9 }, () => PASS),
];

const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(1, 4) },
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

describe('r10 «A combinação total» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas; (2,5) nasce torta', () => {
    expect(R10_LEVEL.board.width).toBe(7);
    expect(R10_LEVEL.board.height).toBe(8);
    expect(R10_LEVEL.lives).toBe(3);
    expect(R10_LEVEL.tutorial).toBe(false);
    expect(R10_LEVEL.trains).toHaveLength(3);
    expect(cellAt(R10_LEVEL.board, pos(2, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 0 },
    });

    const game = setup(R10_LEVEL);

    expect(game.prediction('blue', 24)?.stop).toEqual({
      kind: 'noExit',
      cell: pos(2, 5),
    });
  });
});

describe('r10 «A combinação total» — dois andares de sucesso', () => {
  it('SEGURA: 13 ações, 3/3, 2/6 moedas; três consertos', () => {
    const game = setup(R10_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(2);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R10_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 12 ações, 3/3, 6/6 moedas; túnel com três consertos', () => {
    const game = setup(R10_LEVEL);
    const events = run(game, PERFECT);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(6);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R10_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r10 «A combinação total» — falhas e lost', () => {
  it('SEM (2,5): o azul morre na primeira curva; 2/3', () => {
    const game = setup(R10_LEVEL);

    for (let index = 0; index < 6; index += 1) {
      game.apply(PASS);
    }

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('LOST: verde no 3, azul no 4/5 e vermelho no 6', () => {
    const game = setup(R10_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
  });
});
