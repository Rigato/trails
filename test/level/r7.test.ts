/**
 * r7 «O preço da pressa» — testes da fase real 7 (PICO da faixa 2).
 *
 * O default é a colisão: o vermelho nasce no braço rápido (1,6) e encontra o
 * azul no X (3,4) no 5. O primeiro toque freia o vermelho. O `deadEnd` com 1
 * vida (colisão dupla + morte solo do verde) é a coreografia do Resgate do M4.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R7_LEVEL } from '../../src/level/real/r7';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const BRAKE: Action = { kind: 'tap', cell: pos(1, 6) };
const GREEN_DIRECT: Action = { kind: 'tap', cell: pos(3, 1) };
const GREEN_COIN_CCW: Action = { kind: 'tap', cell: pos(5, 0), turn: 'ccw' };

const SAFE: readonly Action[] = [
  BRAKE,
  GREEN_DIRECT,
  ...Array.from({ length: 10 }, () => PASS),
];

const PERFECT: readonly Action[] = [
  BRAKE,
  ...Array.from({ length: 10 }, () => PASS),
  GREEN_COIN_CCW,
  ...Array.from({ length: 2 }, () => PASS),
];

const BRAKE_ONLY: readonly Action[] = [
  BRAKE,
  ...Array.from({ length: 12 }, () => PASS),
];

const LOST: readonly Action[] = [
  BRAKE,
  { kind: 'tap', cell: pos(4, 4) },
  { kind: 'tap', cell: pos(3, 5) },
  ...Array.from({ length: 10 }, () => PASS),
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

describe('r7 «O preço da pressa» — contrato do dado', () => {
  it('6×7, 3 trens, 3 vidas, fora do tutorial; o Y da entrada nasce rápido', () => {
    expect(R7_LEVEL.board.width).toBe(6);
    expect(R7_LEVEL.board.height).toBe(7);
    expect(R7_LEVEL.lives).toBe(3);
    expect(R7_LEVEL.tutorial).toBe(false);
    expect(R7_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R7_LEVEL.board, pos(1, 6))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 2, arm: 1, next: 'toggle' },
    });
    expect(cellAt(R7_LEVEL.board, pos(3, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(cellAt(R7_LEVEL.board, pos(3, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'crossing', rot: 0 },
    });
    expect(cellAt(R7_LEVEL.board, pos(0, 6))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(4, 6) },
    });

    const game = setup(R7_LEVEL);

    for (const id of ['red', 'blue', 'green']) {
      expect(trainInState(game.state, id).status.kind).toBe('waiting');
    }
  });

  it('o primeiro quadro: vermelho rápido e azul chegam ao X no 5', () => {
    const game = setup(R7_LEVEL);
    const red = game.prediction('red', 24);
    const blue = game.prediction('blue', 24);

    expect(red?.path.findIndex((cell) => cell.col === 3 && cell.row === 4)).toBe(4);
    expect(blue?.path.findIndex((cell) => cell.col === 3 && cell.row === 4)).toBe(4);
    expect(red?.stop).toEqual({ kind: 'station', cell: pos(2, 3), correct: true });
    expect(blue?.stop).toEqual({ kind: 'station', cell: pos(2, 4), correct: true });
  });
});

describe('r7 «O preço da pressa» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 1/5 moedas', () => {
    const game = setup(R7_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(12);
    expect(game.state.step).toBe(12);
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
        coinsTotal: R7_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 14 ações, 3/3, 5/5 moedas; CCW no último instante', () => {
    const game = setup(R7_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(14);
    expect(game.state.step).toBe(14);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(5);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R7_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r7 «O preço da pressa» — colisão dupla, deadEnd e lost', () => {
  it('DEFAULT: colisão dupla no 5 + verde solo no 13 = deadEnd com 1 vida', () => {
    const game = setup(R7_LEVEL);
    const events: GameEvent[] = [];

    for (let index = 0; index < 13; index += 1) {
      const result = game.apply(PASS);

      expect(result.advanced).toBe(true);
      events.push(...result.events);
    }

    expect(collisionsOf(events)).toHaveLength(1);
    expect(collisionsOf(events)[0]?.trainIds).toEqual(['red', 'blue']);
    expect(collisionsOf(events)[0]?.cells).toEqual([pos(3, 4)]);
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
      { kind: 'lifeLost', step: 13, remaining: 1 },
    ]);
    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'green',
      at: pos(5, 0),
      direction: 'north',
      reason: 'offBoard',
    });
    expect(game.state.status).toBe('deadEnd');
    expect(game.state.step).toBe(13);
    expect(game.state.lives).toBe(1);
    expect(game.state.coinsCollected).toHaveLength(4);

    // O prompt do Resgate (M4) é do shell; o core devolve o último perdido.
    const rescued = game.rescue('green');

    expect(rescued).toBeDefined();
    expect(rescued?.status).toBe('playing');
    expect(rescued?.lives).toBe(1);
    expect(trainInState(rescued!, 'green').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 0),
      direction: 'south',
    });
  });

  it('SÓ O FREIO: o verde morre no laço; 2/3 com 4 moedas', () => {
    const game = setup(R7_LEVEL);
    const events = run(game, BRAKE_ONLY);

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(13);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toHaveLength(4);
    expect(trainInState(game.state, 'red').status.kind).toBe('delivered');
    expect(trainInState(game.state, 'blue').status.kind).toBe('delivered');
    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'green',
      at: pos(5, 0),
      direction: 'north',
      reason: 'offBoard',
    });
  });

  it('LOST: freio + azul no 4 + vermelho lento no 5 + verde no 13', () => {
    const game = setup(R7_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(13);
    expect(game.state.lives).toBe(0);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(3);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }
  });
});
