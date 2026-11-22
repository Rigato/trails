/**
 * r2 «O cruzamento» — testes da fase real 2.
 *
 * O X (3,3) é o recurso disputado: o vermelho cruza no 9 (ou no 11, na rota
 * perfeita) e o azul no 10. O azul nasce com a reta (3,1) atravessada; o
 * primeiro conserto é o giro. A rota perfeita inverte a ordem (azul primeiro)
 * e leva o vermelho ao laço de moedas com um CCW na curva (1,2).
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R2_LEVEL } from '../../src/level/real/r2';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };
const BLUE_FIX: Action = { kind: 'tap', cell: pos(3, 1) };
const RED_FORK_CCW: Action = { kind: 'tap', cell: pos(1, 2), turn: 'ccw' };

/** SEGURA — 13 ações, 3/3, 1/5 moedas; conserta o azul e espera. */
const SAFE: readonly Action[] = [
  BLUE_FIX, // 1
  ...Array.from({ length: 12 }, () => PASS), // 2–13
];

/** PERFEITA — 13 ações, 3/3, 5/5 moedas; o CCW é o lance do selo. */
const PERFECT: readonly Action[] = [
  BLUE_FIX, // 1
  PASS, // 2
  RED_FORK_CCW, // 3
  ...Array.from({ length: 10 }, () => PASS), // 4–13
];

/** LOST — verde, vermelho e azul, cada um com um erro próprio. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 6) }, // verde morre na entrada
  { kind: 'tap', cell: pos(1, 2) }, // vermelho morre no Y
  ...Array.from({ length: 6 }, () => PASS),
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

describe('r2 «O cruzamento» — contrato do dado', () => {
  it('6×7, 3 trens, 3 vidas, fora do tutorial; entradas e estações coerentes', () => {
    const game = setup(R2_LEVEL);

    expect(R2_LEVEL.board.width).toBe(6);
    expect(R2_LEVEL.board.height).toBe(7);
    expect(R2_LEVEL.lives).toBe(3);
    expect(R2_LEVEL.tutorial).toBe(false);
    expect(R2_LEVEL.selectorHint).toBeUndefined();
    expect(R2_LEVEL.trains).toHaveLength(3);

    for (const train of R2_LEVEL.trains) {
      expect(cellAt(R2_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }

    expect(cellAt(R2_LEVEL.board, pos(5, 3))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'red').color,
        shape: trainInState(game.state, 'red').shape,
      },
    });
    expect(cellAt(R2_LEVEL.board, pos(3, 6))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'blue').color,
        shape: trainInState(game.state, 'blue').shape,
      },
    });
    expect(cellAt(R2_LEVEL.board, pos(5, 4))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'green').color,
        shape: trainInState(game.state, 'green').shape,
      },
    });

    for (const coin of R2_LEVEL.coins ?? []) {
      expect(cellAt(R2_LEVEL.board, coin)?.kind).toBe('piece');
    }

    const colors = new Set(R2_LEVEL.trains.map((train) => train.color));
    expect(colors.size).toBe(3);
  });

  it('o azul nasce com a reta (3,1) atravessada e morre nela', () => {
    const game = setup(R2_LEVEL);
    const blue = game.prediction('blue', 24);

    expect(cellAt(R2_LEVEL.board, pos(3, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
    expect(blue?.stop).toEqual({ kind: 'noExit', cell: pos(3, 1) });
    expect(
      blue?.path.findIndex((cell) => cell.col === 3 && cell.row === 1),
    ).toBe(7);
  });
});

describe('r2 «O cruzamento» — dois andares de sucesso', () => {
  it('SEGURA: 13 ações, 3/3, 1/5 moedas, sem colisão', () => {
    const game = setup(R2_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(13);
    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([pos(3, 3)]);
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
        coinsTotal: R2_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 13 ações, 3/3, 5/5 moedas, selo com CCW', () => {
    const game = setup(R2_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(13);
    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(1, 4),
      pos(1, 5),
      pos(2, 5),
      pos(2, 4),
      pos(3, 3),
    ]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R2_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('o CCW na curva (1,2) é o lance: 1 toque contra 3 do CW', () => {
    const game = setup(R2_LEVEL);
    game.apply(BLUE_FIX);
    game.apply(PASS);
    game.apply(RED_FORK_CCW);

    expect(cellAt(game.state.board, pos(1, 2))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 2 },
    });
  });
});

describe('r2 «O cruzamento» — falhas e lost', () => {
  it('azul sem o conserto morre em (3,1); vermelho e verde vencem 2/3', () => {
    const game = setup(R2_LEVEL);
    const events = run(game, Array.from({ length: 11 }, () => PASS));

    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'blue',
      at: pos(3, 1),
      direction: 'south',
      reason: 'noExit',
    });
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 8, remaining: 2 },
    ]);
  });

  it('LOST: verde, vermelho e azul zeram as vidas no 8', () => {
    const game = setup(R2_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
    expect(game.state.step).toBe(8);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
      { kind: 'lifeLost', step: 4, remaining: 1 },
      { kind: 'lifeLost', step: 8, remaining: 0 },
    ]);
  });
});
