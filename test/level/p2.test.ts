/**
 * Fase P2 «Obstáculos» — testes da fase DEFINITIVA (E14).
 *
 * O core (`test/core/*`) cobre rio/ponte/moedas genéricos; este arquivo testa o
 * DADO da fase: a banda de água, a ponte única, as duas rotas do azul com
 * custos distintos, a janela do split, as moedas e as rotas de falha/
 * sacrifício. Substitui o fumaça do rascunho em `test/level/p2.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import type {
  Action,
  CellPos,
  Game,
  GameEvent,
  Prediction,
  YPiece,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { P2_LEVEL } from '../../src/level/p2';
import { firstHintTarget } from '../../src/render/fx';
import {
  bridge,
  collisionsOf,
  derailsOf,
  eventKinds,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };

/**
 * Solução oficial: rota oeste/ponte, 14 passos. O primeiro passo gira (2,3)
 * (conserta a água do azul); os 11 seguintes são espera; o 13 troca o braço
 * do split para o azul; o 14 entrega o azul.
 */
const WEST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 3) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  { kind: 'tap', cell: pos(5, 2) },
  PASS,
];

/** Atalho leste: toggle da entrada + 10 passes; o vermelho fecha no 11. */
const EAST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 5) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
];

/** Sacrifício de água: nenhuma rotação (2,3); o azul afunda no passo 11. */
const WATER: readonly Action[] = [
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
];

/** Janela ignorada: rotação feita, mas o split não é rearmado no 13. */
const WRONG_STATION: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 3) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
];

/** Q5: toggle cedo do split, antes de o vermelho sair; mata o vermelho. */
const EARLY_TOGGLE: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 2) },
  { kind: 'tap', cell: pos(2, 3) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
];

const WEST_COINS = [
  pos(1, 1),
  pos(1, 4),
  pos(0, 4),
  pos(1, 2),
  pos(3, 2),
];

const EAST_COINS = [pos(1, 1), pos(4, 4), pos(3, 2)];

/** Previsões dos trens, na ordem do layout. */
function predictionsOf(game: Game): readonly Prediction[] {
  const predictions: Prediction[] = [];

  for (const train of game.state.trains) {
    const prediction = game.prediction(train.id, 24);

    if (prediction !== undefined) {
      predictions.push(prediction);
    }
  }

  return predictions;
}

/** Y de uma célula, com erro claro se não houver. */
function yAt(game: Game, cell: CellPos): YPiece {
  const content = cellAt(game.state.board, cell);

  if (content?.kind !== 'piece' || content.piece.kind !== 'y') {
    throw new Error(`Esperado um Y em (${cell.col},${cell.row}).`);
  }

  return content.piece;
}

/** Roda uma sequência e coleta os eventos. */
function run(game: Game, actions: readonly Action[]): GameEvent[] {
  const events: GameEvent[] = [];

  for (const action of actions) {
    const result = game.apply(action);

    events.push(...result.events);
  }

  return events;
}

describe('P2 — fase «Obstáculos» (layout definitivo)', () => {
  it('6×6, rio vertical curto com uma ponte perpendicular e ponta de baixo', () => {
    const board = P2_LEVEL.board;

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P2_LEVEL.lives).toBe(3);

    expect(cellAt(board, pos(3, 1))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'river' },
    });
    expect(cellAt(board, pos(3, 2))).toEqual(bridge('east-west'));
    expect(cellAt(board, pos(3, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'river' },
    });
    expect(cellAt(board, pos(3, 4))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'river' },
    });

    // Pontas: topo vazio (a rota não passa), fundo trilho (o atalho leste).
    expect(cellAt(board, pos(3, 0))).toEqual({ kind: 'empty' });
    expect(cellAt(board, pos(3, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
  });

  it('2 trens, 2 estações, 2 entradas-peça e 6 moedas sobre trilho/bridge', () => {
    const game = setup(P2_LEVEL);
    const red = trainInState(game.state, 'red');
    const blue = trainInState(game.state, 'blue');

    expect(P2_LEVEL.trains).toHaveLength(2);
    expect(red.shape).toBe('circle');
    expect(blue.shape).toBe('square');
    expect(red.color).not.toBe(blue.color);

    expect(cellAt(P2_LEVEL.board, pos(5, 1))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: red.color, shape: red.shape },
    });
    expect(cellAt(P2_LEVEL.board, pos(5, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });

    // D13: a primeira célula é uma peça comum, não um fixo de entrada.
    expect(P2_LEVEL.trains[0]?.entry).toEqual({
      cell: pos(0, 0),
      direction: 'south',
    });
    expect(P2_LEVEL.trains[1]?.entry).toEqual({
      cell: pos(2, 5),
      direction: 'north',
    });
    expect(cellAt(P2_LEVEL.board, pos(0, 0))?.kind).toBe('piece');
    expect(cellAt(P2_LEVEL.board, pos(2, 5))?.kind).toBe('piece');

    expect(yAt(game, pos(2, 2))).toEqual({
      kind: 'y',
      rot: 1,
      arm: 0,
      next: 'toggle',
    });
    expect(yAt(game, pos(5, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });
    expect(yAt(game, pos(2, 5))).toEqual({
      kind: 'y',
      rot: 2,
      arm: 0,
      next: 'toggle',
    });

    expect(P2_LEVEL.coins).toEqual([
      pos(1, 1),
      pos(3, 2),
      pos(1, 4),
      pos(0, 4),
      pos(1, 2),
      pos(4, 4),
    ]);

    for (const coin of P2_LEVEL.coins ?? []) {
      const content = cellAt(P2_LEVEL.board, coin);
      const onTrack =
        content?.kind === 'piece' ||
        (content?.kind === 'fixed' && content.fixed.kind === 'bridge');

      expect(onTrack).toBe(true);
    }
  });

  it('primeiro quadro: vermelho já entrega; azul avisa a água; sem hint D6', () => {
    const game = setup(P2_LEVEL);
    const predictions = predictionsOf(game);
    const red = predictions.find((prediction) => prediction.trainId === 'red');
    const blue = predictions.find((prediction) => prediction.trainId === 'blue');

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 0),
      direction: 'south',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'waiting',
      cell: pos(2, 5),
      direction: 'north',
    });

    expect(red?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 1),
      correct: true,
    });
    expect(blue?.stop).toEqual({ kind: 'water', cell: pos(3, 4) });
    expect(firstHintTarget(game.state, predictions)).toBeNull();
  });

  it('os dois trens entram no passo 1 pela primeira célula-peça (D13)', () => {
    const game = setup(P2_LEVEL);
    const result = game.apply(WEST[0]!);

    expect(result.advanced).toBe(true);
    expect(result.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 5),
      incoming: 'north',
    });

    const moves = result.events.filter((event) => event.kind === 'trainMoved');

    expect(moves).toHaveLength(2);

    for (const move of moves) {
      if (move.kind === 'trainMoved') {
        expect(move.from).toBeNull();
      }
    }
  });

  it('rota oeste/ponte: 14 passos, 2/2, 3 vidas, 5 moedas, sem dano', () => {
    const game = setup(P2_LEVEL);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of WEST.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        index === 0 ? 'rotated' : index === 12 ? 'toggled' : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);
    }

    expect(game.state.step).toBe(14);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual(WEST_COINS);

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('janela: ponte em 8/11, split em 10/13; o rearme é o passo 13', () => {
    const game = setup(P2_LEVEL);

    // Passos 1–10: o vermelho chega ao split e o azul ao merge.
    run(game, WEST.slice(0, 10));

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(5, 2),
      incoming: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 2),
      incoming: 'north',
    });

    // Passo 11: o vermelho entrega e o azul chega à ponte.
    game.apply(WEST[10]!);

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(3, 2),
      incoming: 'east',
    });

    // Passo 12: o azul em (4,2) ainda vê @ (X).
    game.apply(WEST[11]!);

    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(4, 2),
      incoming: 'east',
    });
    expect(game.prediction('blue')?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 1),
      correct: false,
    });

    // Passo 13: o azul chega ao split; o toggle rearma para S.
    const window = game.apply(WEST[12]!);

    expect(window.outcome.kind).toBe('toggled');
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(5, 2),
      incoming: 'east',
    });
    expect(yAt(game, pos(5, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 1,
      next: 'rotate',
    });
    expect(game.prediction('blue')?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 3),
      correct: true,
    });

    // Passo 14: entrega do azul.
    game.apply(WEST[13]!);

    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
  });

  it('atalho leste: 11 passos, 3 moedas, sem merge/ponte/split', () => {
    const game = setup(P2_LEVEL);
    const allEvents = run(game, EAST);

    expect(game.state.step).toBe(11);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual(EAST_COINS);
    expect(yAt(game, pos(5, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('sacrifício de água: ignorar (2,3) afunda o azul e vence 1/2', () => {
    const game = setup(P2_LEVEL);

    // Passos 1–10: o azul entra em (2,3) rot 2 e desce para (2,4).
    run(game, WATER.slice(0, 10));

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(5, 2),
      incoming: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 4),
      incoming: 'south',
    });

    // Passo 11: a rampa N–L joga o azul na água; o vermelho entrega junto.
    const last = game.apply(WATER[10]!);

    expect(game.state.step).toBe(11);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'water',
    });
    expect(game.state.coinsCollected).toEqual(WEST_COINS);
    expect(derailsOf(last.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(3, 4),
        direction: 'east',
        reason: 'water',
      },
    ]);
    expect(lifeLossesOf(last.events)).toEqual([
      { kind: 'lifeLost', step: 11, remaining: 2 },
    ]);
    expect(eventKinds(last.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainDelivered',
      'trainDerailed',
      'lifeLost',
      'victory',
    ]);
  });

  it('janela ignorada: sem o toggle do 13, o azul morre em @ e vence 1/2', () => {
    const game = setup(P2_LEVEL);
    const allEvents = run(game, WRONG_STATION);

    expect(game.state.step).toBe(14);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(game.state.coinsCollected).toEqual(WEST_COINS);
    expect(yAt(game, pos(5, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });

    const last = allEvents.filter(
      (event) => event.kind === 'trainDerailed' || event.kind === 'victory',
    );

    expect(last.map((event) => event.kind)).toEqual([
      'trainDerailed',
      'victory',
    ]);
  });

  it('Q5: toggle cedo do split mata o VERMELHO; esperar era o certo', () => {
    const game = setup(P2_LEVEL);
    const allEvents = run(game, EARLY_TOGGLE);

    expect(game.state.step).toBe(14);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual(WEST_COINS);

    expect(derailsOf(allEvents)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'red',
      at: pos(5, 3),
      direction: 'south',
      reason: 'wrongStation',
    });
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 11, remaining: 2 },
    ]);
  });
});
