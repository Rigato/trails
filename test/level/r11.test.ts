/**
 * r11 «A mesa cheia» — testes da fase real 11 (PICO do Q7: 4 trens).
 *
 * Quatro previsões, quatro entradas separadas, 3 vidas. O laranja/diamante é a
 * linha curta e isolada da borda esquerda (entrega no 4); as três rotas
 * principais são a r5/r8. O teste prova 4/4 nas duas rotas e o `lost` com 4
 * trens.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R11_LEVEL } from '../../src/level/real/r11';
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
  { kind: 'tap', cell: pos(2, 5) },
  ...Array.from({ length: 3 }, () => PASS),
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

describe('r11 «A mesa cheia» — contrato do dado', () => {
  it('7×8, 4 trens, 4 estações, 3 vidas; entradas separadas', () => {
    expect(R11_LEVEL.board.width).toBe(7);
    expect(R11_LEVEL.board.height).toBe(8);
    expect(R11_LEVEL.lives).toBe(3);
    expect(R11_LEVEL.tutorial).toBe(false);
    expect(R11_LEVEL.trains).toHaveLength(4);
    expect(new Set(R11_LEVEL.trains.map((train) => train.color)).size).toBe(4);

    const entries = R11_LEVEL.trains.map(
      (train) => `${train.entry.cell.col},${train.entry.cell.row}`,
    );

    expect(new Set(entries).size).toBe(4);

    const game = setup(R11_LEVEL);
    const orange = trainInState(game.state, 'orange');

    expect(cellAt(R11_LEVEL.board, pos(0, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: orange.color, shape: orange.shape },
    });
    expect(game.prediction('orange', 12)?.stop).toEqual({
      kind: 'station',
      cell: pos(0, 3),
      correct: true,
    });

    for (const coin of R11_LEVEL.coins ?? []) {
      expect(cellAt(R11_LEVEL.board, coin)?.kind).toBe('piece');
    }
  });
});

describe('r11 «A mesa cheia» — o Q7 como conteúdo', () => {
  it('SEGURA: 12 ações, 4/4, 3/7 moedas', () => {
    const game = setup(R11_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(3);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    for (const id of ['red', 'blue', 'green', 'orange']) {
      expect(trainInState(game.state, id).status.kind).toBe('delivered');
    }

    expect(
      sealCondition({
        delivered: 4,
        trainTotal: 4,
        coins: game.state.coinsCollected.length,
        coinsTotal: R11_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 13 ações, 4/4, 7/7 moedas — o pico vencível 4/4', () => {
    const game = setup(R11_LEVEL);
    const events = run(game, PERFECT);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(7);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
    expect(
      sealCondition({
        delivered: 4,
        trainTotal: 4,
        coins: game.state.coinsCollected.length,
        coinsTotal: R11_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });
});

describe('r11 «A mesa cheia» — falhas e lost', () => {
  it('SEM O TOGGLE: 3/4 no 12; o azul morre em @r', () => {
    const game = setup(R11_LEVEL);

    for (let index = 0; index < 12; index += 1) {
      game.apply(PASS);
    }

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(12);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toHaveLength(7);

    for (const id of ['red', 'green', 'orange']) {
      expect(trainInState(game.state, id).status.kind).toBe('delivered');
    }
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
  });

  it('LOST: três eventos solo no 6, mesmo com o laranja entregue', () => {
    const game = setup(R11_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(0);
    expect(lifeLossesOf(events)).toHaveLength(3);
    expect(trainInState(game.state, 'orange').status.kind).toBe('delivered');
  });
});
