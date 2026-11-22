/**
 * r5 «O túnel e o cruzamento» — testes da fase real 5 (entrada da faixa 2).
 *
 * A bifurcação Y (2,6) escolhe a rota do azul: o túnel (segura, 1 moeda) ou o
 * cruzamento X (3,4) + o Y (5,1) (perfeita, 5 moedas). O teste cobre as duas
 * rotas, o default que morre no CCW esquecido e o `lost` de três erros.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R5_LEVEL } from '../../src/level/real/r5';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const FORK_TUNNEL: Action = { kind: 'tap', cell: pos(2, 6) };
const SAFE_CCW: Action = { kind: 'tap', cell: pos(6, 7), turn: 'ccw' };
const PERFECT_CCW: Action = { kind: 'tap', cell: pos(3, 5), turn: 'ccw' };
const Y_FOR_BLUE: Action = { kind: 'tap', cell: pos(5, 1) };

/** SEGURA — 12 ações, 3/3, 1/5 moedas. */
const SAFE: readonly Action[] = [
  FORK_TUNNEL, // 1
  SAFE_CCW, // 2
  ...Array.from({ length: 10 }, () => PASS), // 3–12
];

/** PERFEITA — 13 ações, 3/3, 5/5 moedas. */
const PERFECT: readonly Action[] = [
  PERFECT_CCW, // 1
  ...Array.from({ length: 5 }, () => PASS), // 2–6
  Y_FOR_BLUE, // 7
  ...Array.from({ length: 6 }, () => PASS), // 8–13
];

/** LOST — verde, vermelho e azul morrem em eventos independentes. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 4) }, // a reta do verde vira N–S
  Y_FOR_BLUE, // cedo: o vermelho sai para @b
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

describe('r5 «O túnel e o cruzamento» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas, fora do tutorial; túnel, X e Ys', () => {
    expect(R5_LEVEL.board.width).toBe(7);
    expect(R5_LEVEL.board.height).toBe(8);
    expect(R5_LEVEL.lives).toBe(3);
    expect(R5_LEVEL.tutorial).toBe(false);
    expect(R5_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R5_LEVEL.board, pos(3, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'crossing', rot: 0 },
    });
    expect(cellAt(R5_LEVEL.board, pos(2, 6))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R5_LEVEL.board, pos(5, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R5_LEVEL.board, pos(3, 7))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(5, 7) },
    });
    expect(cellAt(R5_LEVEL.board, pos(5, 7))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(3, 7) },
    });

    const game = setup(R5_LEVEL);

    for (const id of ['red', 'green']) {
      const train = trainInState(game.state, id);

      expect(cellAt(R5_LEVEL.board, id === 'red' ? pos(5, 0) : pos(4, 4))).toEqual({
        kind: 'fixed',
        fixed: { kind: 'station', color: train.color, shape: train.shape },
      });
    }

    const blue = trainInState(game.state, 'blue');

    expect(cellAt(R5_LEVEL.board, pos(5, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });

    for (const train of R5_LEVEL.trains) {
      expect(cellAt(R5_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }

    for (const coin of R5_LEVEL.coins ?? []) {
      expect(cellAt(R5_LEVEL.board, coin)?.kind).toBe('piece');
    }
  });

  it('o primeiro quadro: a curva torta (3,5) anuncia a morte do azul', () => {
    const game = setup(R5_LEVEL);

    expect(game.prediction('green', 24)?.path).toEqual([
      pos(0, 4), pos(1, 4), pos(2, 4), pos(3, 4), pos(4, 4),
    ]);
    expect(game.prediction('blue', 24)?.stop).toEqual({
      kind: 'noExit',
      cell: pos(3, 5),
    });
    expect(game.prediction('red', 24)?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 0),
      correct: true,
    });
  });
});

describe('r5 «O túnel e o cruzamento» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 1/5 moedas, sem colisão', () => {
    const game = setup(R5_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(12);
    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([pos(3, 4)]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    for (const id of ['red', 'blue', 'green']) {
      expect(trainInState(game.state, id).status.kind).toBe('delivered');
    }

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R5_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 13 ações, 3/3, 5/5 moedas; CCW e Y no tempo', () => {
    const game = setup(R5_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(13);
    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(2, 5),
      pos(3, 4),
      pos(3, 5),
      pos(3, 3),
      pos(3, 2),
    ]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R5_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r5 «O túnel e o cruzamento» — falhas e lost', () => {
  it('SEM O CCW: o azul morre em (3,5); vitória 2/3', () => {
    const game = setup(R5_LEVEL);
    const result = game.apply(PASS);

    expect(result.advanced).toBe(true);

    for (let index = 0; index < 4; index += 1) {
      game.apply(PASS);
    }

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(5);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toEqual([
      pos(2, 5),
      pos(3, 4),
      pos(3, 5),
    ]);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'red').status.kind).toBe('delivered');
    expect(trainInState(game.state, 'green').status.kind).toBe('delivered');
  });

  it('LOST: verde em (2,4), vermelho em @b e azul em (3,5)', () => {
    const game = setup(R5_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(0);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(collisionsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
  });
});
