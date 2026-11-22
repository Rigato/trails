/**
 * r12 «A última moeda» — testes da fase real 12 (VALE final).
 *
 * Todas as peças nascem certas. A segura (túnel) entrega 4/5; a perfeita (X +
 * Y) entrega 5/5. A quinta moeda está em (5,2), na saída do Y — a única que o
 * túnel não alcança. O teste prova a diferença de UMA moeda entre os andares.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R12_LEVEL } from '../../src/level/real/r12';
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

describe('r12 «A última moeda» — contrato do dado', () => {
  it('7×8, 3 trens, 3 vidas; peças certas e a moeda do Y em (5,2)', () => {
    expect(R12_LEVEL.board.width).toBe(7);
    expect(R12_LEVEL.board.height).toBe(8);
    expect(R12_LEVEL.lives).toBe(3);
    expect(R12_LEVEL.tutorial).toBe(false);
    expect(R12_LEVEL.trains).toHaveLength(3);
    expect(R12_LEVEL.coins).toHaveLength(5);
    expect(R12_LEVEL.coins).toContainEqual(pos(5, 2));

    expect(cellAt(R12_LEVEL.board, pos(3, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });
    expect(cellAt(R12_LEVEL.board, pos(6, 7))).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });

    for (const coin of R12_LEVEL.coins ?? []) {
      expect(cellAt(R12_LEVEL.board, coin)?.kind).toBe('piece');
    }
  });

  it('o default do Y leva o azul a @r; o Y para S leva a (5,2)', () => {
    const game = setup(R12_LEVEL);
    const blue = game.prediction('blue', 24);

    expect(blue?.path).toContainEqual(pos(3, 4));
    expect(blue?.stop).toEqual({ kind: 'station', cell: pos(5, 0), correct: false });

    for (let index = 0; index < 5; index += 1) {
      game.apply(PASS);
    }
    game.apply(Y_FOR_BLUE);

    const routed = game.prediction('blue', 24);

    expect(routed?.path).toContainEqual(pos(5, 2));
    expect(routed?.stop).toEqual({ kind: 'station', cell: pos(5, 3), correct: true });
  });
});

describe('r12 «A última moeda» — dois andares de sucesso', () => {
  it('SEGURA: 12 ações, 3/3, 4/5 moedas; a última fica', () => {
    const game = setup(R12_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(4);
    expect(game.state.coinsCollected).not.toContainEqual(pos(5, 2));
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R12_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 13 ações, 3/3, 5/5 moedas', () => {
    const game = setup(R12_LEVEL);
    const events = run(game, PERFECT);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(5);
    expect(game.state.coinsCollected).toContainEqual(pos(5, 2));
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R12_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r12 «A última moeda» — falhas e lost', () => {
  it('SEM O TOGGLE: 2/3 no 12; 4/5 moedas', () => {
    const game = setup(R12_LEVEL);
    run(game, Array.from({ length: 12 }, () => PASS));

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(12);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toHaveLength(4);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
  });

  it('LOST: verde no 3, vermelho no 6 e azul no 12', () => {
    const game = setup(R12_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(12);
    expect(game.state.lives).toBe(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
  });
});
