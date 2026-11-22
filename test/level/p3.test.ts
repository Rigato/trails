/**
 * Fase P3 «Densidade» — testes da fase PUBLICADA do M6 (D23/D24).
 *
 * O P3 do E19 (3 trens/3 moedas) fica congelado em `P3_LEVEL` para a
 * Densidade+ (M9); este arquivo testa `P3_DENSITY`: o esqueleto didático
 * (túnel, cruzamento, montanha, 2 Ys) + o primeiro xadrez — a rota SEGURA
 * (3/3 sem moedas) e a PERFEITA (3/3 com 4/4 moedas, mais ações e uma janela
 * de 2 passos na curva da montanha).
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
import { resolveStep } from '../../src/core/step';
import { P3_DENSITY, P3_LEVEL } from '../../src/level/p3';
import { sealCondition } from '../../src/save/economy';
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
  y,
} from '../core/helpers';

const PASS: Action = { kind: 'pass' };

/** Primeiro conserto: a reta (2,4) nasce E–O e o azul morre nela. */
const BLUE_FIX: Action = { kind: 'tap', cell: pos(2, 4) };
/** Y verde: arm 0 (N, sem saída) → arm 1 (S, estação). */
const GREEN_FIX: Action = { kind: 'tap', cell: pos(5, 4) };
/** Y vermelho: arm 0 (N, seguro) → arm 1 (S, laço de moedas). */
const RED_SWITCH: Action = { kind: 'tap', cell: pos(4, 1) };
/** Curva (4,3): rot 3 (O–N, montanha) → rot 0 (N–E, perfeita). */
const RED_CURVE: Action = { kind: 'tap', cell: pos(4, 3) };

/**
 * Rota SEGURA — 12 ações: conserta o azul, abre o verde e espera o vermelho
 * pelo braço norte. Coleta 0/4; vence 3/3.
 */
const SAFE: readonly Action[] = [
  BLUE_FIX, // 1
  GREEN_FIX, // 2
  PASS, // 3
  PASS, // 4
  PASS, // 5
  PASS, // 6
  PASS, // 7
  PASS, // 8
  PASS, // 9
  PASS, // 10
  PASS, // 11
  PASS, // 12 — vermelho em @ (5,0)
];

/**
 * Rota PERFEITA — 16 ações: o mesmo começo, mas o Y vermelho é aberto no
 * passo 10 e a curva da montanha é consertada no 11. Coleta 4/4; vence 3/3.
 */
const PERFECT: readonly Action[] = [
  BLUE_FIX, // 1
  GREEN_FIX, // 2
  PASS, // 3
  PASS, // 4
  PASS, // 5
  PASS, // 6
  PASS, // 7
  PASS, // 8
  PASS, // 9
  RED_SWITCH, // 10 — último instante antes do Y
  RED_CURVE, // 11 — a curva corrige antes do passo 12
  PASS, // 12
  PASS, // 13
  PASS, // 14
  PASS, // 15
  PASS, // 16 — vermelho em @ (5,0)
];

/** Azul esquecido: verde consertado, azul morre em (2,4) no 5. */
const BLUE_FORGOTTEN: readonly Action[] = [
  GREEN_FIX,
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

/** Verde esquecido: azul consertado, verde morre em (5,3) no 6. */
const GREEN_FORGOTTEN: readonly Action[] = [
  BLUE_FIX,
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

/** Vermelho na montanha: Y aberto no 10, curva não consertada; morre no 13. */
const RED_MOUNTAIN: readonly Action[] = [
  BLUE_FIX,
  GREEN_FIX,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  PASS,
  RED_SWITCH, // 10
  PASS, // 11
  PASS, // 12
  PASS, // 13 — montanha
];

/** Três erros: azul no 5, verde no 6, vermelho na montanha no 13 → lost. */
const LOST: readonly Action[] = [
  PASS, // 1
  PASS, // 2
  PASS, // 3
  PASS, // 4
  PASS, // 5 — azul morre em (2,4)
  PASS, // 6 — verde morre em (5,3)
  PASS, // 7
  PASS, // 8
  PASS, // 9
  RED_SWITCH, // 10
  PASS, // 11
  PASS, // 12
  PASS, // 13 — vermelho na montanha; vidas 0
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

describe('P3 «Densidade» (M6) — contrato do dado', () => {
  it('6×6, 3 pares, 3 estações, 3 vidas; P3_LEVEL é a referência E19', () => {
    const board = P3_DENSITY.board;
    const game = setup(P3_DENSITY);
    const red = trainInState(game.state, 'red');
    const blue = trainInState(game.state, 'blue');
    const green = trainInState(game.state, 'green');

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P3_DENSITY.lives).toBe(3);
    expect(P3_DENSITY.trains).toHaveLength(3);
    expect(P3_DENSITY.tutorial).toBe(true);
    expect(P3_DENSITY.selectorHint).toBeUndefined();

    expect(red.shape).toBe('circle');
    expect(blue.shape).toBe('square');
    expect(green.shape).toBe('triangle');
    expect(new Set([red.color, blue.color, green.color]).size).toBe(3);

    expect(cellAt(board, pos(5, 0))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: red.color, shape: red.shape },
    });
    expect(cellAt(board, pos(2, 5))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });
    expect(cellAt(board, pos(5, 5))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: green.color, shape: green.shape },
    });

    expect(P3_DENSITY.trains[0]?.entry).toEqual({
      cell: pos(0, 0),
      direction: 'south',
    });
    expect(P3_DENSITY.trains[1]?.entry).toEqual({
      cell: pos(2, 0),
      direction: 'south',
    });
    expect(P3_DENSITY.trains[2]?.entry).toEqual({
      cell: pos(0, 5),
      direction: 'north',
    });

    for (const train of P3_DENSITY.trains) {
      expect(cellAt(board, train.entry.cell)?.kind).toBe('piece');
    }

    // O P3 do E19 continua no arquivo, com id próprio, para a Densidade+.
    expect(P3_LEVEL.id).toBe('p3-densidade');
    expect(P3_DENSITY.id).toBe('p3-densidade-tutorial');
    expect(P3_DENSITY.id).not.toBe(P3_LEVEL.id);
    expect(P3_LEVEL.coins).toHaveLength(3);
  });

  it('túnel simétrico, X, montanha, 2 Ys e as 4 moedas sobre trilho', () => {
    const board = P3_DENSITY.board;

    expect(cellAt(board, pos(1, 4))).toEqual(tunnel(pos(4, 4)));
    expect(cellAt(board, pos(4, 4))).toEqual(tunnel(pos(1, 4)));
    expect(cellAt(board, pos(2, 2))).toEqual(crossing());
    expect(cellAt(board, pos(3, 3))).toEqual(mountain());

    const game = setup(P3_DENSITY);

    expect(yAt(game, pos(4, 1))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });
    expect(yAt(game, pos(5, 4))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });

    let yCount = 0;

    for (const cell of board.rows.flat()) {
      if (cell.kind === 'piece' && cell.piece.kind === 'y') {
        yCount += 1;
      }
    }

    expect(yCount).toBe(2);

    // A curva da montanha nasce um quarto antes da correta; o azul nasce torto.
    expect(cellAt(board, pos(4, 3))).toEqual(curve(3));
    expect(cellAt(board, pos(2, 4))).toEqual(straight(1));
    expect(cellAt(board, pos(5, 4))).toEqual(y(3, 0, 'toggle'));

    expect(P3_DENSITY.coins).toEqual([
      pos(4, 2),
      pos(4, 3),
      pos(5, 3),
      pos(5, 2),
    ]);

    for (const coin of P3_DENSITY.coins ?? []) {
      expect(cellAt(board, coin)?.kind).toBe('piece');
    }
  });

  it('primeiro quadro: azul/verde anunciados; o halo D6 aponta (2,4)', () => {
    const game = setup(P3_DENSITY);
    const predictions = predictionsOf(game);
    const red = predictions.find((prediction) => prediction.trainId === 'red');
    const blue = predictions.find((prediction) => prediction.trainId === 'blue');
    const green = predictions.find(
      (prediction) => prediction.trainId === 'green',
    );

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('waiting');
    }

    // A rota segura já está montada: o vermelho vê @ (5,0) sem tocar em nada.
    expect(red?.stop).toEqual({
      kind: 'station',
      cell: pos(5, 0),
      correct: true,
    });
    expect(red?.path).not.toContainEqual(pos(4, 2));

    // O azul avisa a peça torta (2,4); o verde avisa o braço N do Y (5,3).
    expect(blue?.stop).toEqual({ kind: 'noExit', cell: pos(2, 4) });
    expect(green?.stop).toEqual({ kind: 'noExit', cell: pos(5, 3) });

    // O halo D6 é o primeiro conserto: a reta do azul.
    expect(firstHintTarget(game.state, predictions)).toEqual(pos(2, 4));
  });
});

describe('P3 «Densidade» (M6) — os dois andares de sucesso', () => {
  it('rota SEGURA: 12 ações, 3/3, 3 vidas, 0/4 moedas (sem selo)', () => {
    const game = setup(P3_DENSITY);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SAFE.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        index === 0 ? 'rotated' : index === 1 ? 'toggled' : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);
    }

    expect(SAFE).toHaveLength(12);
    expect(game.state.step).toBe(12);
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
    expect(game.state.coinsCollected).toEqual([]);

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);

    expect(
      sealCondition({
        delivered: 3,
        trainTotal: P3_DENSITY.trains.length,
        coins: game.state.coinsCollected.length,
        coinsTotal: P3_DENSITY.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(false);

    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('rota PERFEITA: 16 ações, 3/3, 4/4 moedas, selo bancável', () => {
    const game = setup(P3_DENSITY);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of PERFECT.entries()) {
      const result = game.apply(action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        index === 0
          ? 'rotated'
          : index === 1 || index === 9
            ? 'toggled'
            : index === 10
              ? 'rotated'
              : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);
    }

    expect(PERFECT).toHaveLength(16);
    expect(PERFECT.length).toBeGreaterThan(SAFE.length);
    expect(game.state.step).toBe(16);
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
      pos(4, 2),
      pos(4, 3),
      pos(5, 3),
      pos(5, 2),
    ]);
    expect(game.state.coinsCollected).toHaveLength(
      P3_DENSITY.coins?.length ?? 0,
    );
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: P3_DENSITY.trains.length,
        coins: game.state.coinsCollected.length,
        coinsTotal: P3_DENSITY.coins?.length ?? 0,
        consumableUsed: false,
      }),
    ).toBe(true);

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('passo a passo da PERFEITA: Y no 10, curva no 11, moedas 11–14', () => {
    const game = setup(P3_DENSITY);

    for (const action of PERFECT.slice(0, 10)) {
      game.apply(action);
    }

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(4, 1),
      incoming: 'east',
    });
    expect(game.state.coinsCollected).toEqual([]);

    game.apply(PERFECT[10]!); // 11 — curva corrigida; vermelho em (4,2)
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(4, 2),
      incoming: 'south',
    });
    expect(game.state.coinsCollected).toEqual([pos(4, 2)]);

    game.apply(PERFECT[11]!); // 12 — vermelho na curva (4,3)
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(4, 3),
      incoming: 'south',
    });
    expect(game.state.coinsCollected).toEqual([pos(4, 2), pos(4, 3)]);

    game.apply(PERFECT[12]!); // 13 — vermelho em (5,3)
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(5, 3),
      incoming: 'east',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(4, 2),
      pos(4, 3),
      pos(5, 3),
    ]);

    game.apply(PERFECT[13]!); // 14 — vermelho em (5,2)
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(5, 2),
      incoming: 'north',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(4, 2),
      pos(4, 3),
      pos(5, 3),
      pos(5, 2),
    ]);

    game.apply(PERFECT[14]!); // 15 — vermelho em (5,1)
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(5, 1),
      incoming: 'north',
    });

    game.apply(PERFECT[15]!); // 16 — entrega em @ (5,0)
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
  });

  it('Ys e curva consertados cedo também vencem: a janela não é frame-perfect', () => {
    const game = setup(P3_DENSITY);
    const early: readonly Action[] = [
      BLUE_FIX,
      GREEN_FIX,
      RED_SWITCH,
      RED_CURVE,
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

    const allEvents = run(game, early);

    expect(game.state.step).toBe(16);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toHaveLength(4);
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
  });
});

describe('P3 «Densidade» (M6) — falhas encenáveis e lost', () => {
  it('azul sem conserto: morre em (2,4) no 5; 2/3 com 2 vidas', () => {
    const game = setup(P3_DENSITY);
    const allEvents = run(game, BLUE_FORGOTTEN);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual([]);

    expect(derailsOf(allEvents)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'blue',
      at: pos(2, 4),
      direction: 'south',
      reason: 'noExit',
    });
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
    ]);
  });

  it('verde sem toggle: morre em (5,3) no 6; 2/3 com 2 vidas', () => {
    const game = setup(P3_DENSITY);
    const allEvents = run(game, GREEN_FORGOTTEN);

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual([pos(5, 3)]);

    expect(derailsOf(allEvents)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'green',
      at: pos(5, 3),
      direction: 'north',
      reason: 'noExit',
    });
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 6, remaining: 2 },
    ]);
  });

  it('vermelho na montanha: coleta 2 moedas e morre no 13; 2/3', () => {
    const game = setup(P3_DENSITY);
    const allEvents = run(game, RED_MOUNTAIN);

    expect(game.state.step).toBe(13);
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
    expect(game.state.coinsCollected).toEqual([pos(4, 2), pos(4, 3)]);

    expect(derailsOf(allEvents)).toContainEqual({
      kind: 'trainDerailed',
      trainId: 'red',
      at: pos(3, 3),
      direction: 'west',
      reason: 'mountain',
    });
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 13, remaining: 2 },
    ]);
  });

  it('lost: três erros independentes zeram as vidas no 13', () => {
    const game = setup(P3_DENSITY);
    const allEvents = run(game, LOST);

    expect(game.state.step).toBe(13);
    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);

    for (const train of game.state.trains) {
      expect(train.status.kind).toBe('derailed');
    }

    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'mountain',
    });
    expect(game.state.coinsCollected).toEqual([
      pos(5, 3),
      pos(4, 2),
      pos(4, 3),
    ]);

    expect(derailsOf(allEvents)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(2, 4),
        direction: 'south',
        reason: 'noExit',
      },
      {
        kind: 'trainDerailed',
        trainId: 'green',
        at: pos(5, 3),
        direction: 'north',
        reason: 'noExit',
      },
      {
        kind: 'trainDerailed',
        trainId: 'red',
        at: pos(3, 3),
        direction: 'west',
        reason: 'mountain',
      },
    ]);
    expect(lifeLossesOf(allEvents)).toEqual([
      { kind: 'lifeLost', step: 5, remaining: 2 },
      { kind: 'lifeLost', step: 6, remaining: 1 },
      { kind: 'lifeLost', step: 13, remaining: 0 },
    ]);
  });
});

describe('P3 «Densidade» (M6) — receitas de colisão do tabuleiro real', () => {
  it('cruzamento simultâneo: os dois chegam ao X (2,2) no mesmo passo', () => {
    const red = P3_DENSITY.trains.find((train) => train.id === 'red');
    const blue = P3_DENSITY.trains.find((train) => train.id === 'blue');

    const result = resolveStep(
      gameState(
        P3_DENSITY.board,
        [
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

  it('swap dos túneis: os dois portais reais trocam no mesmo passo e colidem', () => {
    const red = P3_DENSITY.trains.find((train) => train.id === 'red');
    const blue = P3_DENSITY.trains.find((train) => train.id === 'blue');

    const result = resolveStep(
      gameState(
        P3_DENSITY.board,
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
