import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/core/types';
import {
  BLUE,
  board,
  collisionsOf,
  curve,
  derailsOf,
  EMPTY,
  eventKinds,
  GREEN,
  lifeLossesOf,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainInState,
  trainSetup,
  y,
} from './helpers';

/** Passa um turno. */
const PASS: Action = { kind: 'pass' };

describe('moedas — slot §3.6', () => {
  it('entrega, moeda e colisão no mesmo passo saem na ordem do contrato', () => {
    const level = makeLevel(
      'coins-order',
      board([
        [straight(1), station(RED), EMPTY],
        [straight(1), straight(1), EMPTY],
        [straight(1), straight(1), straight(1)],
      ]),
      [
        trainSetup('red', RED, 'circle', pos(0, 0)),
        trainSetup('blue', BLUE, 'square', pos(0, 1)),
        trainSetup('green', GREEN, 'triangle', pos(0, 2)),
        trainSetup('d', BLUE, 'square', pos(2, 2), 'west'),
      ],
      3,
    );
    const withCoins = { ...level, coins: [pos(1, 1)] };
    const game = makeGame(withCoins);

    game.apply(PASS); // passo 1: todos entram
    const result = game.apply(PASS); // passo 2: entrega + moeda + colisão

    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'trainDelivered',
      'coinCollected',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
    ]);
    expect(game.state.coinsCollected).toEqual([pos(1, 1)]);
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('playing');
    expect(collisionsOf(result.events)[0]?.cells).toEqual([pos(1, 2)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
    ]);
  });

  it('moeda coletada por trem que morre no mesmo passo CONTA (D16)', () => {
    const level = makeLevel(
      'coins-d16',
      board([
        [EMPTY, EMPTY, EMPTY],
        [straight(1), straight(1), straight(1)],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(2, 1), 'west'),
      ],
      3,
    );
    const withCoin = { ...level, coins: [pos(1, 1)] };
    const game = makeGame(withCoin);

    game.apply(PASS);
    const result = game.apply(PASS);

    const coinEvents = result.events.filter(
      (event) => event.kind === 'coinCollected',
    );

    expect(coinEvents).toEqual([
      {
        kind: 'coinCollected',
        trainId: 'a',
        cell: pos(1, 1),
      },
    ]);
    expect(game.state.coinsCollected).toEqual([pos(1, 1)]);
    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('deadEnd');
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'coinCollected',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
  });

  it('reset zera o contador de moedas da run', () => {
    const level = makeLevel(
      'coins-reset',
      board([[straight(1), straight(1)]]),
      [trainSetup('red', RED, 'circle', pos(0, 0))],
      3,
    );
    const game = makeGame({ ...level, coins: [pos(1, 0)] });

    game.apply(PASS); // entra em (0,0)
    game.apply(PASS); // chega na moeda em (1,0)

    expect(game.state.coinsCollected).toEqual([pos(1, 0)]);

    const reset = game.reset();

    expect(reset.coinsCollected).toEqual([]);
    expect(reset.step).toBe(0);
    expect(reset.status).toBe('ready');
  });

  it('moeda já coletada não volta: dois passos pela mesma célula', () => {
    const level = makeLevel(
      'coins-dedupe',
      board([
        [straight(1), straight(1), curve(2), EMPTY, EMPTY],
        [EMPTY, EMPTY, y(1, 0, 'toggle'), straight(1), station(RED)],
        [EMPTY, EMPTY, straight(0), EMPTY, EMPTY],
        [straight(1), straight(1), curve(3), EMPTY, EMPTY],
      ]),
      [
        trainSetup('red', RED, 'circle', pos(0, 0)),
        trainSetup('blue', BLUE, 'square', pos(0, 3)),
      ],
      3,
    );
    const withCoin = { ...level, coins: [pos(2, 1)] };
    const game = makeGame(withCoin);
    let coinEventCount = 0;

    for (let step = 0; step < 4; step += 1) {
      const result = game.apply(PASS);
      coinEventCount += result.events.filter(
        (event) => event.kind === 'coinCollected',
      ).length;
    }

    // Passo 4: o vermelho chega ao Y com moeda vindo do norte.
    expect(game.state.coinsCollected).toEqual([pos(2, 1)]);
    expect(coinEventCount).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'south',
    });

    const fifth = game.apply(PASS); // azul chega ao mesmo Y; já foi coletada

    expect(
      fifth.events.filter((event) => event.kind === 'coinCollected'),
    ).toEqual([]);
    expect(game.state.coinsCollected).toEqual([pos(2, 1)]);
    expect(coinEventCount).toBe(1);
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'north',
    });
  });
});
