/**
 * Fase P3 «Densidade+» — testes da prova de carga (E19, 4 trens).
 *
 * O tabuleiro é o do P3 com três células ocupadas pelo laranja: a entrada
 * (3,5), a reta (3,4) e a estação (3,3). Este arquivo testa o DADO da fase
 * (o par laranja/diamante, a rota curta automática, a vitória 4/4), o `lost`
 * com 4 trens e as receitas de colisão do nó, agora no tabuleiro da carga.
 */

import { describe, expect, it } from 'vitest';
import type {
  Action,
  Game,
  GameEvent,
  Prediction,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { resolveStep } from '../../src/core/step';
import { P3_LEVEL } from '../../src/level/p3';
import { P3_OVERLOAD } from '../../src/level/p3-overload';
import { firstHintTarget } from '../../src/render/fx';
import {
  collisionsOf,
  crossing,
  derailsOf,
  eventKinds,
  gameState,
  lifeLossesOf,
  mountain,
  pos,
  runningTrain,
  straight,
  trainInState,
  tunnel,
  y,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };

/** Solução oficial (15 ações): a mesma do P3; o laranja é automático. */
const SOLUTION: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 4) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  { kind: 'tap', cell: pos(4, 2) },
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
];

/** `lost`: azul (2,1) no 1, verde sem toggle no 6, vermelho sem toggle no 10. */
const LOST: readonly Action[] = [
  { kind: 'tap', cell: pos(2, 1) },
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

/** Roda uma sequência e coleta os eventos. */
function run(game: Game, actions: readonly Action[]): GameEvent[] {
  const events: GameEvent[] = [];

  for (const action of actions) {
    const result = game.apply(action);

    events.push(...result.events);
  }

  return events;
}

describe('P3 «Densidade+» — contrato do dado (4 trens)', () => {
  it('mesmo tabuleiro do P3 + laranja/diamante em (3,3), (3,4) e (3,5)', () => {
    const board = P3_OVERLOAD.board;
    const game = setup(P3_OVERLOAD);
    const red = trainInState(game.state, 'red');
    const blue = trainInState(game.state, 'blue');
    const green = trainInState(game.state, 'green');
    const orange = trainInState(game.state, 'orange');

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P3_OVERLOAD.lives).toBe(3);
    expect(P3_OVERLOAD.trains).toHaveLength(4);

    expect(red.shape).toBe('circle');
    expect(blue.shape).toBe('square');
    expect(green.shape).toBe('triangle');
    expect(orange.shape).toBe('diamond');
    expect(orange.color).toBe('#c77d2b');
    expect(new Set([red.color, blue.color, green.color, orange.color]).size).toBe(4);

    // O tabuleiro é o mesmo do P3 fora das três células do laranja.
    const orangeCells = [pos(3, 3), pos(3, 4), pos(3, 5)];

    for (let row = 0; row < board.height; row += 1) {
      for (let col = 0; col < board.width; col += 1) {
        const cell = pos(col, row);
        const isOrange = orangeCells.some(
          (candidate) => candidate.col === col && candidate.row === row,
        );

        if (!isOrange) {
          expect(cellAt(board, cell)).toEqual(cellAt(P3_LEVEL.board, cell));
        }
      }
    }

    expect(cellAt(board, pos(3, 3))).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: orange.color,
        shape: orange.shape,
      },
    });
    expect(cellAt(board, pos(3, 4))).toEqual(straight(0));
    expect(cellAt(board, pos(3, 5))).toEqual(straight(0));

    // O centro congestionado: X, estação laranja, Y vermelho e montanha.
    expect(cellAt(board, pos(2, 2))).toEqual(crossing());
    expect(cellAt(board, pos(4, 2))).toEqual(y(3, 1));
    expect(cellAt(board, pos(4, 3))).toEqual(mountain());

    expect(P3_OVERLOAD.coins).toEqual(P3_LEVEL.coins);
    expect(cellAt(board, pos(1, 4))).toEqual(tunnel(pos(4, 4)));
    expect(cellAt(board, pos(4, 4))).toEqual(tunnel(pos(1, 4)));

    expect(P3_OVERLOAD.trains[3]?.entry).toEqual({
      cell: pos(3, 5),
      direction: 'north',
    });
  });

  it('primeiro quadro: 4 previsões, laranja em @ (3,3), sem hint D6', () => {
    const game = setup(P3_OVERLOAD);
    const predictions = predictionsOf(game);
    const red = predictions.find((prediction) => prediction.trainId === 'red');
    const blue = predictions.find((prediction) => prediction.trainId === 'blue');
    const green = predictions.find((prediction) => prediction.trainId === 'green');
    const orange = predictions.find(
      (prediction) => prediction.trainId === 'orange',
    );

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);
    expect(predictions).toHaveLength(4);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('waiting');
    }

    expect(red?.stop).toEqual({ kind: 'mountain', cell: pos(4, 3) });
    expect(blue?.stop).toEqual({
      kind: 'station',
      cell: pos(2, 5),
      correct: true,
    });
    expect(green?.stop).toEqual({ kind: 'noExit', cell: pos(5, 5) });
    expect(orange?.path).toEqual([pos(3, 5), pos(3, 4), pos(3, 3)]);
    expect(orange?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 3),
      correct: true,
    });

    // A carga é atencional: a rota laranja não compartilha célula com as outras.
    const orangePath = new Set(
      (orange?.path ?? []).map((cell) => `${cell.col},${cell.row}`),
    );

    for (const prediction of [red, blue, green]) {
      for (const cell of prediction?.path ?? []) {
        expect(orangePath.has(`${cell.col},${cell.row}`)).toBe(false);
      }
    }

    expect(firstHintTarget(game.state, predictions)).toBeNull();
  });

  it('os 4 trens entram no passo 1; o laranja segue automático até @', () => {
    const game = setup(P3_OVERLOAD);
    const result = game.apply(SOLUTION[0]!);

    expect(result.advanced).toBe(true);
    expect(result.outcome.kind).toBe('toggled');
    expect(game.state.step).toBe(1);

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 0),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'running',
      cell: pos(0, 5),
      incoming: 'north',
    });
    expect(trainInState(game.state, 'orange').status).toEqual({
      kind: 'running',
      cell: pos(3, 5),
      incoming: 'north',
    });

    const moves = result.events.filter((event) => event.kind === 'trainMoved');

    expect(moves).toHaveLength(4);

    for (const move of moves) {
      if (move.kind === 'trainMoved') {
        expect(move.from).toBeNull();
      }
    }

    // O laranja não precisa de ação: (3,5) 1 → (3,4) 2 → @ (3,3) 3.
    game.apply(PASS);
    expect(trainInState(game.state, 'orange').status).toEqual({
      kind: 'running',
      cell: pos(3, 4),
      incoming: 'north',
    });

    game.apply(PASS);
    expect(trainInState(game.state, 'orange').status).toEqual({
      kind: 'delivered',
    });
  });
});

describe('P3 «Densidade+» — solução e carga', () => {
  it('15 passos entregam 4/4, 3 vidas, 3 moedas; o laranja entrega no 3', () => {
    const game = setup(P3_OVERLOAD);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        index === 0 || index === 8 ? 'toggled' : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);

      if (index === 2) {
        expect(trainInState(game.state, 'orange').status).toEqual({
          kind: 'delivered',
        });
      }
    }

    expect(game.state.step).toBe(15);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'orange').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(2, 2),
      pos(1, 2),
      pos(3, 2),
    ]);

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('lost com 4 trens: 3 perdas zeram as vidas no 10; o laranja já entregou', () => {
    const game = setup(P3_OVERLOAD);
    const allEvents = run(game, LOST);

    expect(game.state.step).toBe(10);
    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);

    expect(trainInState(game.state, 'orange').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'mountain',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });

    expect(game.state.coinsCollected).toEqual([
      pos(1, 2),
      pos(2, 2),
      pos(3, 2),
    ]);

    expect(derailsOf(allEvents)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(2, 1),
        direction: 'south',
        reason: 'noExit',
      },
      {
        kind: 'trainDerailed',
        trainId: 'green',
        at: pos(5, 5),
        direction: 'south',
        reason: 'noExit',
      },
      {
        kind: 'trainDerailed',
        trainId: 'red',
        at: pos(4, 3),
        direction: 'south',
        reason: 'mountain',
      },
    ]);
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
      { kind: 'lifeLost', step: 6, remaining: 1 },
      { kind: 'lifeLost', step: 10, remaining: 0 },
    ]);
  });

  it('receitas de colisão continuam encenáveis com o 4º trem no tabuleiro', () => {
    const red = P3_OVERLOAD.trains.find((train) => train.id === 'red');
    const blue = P3_OVERLOAD.trains.find((train) => train.id === 'blue');
    const orange = P3_OVERLOAD.trains.find((train) => train.id === 'orange');

    const crossingResult = resolveStep(
      gameState(
        P3_OVERLOAD.board,
        [
          runningTrain('red', red!.color, red!.shape, pos(1, 2), 'north'),
          runningTrain('blue', blue!.color, blue!.shape, pos(2, 1), 'south'),
          runningTrain('orange', orange!.color, orange!.shape, pos(3, 4), 'north'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(crossingResult.events)).toHaveLength(1);
    expect(collisionsOf(crossingResult.events)[0]?.cells).toEqual([pos(2, 2)]);
    expect(derailsOf(crossingResult.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(crossingResult.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(
      crossingResult.events.filter((event) => event.kind === 'trainDelivered'),
    ).toEqual([
      { kind: 'trainDelivered', trainId: 'orange', station: pos(3, 3) },
    ]);

    const tunnelResult = resolveStep(
      gameState(
        P3_OVERLOAD.board,
        [
          runningTrain('red', red!.color, red!.shape, pos(1, 4), 'east'),
          runningTrain('blue', blue!.color, blue!.shape, pos(4, 4), 'west'),
          runningTrain('orange', orange!.color, orange!.shape, pos(3, 4), 'north'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(tunnelResult.events)).toHaveLength(1);
    expect(collisionsOf(tunnelResult.events)[0]?.cells).toEqual([
      pos(4, 4),
      pos(1, 4),
    ]);
    expect(derailsOf(tunnelResult.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(tunnelResult.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(
      tunnelResult.events.filter((event) => event.kind === 'trainDelivered'),
    ).toEqual([
      { kind: 'trainDelivered', trainId: 'orange', station: pos(3, 3) },
    ]);
  });
});
