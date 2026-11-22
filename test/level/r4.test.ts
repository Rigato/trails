/**
 * r4 «O desvio da vez» — testes da fase real 4 (o vale da faixa 1).
 *
 * O Y (3,2) é o desvio compartilhado: o vermelho entra pela raiz e sai pelo
 * braço N (inicial); o azul entra depois e precisa do braço S — um toque entre
 * as janelas. O ramo de moedas do azul (depois do Y) é o andar perfeito, com
 * um CCW em (1,5).
 */

import { describe, expect, it } from 'vitest';
import type { Action, CellPos, Game, GameEvent } from '../../src/core/types';
import { cellAt, cellKey } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R4_LEVEL } from '../../src/level/real/r4';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const SHARED_SWITCH: Action = { kind: 'tap', cell: pos(3, 2) };
const COIN_BRANCH: Action = { kind: 'tap', cell: pos(3, 3) };
const COIN_CCW: Action = { kind: 'tap', cell: pos(1, 5), turn: 'ccw' };

/** SEGURA — 12 ações, 3/3, 3/9 moedas. */
const SAFE: readonly Action[] = [
  ...Array.from({ length: 5 }, () => PASS), // 1–5
  SHARED_SWITCH, // 6
  ...Array.from({ length: 6 }, () => PASS), // 7–12
];

/** PERFEITA — 18 ações, 3/3, 9/9 moedas; o CCW é o lance do ramo. */
const PERFECT: readonly Action[] = [
  ...Array.from({ length: 5 }, () => PASS), // 1–5
  SHARED_SWITCH, // 6
  COIN_BRANCH, // 7
  ...Array.from({ length: 5 }, () => PASS), // 8–12
  COIN_CCW, // 13
  ...Array.from({ length: 5 }, () => PASS), // 14–18
];

/** LOST — verde e vermelho na entrada; azul erra o braço do Y. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(0, 0) }, // verde
  { kind: 'tap', cell: pos(2, 1) }, // vermelho
  ...Array.from({ length: 8 }, () => PASS),
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

function coinKeys(cells: readonly CellPos[]): readonly string[] {
  return cells.map(cellKey).sort();
}

describe('r4 «O desvio da vez» — contrato do dado', () => {
  it('6×7, 3 trens, 3 vidas, fora do tutorial; Y, X e estações coerentes', () => {
    const game = setup(R4_LEVEL);

    expect(R4_LEVEL.board.width).toBe(6);
    expect(R4_LEVEL.board.height).toBe(7);
    expect(R4_LEVEL.lives).toBe(3);
    expect(R4_LEVEL.tutorial).toBe(false);
    expect(R4_LEVEL.selectorHint).toBeUndefined();
    expect(R4_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R4_LEVEL.board, pos(3, 2))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R4_LEVEL.board, pos(2, 2))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 1, arm: 1, next: 'toggle' },
    });
    expect(cellAt(R4_LEVEL.board, pos(3, 3))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 0, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R4_LEVEL.board, pos(2, 3))).toEqual({
      kind: 'piece',
      piece: { kind: 'crossing', rot: 0 },
    });

    expect(cellAt(R4_LEVEL.board, pos(3, 0))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'red').color,
        shape: trainInState(game.state, 'red').shape,
      },
    });
    expect(cellAt(R4_LEVEL.board, pos(5, 4))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'blue').color,
        shape: trainInState(game.state, 'blue').shape,
      },
    });
    expect(cellAt(R4_LEVEL.board, pos(0, 4))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'green').color,
        shape: trainInState(game.state, 'green').shape,
      },
    });

    for (const train of R4_LEVEL.trains) {
      expect(cellAt(R4_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }

    for (const coin of R4_LEVEL.coins ?? []) {
      expect(cellAt(R4_LEVEL.board, coin)?.kind).toBe('piece');
    }

    expect(
      new Set(R4_LEVEL.trains.map((train) => train.color)).size,
    ).toBe(3);
  });

  it('o primeiro quadro manda o azul ao braço N: o Y é a vez do vermelho', () => {
    const game = setup(R4_LEVEL);
    const blue = game.prediction('blue', 24);
    const red = game.prediction('red', 24);

    expect(red?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 0),
      correct: true,
    });
    expect(blue?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 0),
      correct: false,
    });
  });
});

describe('r4 «O desvio da vez» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 3/9 moedas, sem colisão', () => {
    const game = setup(R4_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(12);
    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(3);
    expect(coinKeys(game.state.coinsCollected)).toEqual(
      coinKeys([pos(2, 5), pos(2, 3), pos(3, 2)]),
    );
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    for (const id of ['red', 'blue', 'green']) {
      expect(trainInState(game.state, id).status).toEqual({
        kind: 'delivered',
      });
    }

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R4_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 18 ações, 3/3, 9/9 moedas, selo com CCW', () => {
    const game = setup(R4_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(18);
    expect(game.state.step).toBe(18);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(coinKeys(game.state.coinsCollected)).toEqual(
      coinKeys(R4_LEVEL.coins ?? []),
    );
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R4_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('o CCW em (1,5) é o último instante: CW não conserta a curva', () => {
    const game = setup(R4_LEVEL);
    game.apply(PASS);
    game.apply(PASS);
    game.apply(PASS);
    game.apply(PASS);
    game.apply(PASS);
    game.apply(SHARED_SWITCH);
    game.apply(COIN_BRANCH);
    for (let index = 0; index < 5; index += 1) {
      game.apply(PASS);
    }
    game.apply(COIN_CCW);

    expect(cellAt(game.state.board, pos(1, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 0 },
    });
  });
});

describe('r4 «O desvio da vez» — falhas e lost', () => {
  it('o Y trocado cedo manda o vermelho à estação do azul (wrongStation)', () => {
    const game = setup(R4_LEVEL);
    const events = run(game, [
      SHARED_SWITCH, // cedo demais
      ...Array.from({ length: 11 }, () => PASS),
    ]);

    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'red',
      at: pos(5, 4),
      direction: 'south',
      reason: 'wrongStation',
    });
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 8, remaining: 2 },
    ]);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
  });

  it('LOST: verde e vermelho na entrada; azul fecha no braço errado do Y', () => {
    const game = setup(R4_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
    expect(game.state.step).toBe(10);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(collisionsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
      { kind: 'lifeLost', step: 2, remaining: 1 },
      { kind: 'lifeLost', step: 10, remaining: 0 },
    ]);
  });
});
