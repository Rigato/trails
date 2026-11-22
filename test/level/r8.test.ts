/**
 * r8 «O túnel da vez» — testes da fase real 8 (VALE da faixa 2).
 *
 * Todas as peças nascem certas: a escolha é pura (túnel em 12/1 moeda ou X+Y
 * em 13/5). O erro clássico é esquecer o Y (5,1) e mandar o azul para a
 * estação do vermelho; o `lost` usa o Y cedo + o Y de volta + o verde torto.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R8_LEVEL } from '../../src/level/real/r8';
import { sealCondition } from '../../src/save/economy';
import {
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const TUNNEL: Action = { kind: 'tap', cell: pos(2, 6) };
const Y_FOR_BLUE: Action = { kind: 'tap', cell: pos(5, 1) };

const SAFE: readonly Action[] = [
  TUNNEL,
  ...Array.from({ length: 11 }, () => PASS),
];

const PERFECT: readonly Action[] = [
  ...Array.from({ length: 5 }, () => PASS),
  Y_FOR_BLUE,
  ...Array.from({ length: 7 }, () => PASS),
];

const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 4) },
  Y_FOR_BLUE,
  ...Array.from({ length: 5 }, () => PASS),
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

describe('r8 «O túnel da vez» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas, fora do tutorial; peças na orientação certa', () => {
    expect(R8_LEVEL.board.width).toBe(7);
    expect(R8_LEVEL.board.height).toBe(8);
    expect(R8_LEVEL.lives).toBe(3);
    expect(R8_LEVEL.tutorial).toBe(false);
    expect(R8_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R8_LEVEL.board, pos(3, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });
    expect(cellAt(R8_LEVEL.board, pos(6, 7))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });
    expect(cellAt(R8_LEVEL.board, pos(6, 3))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 2 },
    });

    const game = setup(R8_LEVEL);

    expect(game.prediction('blue', 24)?.path).toEqual([
      pos(0, 6), pos(1, 6), pos(2, 6), pos(2, 5), pos(3, 5),
      pos(3, 4), pos(3, 3), pos(3, 2), pos(3, 1), pos(4, 1),
      pos(5, 1), pos(5, 0),
    ]);
  });
});

describe('r8 «O túnel da vez» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 1/5 moedas', () => {
    const game = setup(R8_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([pos(3, 4)]);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R8_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 13 ações, 3/3, 5/5 moedas', () => {
    const game = setup(R8_LEVEL);
    const events = run(game, PERFECT);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(5);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R8_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r8 «O túnel da vez» — falhas e lost', () => {
  it('SEM O TOGGLE: o azul morre em @r; 2/3 com 5 moedas', () => {
    const game = setup(R8_LEVEL);
    const events = run(
      game,
      Array.from({ length: 12 }, () => PASS),
    );

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(12);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toHaveLength(5);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(derailsOf(events).at(-1)).toMatchObject({
      trainId: 'blue',
      at: pos(5, 0),
      reason: 'wrongStation',
    });
  });

  it('LOST: verde no 3, vermelho no 6 e azul no 12', () => {
    const game = setup(R8_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(12);
    expect(game.state.lives).toBe(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
  });
});
