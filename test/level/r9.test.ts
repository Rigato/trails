/**
 * r9 «A janela de um passo» — testes da fase real 9 (faixa 3, entrada).
 *
 * O verde entra em (0,3) e cruza o X (3,4) no 5; o azul perfeito no 6. A
 * janela de um passo é o conteúdo: a rota segura enfrenta o X, a perfeita
 * desce ao túnel com três consertos e 6 moedas.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R9_LEVEL } from '../../src/level/real/r9';
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

describe('r9 «A janela de um passo» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas; o verde cruza o X no 5', () => {
    expect(R9_LEVEL.board.width).toBe(7);
    expect(R9_LEVEL.board.height).toBe(8);
    expect(R9_LEVEL.lives).toBe(3);
    expect(R9_LEVEL.tutorial).toBe(false);
    expect(R9_LEVEL.trains).toHaveLength(3);
    expect(cellAt(R9_LEVEL.board, pos(0, 3))?.kind).toBe('piece');
    expect(cellAt(R9_LEVEL.board, pos(1, 3))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 2 },
    });
    expect(cellAt(R9_LEVEL.board, pos(1, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 0 },
    });

    const game = setup(R9_LEVEL);
    const green = game.prediction('green', 24);

    expect(
      green?.path.findIndex((cell) => cell.col === 3 && cell.row === 4),
    ).toBe(4);
    expect(green?.stop).toEqual({ kind: 'station', cell: pos(4, 4), correct: true });
    expect(game.prediction('blue', 24)?.stop).toEqual({
      kind: 'noExit',
      cell: pos(3, 5),
    });
  });
});

describe('r9 «A janela de um passo» — dois andares de sucesso', () => {
  it('SEGURA: 13 ações, 3/3, 2/6 moedas; X com verde no 5 e azul no 6', () => {
    const game = setup(R9_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(2);
    expect(game.state.coinsCollected).toEqual(
      expect.arrayContaining([pos(3, 4), pos(2, 4)]),
    );
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
  });

  it('PERFEITA: 12 ações, 3/3, 6/6 moedas; túnel com três consertos', () => {
    const game = setup(R9_LEVEL);
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
        coinsTotal: R9_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r9 «A janela de um passo» — falhas e lost', () => {
  it('SEM O CCW (3,5): o azul morre no 6; 2/3', () => {
    const game = setup(R9_LEVEL);

    for (let index = 0; index < 6; index += 1) {
      game.apply(PASS);
    }

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toHaveLength(2);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('LOST: verde no 3, azul no 5/6 e vermelho no 6', () => {
    const game = setup(R9_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
  });
});
