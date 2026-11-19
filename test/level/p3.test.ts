/**
 * Fase P3 «Densidade» — testes da fase DEFINITIVA (E19, 3 trens).
 *
 * O core (`test/core/*`) cobre túnel/cruzamento/montanha genéricos; este
 * arquivo testa o DADO da fase: o tabuleiro 6×6, os 3 pares, as duas janelas
 * de Y, o laço longo do vermelho, o túnel do verde, o X compartilhado, as
 * moedas e as rotas de falha/sacrifício. Substitui o fumaça do rascunho.
 */

import { describe, expect, it } from 'vitest';
import type {
  Action,
  CellPos,
  Game,
  GameEvent,
  Prediction,
  TrainStatus,
  YPiece,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { resolveStep } from '../../src/core/step';
import { P3_LEVEL } from '../../src/level/p3';
import { firstHintTarget } from '../../src/render/fx';
import {
  collisionsOf,
  crossing,
  curve,
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
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };

/**
 * Solução oficial (15 ações): abre o Y verde, espera o vermelho chegar ao Y,
 * abre o Y vermelho na boca do Y e espera a entrega.
 */
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

/** Ys consertados cedo: prova que a janela é larga, não um timing de 1 passo. */
const EARLY_YS: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 4) },
  { kind: 'tap', cell: pos(4, 2) },
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

/** Y vermelho esquecido: o vermelho morre na montanha no passo 10. */
const RED_FORGOTTEN: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 4) },
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
  PASS,
];

/** Y verde esquecido: o verde morre em (5,5) no passo 6; o vermelho entrega. */
const GREEN_FORGOTTEN: readonly Action[] = [
  { kind: 'tap', cell: pos(4, 2) },
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
  PASS,
];

/**
 * `lost`: três perdas independentes — azul (2,1) rotacionada no 1, verde sem
 * toggle no 6, vermelho sem toggle no 10. O vermelho ainda coleta as 3 moedas.
 */
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

interface StepExpectation {
  readonly red: TrainStatus;
  readonly blue: TrainStatus;
  readonly green: TrainStatus;
  readonly coins: readonly CellPos[];
}

/** Snapshot esperado depois de cada ação da solução oficial. */
const EXPECTED: readonly StepExpectation[] = [
  {
    red: { kind: 'running', cell: pos(0, 0), incoming: 'south' },
    blue: { kind: 'running', cell: pos(2, 0), incoming: 'south' },
    green: { kind: 'running', cell: pos(0, 5), incoming: 'north' },
    coins: [],
  },
  {
    red: { kind: 'running', cell: pos(0, 1), incoming: 'south' },
    blue: { kind: 'running', cell: pos(2, 1), incoming: 'south' },
    green: { kind: 'running', cell: pos(0, 4), incoming: 'north' },
    coins: [],
  },
  {
    red: { kind: 'running', cell: pos(0, 2), incoming: 'south' },
    blue: { kind: 'running', cell: pos(2, 2), incoming: 'south' },
    green: { kind: 'running', cell: pos(1, 4), incoming: 'east' },
    coins: [pos(2, 2)],
  },
  {
    red: { kind: 'running', cell: pos(0, 3), incoming: 'south' },
    blue: { kind: 'running', cell: pos(2, 3), incoming: 'south' },
    green: {
      kind: 'running',
      cell: pos(4, 4),
      incoming: 'east',
      justTunneled: true,
    },
    coins: [pos(2, 2)],
  },
  {
    red: { kind: 'running', cell: pos(1, 3), incoming: 'east' },
    blue: { kind: 'running', cell: pos(2, 4), incoming: 'south' },
    green: { kind: 'running', cell: pos(5, 4), incoming: 'east' },
    coins: [pos(2, 2)],
  },
  {
    red: { kind: 'running', cell: pos(1, 2), incoming: 'north' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2)],
  },
  {
    red: { kind: 'running', cell: pos(2, 2), incoming: 'east' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2)],
  },
  {
    red: { kind: 'running', cell: pos(3, 2), incoming: 'east' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(4, 2), incoming: 'east' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(4, 1), incoming: 'north' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(3, 1), incoming: 'west' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(3, 0), incoming: 'north' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(4, 0), incoming: 'east' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'running', cell: pos(5, 0), incoming: 'east' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
  {
    red: { kind: 'delivered' },
    blue: { kind: 'delivered' },
    green: { kind: 'delivered' },
    coins: [pos(2, 2), pos(1, 2), pos(3, 2)],
  },
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

describe('P3 «Densidade» — contrato do dado (3 trens)', () => {
  it('6×6, 3 pares, 3 estações e o verde/triângulo declarado no nível', () => {
    const board = P3_LEVEL.board;
    const game = setup(P3_LEVEL);
    const red = trainInState(game.state, 'red');
    const blue = trainInState(game.state, 'blue');
    const green = trainInState(game.state, 'green');

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P3_LEVEL.lives).toBe(3);
    expect(P3_LEVEL.trains).toHaveLength(3);

    expect(red.shape).toBe('circle');
    expect(blue.shape).toBe('square');
    expect(green.shape).toBe('triangle');
    expect(green.color).toBe('#3f8f5f');
    expect(new Set([red.color, blue.color, green.color]).size).toBe(3);

    expect(cellAt(board, pos(5, 1))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: red.color, shape: red.shape },
    });
    expect(cellAt(board, pos(2, 5))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });
    expect(cellAt(board, pos(5, 3))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: green.color, shape: green.shape },
    });
  });

  it('entradas-peça (D13), túnel simétrico, X, montanha e os dois Ys', () => {
    const board = P3_LEVEL.board;

    expect(P3_LEVEL.trains[0]?.entry).toEqual({
      cell: pos(0, 0),
      direction: 'south',
    });
    expect(P3_LEVEL.trains[1]?.entry).toEqual({
      cell: pos(2, 0),
      direction: 'south',
    });
    expect(P3_LEVEL.trains[2]?.entry).toEqual({
      cell: pos(0, 5),
      direction: 'north',
    });

    for (const train of P3_LEVEL.trains) {
      expect(cellAt(board, train.entry.cell)?.kind).toBe('piece');
    }

    const tunnels: { cell: CellPos; exit: CellPos }[] = [];

    for (let row = 0; row < board.height; row += 1) {
      for (let col = 0; col < board.width; col += 1) {
        const cell = cellAt(board, pos(col, row));

        if (cell?.kind === 'fixed' && cell.fixed.kind === 'tunnel') {
          tunnels.push({ cell: pos(col, row), exit: cell.fixed.exit });
        }
      }
    }

    expect(tunnels).toEqual([
      { cell: pos(1, 4), exit: pos(4, 4) },
      { cell: pos(4, 4), exit: pos(1, 4) },
    ]);
    expect(cellAt(board, pos(1, 4))).toEqual(tunnel(pos(4, 4)));
    expect(cellAt(board, pos(4, 4))).toEqual(tunnel(pos(1, 4)));
    expect(cellAt(board, pos(2, 2))).toEqual(crossing());
    expect(cellAt(board, pos(4, 3))).toEqual(mountain());

    // A rota do vermelho passa pelo X e pelo Y; o Y nasce no braço fatal (S).
    expect(cellAt(board, pos(3, 2))).toEqual(straight(1));
    expect(cellAt(board, pos(4, 1))).toEqual(curve(2));
    expect(cellAt(board, pos(3, 1))).toEqual(curve(0));

    const game = setup(P3_LEVEL);

    expect(yAt(game, pos(4, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 1,
      next: 'toggle',
    });
    expect(yAt(game, pos(5, 4))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 1,
      next: 'toggle',
    });

    expect(P3_LEVEL.coins).toEqual([
      pos(1, 2),
      pos(2, 2),
      pos(3, 2),
    ]);

    for (const coin of P3_LEVEL.coins ?? []) {
      expect(cellAt(board, coin)?.kind).toBe('piece');
    }
  });

  it('primeiro quadro: vermelho na montanha, verde no vazio, azul em @; sem hint D6', () => {
    const game = setup(P3_LEVEL);
    const predictions = predictionsOf(game);
    const red = predictions.find((prediction) => prediction.trainId === 'red');
    const blue = predictions.find((prediction) => prediction.trainId === 'blue');
    const green = predictions.find((prediction) => prediction.trainId === 'green');

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('waiting');
    }

    // O laço do vermelho atravessa o X e o Y antes de terminar na montanha.
    expect(red?.path).toEqual([
      pos(0, 0),
      pos(0, 1),
      pos(0, 2),
      pos(0, 3),
      pos(1, 3),
      pos(1, 2),
      pos(2, 2),
      pos(3, 2),
      pos(4, 2),
      pos(4, 3),
    ]);
    expect(red?.stop).toEqual({ kind: 'mountain', cell: pos(4, 3) });

    expect(blue?.path).toEqual([
      pos(2, 0),
      pos(2, 1),
      pos(2, 2),
      pos(2, 3),
      pos(2, 4),
      pos(2, 5),
    ]);
    expect(blue?.stop).toEqual({
      kind: 'station',
      cell: pos(2, 5),
      correct: true,
    });

    expect(green?.path).toEqual([
      pos(0, 5),
      pos(0, 4),
      pos(1, 4),
      pos(4, 4),
      pos(5, 4),
      pos(5, 5),
    ]);
    expect(green?.stop).toEqual({ kind: 'noExit', cell: pos(5, 5) });

    // D6 era do tutorial; nenhuma previsão para em peça.
    expect(firstHintTarget(game.state, predictions)).toBeNull();
  });

  it('os 3 trens entram no passo 1 pela primeira célula-peça (D13)', () => {
    const game = setup(P3_LEVEL);
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

    const moves = result.events.filter((event) => event.kind === 'trainMoved');

    expect(moves).toHaveLength(3);

    for (const move of moves) {
      if (move.kind === 'trainMoved') {
        expect(move.from).toBeNull();
      }
    }

    // O toggle do passo 1 já conserta a previsão do verde.
    expect(game.prediction('green')?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 3),
      correct: true,
    });
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'mountain',
      cell: pos(4, 3),
    });
  });
});

describe('P3 «Densidade» — solução documentada', () => {
  it('15 passos entregam 3/3, 3 vidas, 3 moedas, sem dano', () => {
    const game = setup(P3_LEVEL);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        index === 0 || index === 8 ? 'toggled' : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);
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
    expect(game.state.coinsCollected).toEqual([
      pos(2, 2),
      pos(1, 2),
      pos(3, 2),
    ]);

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).filter((kind) => kind === 'coinCollected')).toHaveLength(3);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('passo a passo: X no 7, Y no 9, túnel no 3–4 e laço até o 15', () => {
    const game = setup(P3_LEVEL);

    for (const [index, action] of SOLUTION.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);

      const expected = EXPECTED[index]!;

      expect(trainInState(game.state, 'red').status).toEqual(expected.red);
      expect(trainInState(game.state, 'blue').status).toEqual(expected.blue);
      expect(trainInState(game.state, 'green').status).toEqual(expected.green);
      expect(game.state.coinsCollected).toEqual(expected.coins);
    }

    // O verde atravessa o túnel no passo 4 e sai no 5.
    expect(EXPECTED[3]?.green).toEqual({
      kind: 'running',
      cell: pos(4, 4),
      incoming: 'east',
      justTunneled: true,
    });
  });

  it('Ys consertados cedo: a janela é larga; 3/3 sem tocar de novo', () => {
    const game = setup(P3_LEVEL);
    const allEvents = run(game, EARLY_YS);

    expect(game.state.step).toBe(15);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(2, 2),
      pos(1, 2),
      pos(3, 2),
    ]);
    expect(yAt(game, pos(4, 2))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'rotate',
    });
    expect(yAt(game, pos(5, 4))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'rotate',
    });
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
  });
});

describe('P3 «Densidade» — sacrifício e falhas encenáveis', () => {
  it('Y vermelho esquecido: montanha no 10; azul/verde vencem 2/3', () => {
    const game = setup(P3_LEVEL);

    // Passos 1–9: o vermelho chega ao Y com o braço fatal (S).
    for (const action of RED_FORGOTTEN.slice(0, 9)) {
      game.apply(action);
    }

    expect(game.state.step).toBe(9);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(4, 2),
      incoming: 'east',
    });
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'mountain',
      cell: pos(4, 3),
    });

    // Passo 10: o braço S joga o vermelho na montanha; azul/verde já entregaram.
    const result = game.apply(RED_FORGOTTEN[9]!);

    expect(result.advanced).toBe(true);
    expect(game.state.step).toBe(10);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'mountain',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(2, 2),
      pos(1, 2),
      pos(3, 2),
    ]);

    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'red',
        at: pos(4, 3),
        direction: 'south',
        reason: 'mountain',
      },
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 10, remaining: 2 },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'victory',
    ]);
  });

  it('Y verde esquecido: vazio no 6; o vermelho entrega e vence 2/3', () => {
    const game = setup(P3_LEVEL);

    // Passos 1–5: o verde chega ao Y com o braço fatal (S).
    for (const action of GREEN_FORGOTTEN.slice(0, 5)) {
      game.apply(action);
    }

    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'running',
      cell: pos(5, 4),
      incoming: 'east',
    });
    expect(game.prediction('green')?.stop).toEqual({
      kind: 'noExit',
      cell: pos(5, 5),
    });

    const allEvents: GameEvent[] = [];

    for (const action of GREEN_FORGOTTEN.slice(5)) {
      const result = game.apply(action);

      allEvents.push(...result.events);
    }

    expect(game.state.step).toBe(15);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(2, 2),
      pos(1, 2),
      pos(3, 2),
    ]);

    expect(derailsOf(allEvents)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'green',
        at: pos(5, 5),
        direction: 'south',
        reason: 'noExit',
      },
    ]);
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 6, remaining: 2 },
    ]);
  });

  it('lost em conteúdo: três perdas independentes zeram as vidas no 10', () => {
    const game = setup(P3_LEVEL);
    const allEvents = run(game, LOST);

    expect(game.state.step).toBe(10);
    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

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

    // O vermelho herda a moeda do X que o azul não coletou.
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

    // Depois do `lost`, o motor ignora novas ações.
    const after = game.apply(PASS);

    expect(after.advanced).toBe(false);
    expect(game.state.step).toBe(10);
  });
});

describe('P3 «Densidade» — receitas de colisão (fabricadas no tabuleiro real)', () => {
  it('cruzamento simultâneo: os dois trens chegam ao X (2,2) no mesmo passo', () => {
    const red = P3_LEVEL.trains.find((train) => train.id === 'red');
    const blue = P3_LEVEL.trains.find((train) => train.id === 'blue');

    const result = resolveStep(
      gameState(
        P3_LEVEL.board,
        [
          // O vermelho vem do sul de (1,2) e a curva o joga para leste;
          // o azul desce de (2,1). Os dois chegam ao X no mesmo passo.
          runningTrain('red', red!.color, red!.shape, pos(1, 2), 'north'),
          runningTrain('blue', blue!.color, blue!.shape, pos(2, 1), 'south'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([pos(2, 2)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
  });

  it('swap do túnel: os dois portais reais trocam no mesmo passo e colidem', () => {
    const red = P3_LEVEL.trains.find((train) => train.id === 'red');
    const blue = P3_LEVEL.trains.find((train) => train.id === 'blue');

    const result = resolveStep(
      gameState(
        P3_LEVEL.board,
        [
          runningTrain('red', red!.color, red!.shape, pos(1, 4), 'east'),
          runningTrain('blue', blue!.color, blue!.shape, pos(4, 4), 'west'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([
      pos(4, 4),
      pos(1, 4),
    ]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
  });
});
