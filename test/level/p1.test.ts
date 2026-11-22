/**
 * Fase P1 «Sincronia» — testes da fase DEFINITIVA (E9).
 *
 * O core (`test/core/*`) testa Y, ABAB, vidas e colisões genéricas; este
 * arquivo testa o DADO da fase: a leitura do primeiro quadro, a solução de 12
 * passos com a janela marcada, a rota sacrificial (Q8) e a sequência de erro
 * que produz a colisão dramática. Substitui o fumaça que vivia em
 * `test/core/p1-smoke.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import type {
  CellPos,
  Game,
  GameEvent,
  Prediction,
  RotationDirection,
  YPiece,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { P1_LEVEL } from '../../src/level/p1';
import { firstHintTarget } from '../../src/render/fx';
import {
  collisionsOf,
  derailsOf,
  eventKinds,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

/** Ação da solução: toggle/giro de um Y ou «passar turno». */
type SolutionAction =
  | {
      readonly kind: 'toggle' | 'rotate';
      readonly cell: CellPos;
      readonly turn?: RotationDirection;
    }
  | { readonly kind: 'pass' };

/** Toque no Y do split S. */
const S = pos(2, 1);
/** Toque no switch E que escolhe o comprimento do caminho azul. */
const E = pos(4, 4);
/** Curva do caminho longo do azul — a peça do contragiro. */
const LONG_CURVE = pos(4, 2);

/** Solução oficial de 12 passos, espelhada no comentário de `src/level/p1.ts`. */
const SOLUTION: readonly SolutionAction[] = [
  { kind: 'toggle', cell: S }, // 1
  { kind: 'toggle', cell: E }, // 2
  { kind: 'rotate', cell: S }, // 3
  { kind: 'rotate', cell: LONG_CURVE, turn: 'ccw' }, // 4 — único CCW
  { kind: 'pass' }, // 5
  { kind: 'pass' }, // 6 — vermelho em M
  { kind: 'pass' }, // 7
  { kind: 'pass' }, // 8 — azul em M
  { kind: 'pass' }, // 9 — vermelho em S
  { kind: 'pass' }, // 10 — vermelho entregue
  { kind: 'toggle', cell: S }, // 11 — rearme da janela
  { kind: 'pass' }, // 12 — azul entregue / 2/2
];

/** Previsões dos dois trens, na ordem do layout. */
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

/** Estado atual do Y de uma célula, com erro claro se não houver Y. */
function yAt(game: Game, cell: CellPos): YPiece {
  const content = cellAt(game.state.board, cell);

  if (content?.kind !== 'piece' || content.piece.kind !== 'y') {
    throw new Error(`Esperado um Y em (${cell.col},${cell.row}).`);
  }

  return content.piece;
}

/** Aplica uma ação da solução e devolve o resultado do core. */
function applySolution(game: Game, action: SolutionAction) {
  return action.kind === 'pass'
    ? game.apply({ kind: 'pass' })
    : game.apply({
        kind: 'tap',
        cell: action.cell,
        ...(action.turn === undefined ? {} : { turn: action.turn }),
      });
}

/** Classificação esperada de cada ação da solução. */
function expectedOutcome(action: SolutionAction): string {
  if (action.kind === 'pass') {
    return 'passed';
  }

  return action.kind === 'toggle' ? 'toggled' : 'rotated';
}

describe('P1 — fase «Sincronia» (layout definitivo)', () => {
  it('o dado da fase respeita o P1: 6×6, 2 pares, 3 vidas, 4 Ys', () => {
    const { board } = P1_LEVEL;

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P1_LEVEL.lives).toBe(3);
    expect(P1_LEVEL.trains).toHaveLength(2);
    expect(P1_LEVEL.tutorial).toBe(true);
    expect(P1_LEVEL.selectorHint).toBe(true);

    const game = setup(P1_LEVEL);
    const red = trainInState(game.state, 'red');
    const blue = trainInState(game.state, 'blue');

    expect(red.shape).toBe('circle');
    expect(blue.shape).toBe('square');
    expect(red.color).not.toBe(blue.color);

    // Estações: exatamente uma de cada par, com cor E forma iguais ao trem.
    expect(cellAt(board, pos(1, 1))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: red.color, shape: red.shape },
    });
    expect(cellAt(board, pos(3, 1))).toEqual({
      kind: 'fixed',
      fixed: { kind: 'station', color: blue.color, shape: blue.shape },
    });

    // Primeiras células de entrada: trilho comum na borda, não elemento fixo.
    expect(cellAt(board, pos(0, 5))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 0 },
    });
    expect(cellAt(board, pos(5, 4))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });

    const redEntry = P1_LEVEL.trains.find((train) => train.id === 'red')?.entry;
    const blueEntry = P1_LEVEL.trains.find(
      (train) => train.id === 'blue',
    )?.entry;

    expect(redEntry).toEqual({
      cell: pos(0, 5),
      direction: 'north',
    });
    expect(blueEntry).toEqual({
      cell: pos(5, 4),
      direction: 'west',
    });

    const yCount = board.rows.flat().reduce(
      (count, cell) =>
        count + (cell.kind === 'piece' && cell.piece.kind === 'y' ? 1 : 0),
      0,
    );

    expect(yCount).toBe(4);

    // A curva do contragiro nasce um quarto depois da correta (rot 3 → 2).
    expect(cellAt(board, LONG_CURVE)).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });

    // Estados iniciais dos quatro Ys (o contrato do ABAB).
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 1, arm: 1, next: 'toggle' });
    expect(yAt(game, pos(2, 4))).toEqual({
      kind: 'y',
      rot: 0,
      arm: 0,
      next: 'toggle',
    });
    expect(yAt(game, pos(3, 4))).toEqual({
      kind: 'y',
      rot: 3,
      arm: 0,
      next: 'toggle',
    });
    expect(yAt(game, E)).toEqual({ kind: 'y', rot: 1, arm: 0, next: 'toggle' });
  });

  it('primeiro quadro: previsões convergem no split; sem hint D6 na fase', () => {
    const game = setup(P1_LEVEL);
    const predictions = predictionsOf(game);
    const red = predictions.find((prediction) => prediction.trainId === 'red');
    const blue = predictions.find((prediction) => prediction.trainId === 'blue');

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);

    // As duas previsões passam por M (2,4); o vermelho termina na estação
    // errada (X de cor), o azul na própria. É o primeiro problema visível.
    expect(red?.path).toContainEqual(pos(2, 4));
    expect(blue?.path).toContainEqual(pos(2, 4));
    expect(red?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 1),
      correct: false,
    });
    expect(blue?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 1),
      correct: true,
    });

    // D6 era do tutorial: a previsão não morre em peça, então não há halo.
    expect(firstHintTarget(game.state, predictions)).toBeNull();
  });

  it('ABAB no split S: toggle, rotate, toggle — o giro e a alternância contam', () => {
    const game = setup(P1_LEVEL);

    const first = game.apply({ kind: 'tap', cell: S });

    expect(first.outcome.kind).toBe('toggled');
    expect(game.state.step).toBe(1);
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 1, arm: 0, next: 'rotate' });

    const second = game.apply({ kind: 'tap', cell: S });

    expect(second.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(2);
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 2, arm: 0, next: 'toggle' });

    const third = game.apply({ kind: 'tap', cell: S });

    expect(third.outcome.kind).toBe('toggled');
    expect(game.state.step).toBe(3);
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 2, arm: 1, next: 'rotate' });
  });

  it('contragiro: a curva (4,2) nasce 3 quartos adiantada e a solução usa 1 CCW', () => {
    const game = setup(P1_LEVEL);

    for (const action of SOLUTION.slice(0, 3)) {
      applySolution(game, action);
    }

    // O azul já está na boca da peça; o CW ainda precisaria de três toques.
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(4, 3),
      incoming: 'north',
    });
    expect(cellAt(game.state.board, LONG_CURVE)).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });

    const fourth = applySolution(game, SOLUTION[3]!);

    expect(fourth.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(4);
    expect(cellAt(game.state.board, LONG_CURVE)).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 2 },
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: LONG_CURVE,
      incoming: 'north',
    });

    // A peça aceita o azul: a previsão segue por (3,2)/(3,3)/M até S. A janela
    // do split ainda não foi rearmada, então o destino visível é @ (X de cor).
    const bluePrediction = game.prediction('blue');

    expect(bluePrediction?.path).toContainEqual(pos(4, 2));
    expect(bluePrediction?.path).toContainEqual(pos(3, 2));
    expect(bluePrediction?.path).toContainEqual(pos(3, 3));
    expect(bluePrediction?.stop).toEqual({
      kind: 'station',
      cell: pos(1, 1),
      correct: false,
    });

    const ccwMoves = SOLUTION.filter(
      (action) => action.kind === 'rotate' && action.turn === 'ccw',
    );

    expect(ccwMoves).toHaveLength(1);
  });

  it('CW no passo 4 não substitui o CCW: o azul morre em (4,2) por noExit', () => {
    const game = setup(P1_LEVEL);

    for (const action of SOLUTION.slice(0, 3)) {
      applySolution(game, action);
    }

    const fourth = game.apply({
      kind: 'tap',
      cell: LONG_CURVE,
      turn: 'cw',
    });

    expect(fourth.outcome.kind).toBe('rotated');
    expect(cellAt(game.state.board, LONG_CURVE)).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 0 },
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(derailsOf(fourth.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: LONG_CURVE,
        direction: 'north',
        reason: 'noExit',
      },
    ]);
    expect(lifeLossesOf(fourth.events)).toEqual([
      { kind: 'lifeLost', step: 4, remaining: 2 },
    ]);
  });

  it('a solução de 12 passos entrega 2/2 com 3 vidas, sem colisão/descarrilamento', () => {
    const game = setup(P1_LEVEL);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = applySolution(game, action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(expectedOutcome(action));
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);

      if (index === 0) {
        // §3.5: os dois trens entram juntos no primeiro passo.
        expect(trainInState(game.state, 'red').status).toEqual({
          kind: 'running',
          cell: pos(0, 5),
          incoming: 'north',
        });
        expect(trainInState(game.state, 'blue').status).toEqual({
          kind: 'running',
          cell: pos(5, 4),
          incoming: 'west',
        });

        const moves = result.events.filter(
          (event) => event.kind === 'trainMoved',
        );

        expect(moves).toHaveLength(2);

        for (const move of moves) {
          if (move.kind === 'trainMoved') {
            expect(move.from).toBeNull();
          }
        }
      }
    }

    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.prediction('red')).toBeUndefined();
    expect(game.prediction('blue')).toBeUndefined();

    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);

    // O último passo é a entrega do azul, na ordem do contrato.
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('a janela de S é de 2 passos (vermelho 9, azul 11) e o rearme é o passo 11', () => {
    const game = setup(P1_LEVEL);

    // Passos 1–8: montagem do Y e viagem até a boca da janela.
    for (const [index, action] of SOLUTION.slice(0, 8).entries()) {
      const result = applySolution(game, action);

      expect(result.advanced).toBe(true);
      expect(game.state.step).toBe(index + 1);
    }

    const redStep9 = applySolution(game, SOLUTION[8]!);

    expect(redStep9.advanced).toBe(true);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: S,
      incoming: 'north',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 3),
      incoming: 'north',
    });

    const redDelivery = applySolution(game, SOLUTION[9]!);

    expect(redDelivery.advanced).toBe(true);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 2),
      incoming: 'north',
    });

    // O azul ainda vê a estação errada (X) antes do rearme.
    const blueBefore = game.prediction('blue');

    expect(blueBefore?.stop).toEqual({
      kind: 'station',
      cell: pos(1, 1),
      correct: false,
    });

    // O azul chega em S no passo 11; o toggle rearma a agulha para L.
    const window = applySolution(game, SOLUTION[10]!);

    expect(window.outcome.kind).toBe('toggled');
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: S,
      incoming: 'north',
    });
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 2, arm: 1, next: 'rotate' });
    expect(game.prediction('blue')?.stop).toEqual({
      kind: 'station',
      cell: pos(3, 1),
      correct: true,
    });
  });

  it('sacrifício (Q8): sem o rearme do passo 11, só o vermelho entrega e vence', () => {
    const game = setup(P1_LEVEL);

    // Passos 1–10: idênticos à solução; o vermelho entrega no 10.
    for (const action of SOLUTION.slice(0, 10)) {
      applySolution(game, action);
    }

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 2),
      incoming: 'north',
    });
    expect(game.state.lives).toBe(3);

    // Passo 11 sem toggle: o azul entra em S com arm 0 (O, estação vermelha).
    const eleventh = game.apply({ kind: 'pass' });

    expect(eleventh.advanced).toBe(true);
    expect(game.state.step).toBe(11);
    expect(yAt(game, S)).toEqual({ kind: 'y', rot: 2, arm: 0, next: 'toggle' });
    expect(game.prediction('blue')?.stop).toEqual({
      kind: 'station',
      cell: pos(1, 1),
      correct: false,
    });

    // Passo 12: azul sai O para @ e descarrila por cor; vitória dinâmica 1/2.
    const twelfth = game.apply({ kind: 'pass' });

    expect(twelfth.advanced).toBe(true);
    expect(game.state.step).toBe(12);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });

    expect(collisionsOf(twelfth.events)).toHaveLength(0);
    expect(derailsOf(twelfth.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(1, 1),
        direction: 'west',
        reason: 'wrongStation',
      },
    ]);
    expect(lifeLossesOf(twelfth.events)).toEqual([
      { kind: 'lifeLost', step: 12, remaining: 2 },
    ]);
    expect(eventKinds(twelfth.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'victory',
    ]);
  });

  it('colisão: tocar S duas vezes e esquecer E faz o azul encontrar o vermelho em M', () => {
    const game = setup(P1_LEVEL);

    // O erro razoável: o X do vermelho chama atenção, então o jogador faz os
    // dois toques de S (toggle + rotate) antes de tocar E.
    const first = game.apply({ kind: 'tap', cell: S });

    expect(first.outcome.kind).toBe('toggled');

    const second = game.apply({ kind: 'tap', cell: S });

    expect(second.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(2);
    expect(yAt(game, E)).toEqual({ kind: 'y', rot: 1, arm: 0, next: 'toggle' });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: E,
      incoming: 'west',
    });

    // O azul está no atalho; as duas previsões passam por M, mas a previsão
    // ignora o outro trem — o encontro não aparece nela.
    const redPrediction = game.prediction('red');
    const bluePrediction = game.prediction('blue');

    expect(redPrediction?.path).toContainEqual(pos(2, 4));
    expect(bluePrediction?.path).toContainEqual(pos(2, 4));
    expect(bluePrediction?.path).toContainEqual(pos(4, 5));
    expect(bluePrediction?.path).toContainEqual(pos(3, 5));

    game.apply({ kind: 'pass' }); // 3
    game.apply({ kind: 'pass' }); // 4
    game.apply({ kind: 'pass' }); // 5

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 4),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(3, 4),
      incoming: 'north',
    });

    const sixth = game.apply({ kind: 'pass' }); // 6 — os dois entram em M

    expect(sixth.advanced).toBe(true);
    expect(game.state.step).toBe(6);
    expect(game.state.status).toBe('deadEnd');
    expect(game.state.lives).toBe(2);

    const collisions = collisionsOf(sixth.events);

    expect(collisions).toEqual([
      {
        kind: 'collision',
        trainIds: ['red', 'blue'],
        cells: [pos(2, 4)],
      },
    ]);
    expect(derailsOf(sixth.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(sixth.events)).toEqual([
      { kind: 'lifeLost', step: 6, remaining: 2 },
    ]);
    expect(eventKinds(sixth.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
  });
});
