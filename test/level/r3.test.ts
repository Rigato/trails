/**
 * r3 «A janela tripla» — testes da fase real 3 (o pico da faixa 1).
 *
 * O X (3,4) é o recurso disputado: o vermelho lento (túnel, inicial) cruza no
 * 6 e o azul no 5. O vermelho rápido (o desvio da entrada, opcional) cruza no
 * 5 e colide com o azul: é o erro que arma a colisão dupla. O verde nasce no
 * ramo de moedas com a curva (5,0) errada. A coreografia de erro faz DOIS
 * trens colidirem no X (1 vida) e o terceiro morrer solo (1 vida): `deadEnd`
 * com 1 vida — o prompt do Resgate do M4.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R3_LEVEL } from '../../src/level/real/r3';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
/** O desvio da entrada: arm 0 (O, túnel lento) → 1 (L, rápido). */
const RED_FAST: Action = { kind: 'tap', cell: pos(1, 6) };
const GREEN_DIRECT: Action = { kind: 'tap', cell: pos(3, 1) };
const GREEN_COIN_CCW: Action = { kind: 'tap', cell: pos(5, 0), turn: 'ccw' };

/** SEGURA — 12 ações, 3/3, 1/5 moedas. */
const SAFE: readonly Action[] = [
  GREEN_DIRECT, // 1
  ...Array.from({ length: 11 }, () => PASS), // 2–12
];

/** PERFEITA — 14 ações, 3/3, 5/5 moedas; CCW no fim do ramo do verde. */
const PERFECT: readonly Action[] = [
  ...Array.from({ length: 10 }, () => PASS), // 1–10
  GREEN_COIN_CCW, // 11
  ...Array.from({ length: 3 }, () => PASS), // 12–14
];

/**
 * COLISÃO DUPLA — o jogador "acelera" o vermelho no primeiro toque e não
 * conserta o verde: vermelho rápido e azul no X (5), os dois perdem 1 vida;
 * o verde segue no ramo errado e morre solo em (5,0) no 13. Sem entregas:
 * `deadEnd` com 1 vida.
 */
const DOUBLE_COLLISION: readonly Action[] = [
  RED_FAST, // 1
  ...Array.from({ length: 12 }, () => PASS), // 2–13
];

/** LOST — azul e vermelho morrem em células diferentes; verde no 13. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(4, 4) }, // azul
  { kind: 'tap', cell: pos(3, 5) }, // vermelho lento
  ...Array.from({ length: 11 }, () => PASS),
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

describe('r3 «A janela tripla» — contrato do dado', () => {
  it('6×7, 3 trens, 3 vidas, fora do tutorial; túnel simétrico e estações', () => {
    const game = setup(R3_LEVEL);

    expect(R3_LEVEL.board.width).toBe(6);
    expect(R3_LEVEL.board.height).toBe(7);
    expect(R3_LEVEL.lives).toBe(3);
    expect(R3_LEVEL.tutorial).toBe(false);
    expect(R3_LEVEL.selectorHint).toBeUndefined();
    expect(R3_LEVEL.trains).toHaveLength(3);

    expect(cellAt(R3_LEVEL.board, pos(0, 6))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(4, 6) },
    });
    expect(cellAt(R3_LEVEL.board, pos(4, 6))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'tunnel', exit: pos(0, 6) },
    });
    expect(cellAt(R3_LEVEL.board, pos(3, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'crossing', rot: 0 },
    });
    expect(cellAt(R3_LEVEL.board, pos(1, 6))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 2, arm: 0, next: 'toggle' },
    });

    expect(cellAt(R3_LEVEL.board, pos(2, 3))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'red').color,
        shape: trainInState(game.state, 'red').shape,
      },
    });
    expect(cellAt(R3_LEVEL.board, pos(2, 4))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'blue').color,
        shape: trainInState(game.state, 'blue').shape,
      },
    });
    expect(cellAt(R3_LEVEL.board, pos(5, 2))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'green').color,
        shape: trainInState(game.state, 'green').shape,
      },
    });

    for (const train of R3_LEVEL.trains) {
      expect(cellAt(R3_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }

    for (const coin of R3_LEVEL.coins ?? []) {
      expect(cellAt(R3_LEVEL.board, coin)?.kind).toBe('piece');
    }

    expect(
      new Set(R3_LEVEL.trains.map((train) => train.color)).size,
    ).toBe(3);
  });

  it('o primeiro quadro: vermelho lento e azul separados; verde anunciado', () => {
    const game = setup(R3_LEVEL);
    const red = game.prediction('red', 24);
    const blue = game.prediction('blue', 24);
    const green = game.prediction('green', 24);

    expect(
      red?.path.findIndex((cell) => cell.col === 3 && cell.row === 4),
    ).toBe(5);
    expect(
      blue?.path.findIndex((cell) => cell.col === 3 && cell.row === 4),
    ).toBe(4);
    expect(green?.stop).toEqual({
      kind: 'border',
      cell: pos(5, 0),
      direction: 'north',
    });
    expect(cellAt(R3_LEVEL.board, pos(5, 0))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });
  });
});

describe('r3 «A janela tripla» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 1/5 moedas, sem colisão', () => {
    const game = setup(R3_LEVEL);
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
      expect(trainInState(game.state, id).status).toEqual({
        kind: 'delivered',
      });
    }

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R3_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 14 ações, 3/3, 5/5 moedas; CCW do verde banca o selo', () => {
    const game = setup(R3_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(14);
    expect(game.state.step).toBe(14);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(3, 4),
      pos(3, 0),
      pos(4, 0),
      pos(5, 0),
      pos(5, 1),
    ]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R3_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('o CCW no fim do ramo: 1 toque conserta o que o CW não alcança', () => {
    const game = setup(R3_LEVEL);
    for (let index = 0; index < 10; index += 1) {
      game.apply(PASS);
    }
    game.apply(GREEN_COIN_CCW);

    expect(cellAt(game.state.board, pos(5, 0))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 2 },
    });
  });
});

describe('r3 «A janela tripla» — colisão dupla, deadEnd e lost', () => {
  it('dois no X (1 vida) + o verde solo (1 vida) = deadEnd com 1 vida', () => {
    const game = setup(R3_LEVEL);
    const events: GameEvent[] = [];

    const first = game.apply(RED_FAST);

    expect(first.advanced).toBe(true);
    expect(first.outcome.kind).toBe('toggled');
    events.push(...first.events);

    for (let index = 0; index < 4; index += 1) {
      const result = game.apply(PASS);
      expect(result.advanced).toBe(true);
      events.push(...result.events);
    }

    expect(collisionsOf(events)).toHaveLength(1);
    expect(collisionsOf(events)[0]?.trainIds).toEqual(['red', 'blue']);
    expect(collisionsOf(events)[0]?.cells).toEqual([pos(3, 4)]);
    expect(derailsOf(events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
    ]);
    expect(game.state.status).toBe('playing');
    expect(trainInState(game.state, 'green').status.kind).toBe('running');

    for (let index = 0; index < 8; index += 1) {
      const result = game.apply(PASS);
      expect(result.advanced).toBe(true);
      events.push(...result.events);
    }

    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'green',
      at: pos(5, 0),
      direction: 'north',
      reason: 'offBoard',
    });
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
      { kind: 'lifeLost', step: 13, remaining: 1 },
    ]);
    expect(game.state.lives).toBe(1);
    expect(game.state.status).toBe('deadEnd');
    expect(game.state.step).toBe(13);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(DOUBLE_COLLISION).toHaveLength(13);

    // O prompt do Resgate (M4) é do shell; o core aceita o último perdido.
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

  it('LOST: azul no 4, vermelho no 5 e verde no 13 zeram as vidas', () => {
    const game = setup(R3_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
    expect(game.state.step).toBe(13);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(collisionsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 4, remaining: 2 },
      { kind: 'lifeLost', step: 5, remaining: 1 },
      { kind: 'lifeLost', step: 13, remaining: 0 },
    ]);
  });
});
