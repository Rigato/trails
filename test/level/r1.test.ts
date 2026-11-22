/**
 * r1 «O trilho da vez» — testes da fase real 1.
 *
 * O trilho (3,4) é usado pelo azul (passo 5) e pelo vermelho (passo 14): o
 * jogador gira o trilho na janela entre os dois. A rota perfeita troca o Y
 * (3,3) para o laço de moedas; a segura vai direto à estação.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { R1_LEVEL } from '../../src/level/real/r1';
import { sealCondition } from '../../src/save/economy';
import {
  collisionsOf,
  derailsOf,
  eventKinds,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };

/** Janela: o azul entrega no 6; o vermelho entra no trilho no 14. */
const WAIST: Action = { kind: 'tap', cell: pos(3, 4) };
/** Y do vermelho: braço 0 (N, seguro) → braço 1 (L, laço de moedas). */
const FORK: Action = { kind: 'tap', cell: pos(3, 3) };

/** SEGURA — 16 ações, 3/3, 1/5 moedas. */
const SAFE: readonly Action[] = [
  ...Array.from({ length: 6 }, () => PASS), // 1–6
  WAIST, // 7
  ...Array.from({ length: 9 }, () => PASS), // 8–16
];

/** PERFEITA — 20 ações, 3/3, 5/5 moedas, sem contragiro. */
const PERFECT: readonly Action[] = [
  FORK, // 1
  ...Array.from({ length: 5 }, () => PASS), // 2–6
  WAIST, // 7
  ...Array.from({ length: 13 }, () => PASS), // 8–20
];

/** LOST — três erros independentes: verde, azul e vermelho. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(1, 1) }, // verde morre em (1,1)
  { kind: 'tap', cell: pos(4, 6) }, // vermelho morre em (4,6)
  { kind: 'tap', cell: pos(3, 4) }, // azul morre no trilho
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

describe('r1 «O trilho da vez» — contrato do dado', () => {
  it('6×7, 3 trens, 3 vidas, fora do tutorial; entradas e estações coerentes', () => {
    const game = setup(R1_LEVEL);

    expect(R1_LEVEL.board.width).toBe(6);
    expect(R1_LEVEL.board.height).toBe(7);
    expect(R1_LEVEL.lives).toBe(3);
    expect(R1_LEVEL.tutorial).toBe(false);
    expect(R1_LEVEL.selectorHint).toBeUndefined();
    expect(R1_LEVEL.trains).toHaveLength(3);

    for (const train of R1_LEVEL.trains) {
      expect(cellAt(R1_LEVEL.board, train.entry.cell)?.kind).toBe('piece');
    }

    expect(cellAt(R1_LEVEL.board, pos(2, 3))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'red').color,
        shape: trainInState(game.state, 'red').shape,
      },
    });
    expect(cellAt(R1_LEVEL.board, pos(2, 4))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'blue').color,
        shape: trainInState(game.state, 'blue').shape,
      },
    });
    expect(cellAt(R1_LEVEL.board, pos(5, 2))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: trainInState(game.state, 'green').color,
        shape: trainInState(game.state, 'green').shape,
      },
    });

    for (const coin of R1_LEVEL.coins ?? []) {
      expect(cellAt(R1_LEVEL.board, coin)?.kind).toBe('piece');
    }

    const colors = new Set(
      R1_LEVEL.trains.map((train) => train.color),
    );

    expect(colors.size).toBe(3);
  });

  it('primeiro quadro: o azul chega ao trilho em 5, o vermelho em 14', () => {
    const game = setup(R1_LEVEL);
    const blue = game.prediction('blue', 24);
    const red = game.prediction('red', 24);

    expect(blue?.path).toEqual([
      pos(5, 6),
      pos(5, 5),
      pos(5, 4),
      pos(4, 4),
      pos(3, 4),
      pos(2, 4),
    ]);
    expect(red?.path).toContainEqual(pos(3, 4));
    expect(
      red?.path.findIndex((cell) => cell.col === 3 && cell.row === 4),
    ).toBe(13);
    expect(red?.stop.kind).toBe('noExit');
  });
});

describe('r1 «O trilho da vez» — dois andares de sucesso', () => {
  it('SEGURA: 16 ações, 3/3, 3 vidas, 1/5 moedas, sem colisão', () => {
    const game = setup(R1_LEVEL);
    const events = run(game, SAFE);

    expect(SAFE).toHaveLength(16);
    expect(game.state.step).toBe(16);
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
        coinsTotal: R1_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('PERFEITA: 20 ações, 3/3, 5/5 moedas, selo bancável', () => {
    const game = setup(R1_LEVEL);
    const events = run(game, PERFECT);

    expect(PERFECT).toHaveLength(20);
    expect(game.state.step).toBe(20);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(3, 4),
      pos(4, 3),
      pos(4, 2),
      pos(3, 2),
      pos(2, 2),
    ]);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: game.state.coinsCollected.length,
        coinsTotal: R1_LEVEL.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('o giro do trilho é a janela: a rota segura gira só depois do azul', () => {
    const game = setup(R1_LEVEL);

    for (let index = 0; index < 6; index += 1) {
      game.apply(PASS);
    }

    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });

    game.apply(WAIST);
    expect(cellAt(game.state.board, pos(3, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 2 },
    });
  });
});

describe('r1 «O trilho da vez» — falhas e lost', () => {
  it('girar cedo para ajudar o vermelho mata o azul; o vermelho entrega', () => {
    const game = setup(R1_LEVEL);
    const events = run(game, [
      WAIST,
      ...Array.from({ length: 15 }, () => PASS),
    ]);

    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(derailsOf(events)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'blue',
      at: pos(3, 4),
      direction: 'west',
      reason: 'noExit',
    });
    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
    ]);
  });

  it('LOST: três erros independentes zeram as vidas no 11', () => {
    const game = setup(R1_LEVEL);
    const events = run(game, LOST);

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
    expect(game.state.step).toBe(11);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(lifeLossesOf(events)).toEqual([
      { kind: 'lifeLost', step: 3, remaining: 2 },
      { kind: 'lifeLost', step: 5, remaining: 1 },
      { kind: 'lifeLost', step: 11, remaining: 0 },
    ]);
  });

  it('a sequência segura não perde trem; o deadEnd não aparece', () => {
    const game = setup(R1_LEVEL);
    const events = run(game, SAFE);

    expect(game.state.status).toBe('won');
    expect(eventKinds(events).includes('deadEnd')).toBe(false);
  });
});
