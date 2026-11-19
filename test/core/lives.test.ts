import { describe, expect, it } from 'vitest';
import { resolveStep } from '../../src/core/step';
import {
  BLUE,
  board,
  collisionsOf,
  derailsOf,
  deliveriesOf,
  EMPTY,
  entry,
  eventKinds,
  gameState,
  GREEN,
  lifeLossesOf,
  makeGame,
  makeLevel,
  pos,
  RED,
  runningTrain,
  station,
  straight,
  trainInState,
  trainSetup,
} from './helpers';

describe('vidas — custo por evento', () => {
  it('colisão de dois trens custa 1 vida', () => {
    const level = makeLevel(
      'lives-collision',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), straight(1), entry('west')],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(2, 1), 'west'),
      ],
      3,
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const result = game.apply({ kind: 'pass' });

    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('deadEnd');
    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
  });

  it('colisão de três trens continua custando 1 vida (evento único)', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, straight(0), EMPTY, EMPTY],
      [
        entry('east'),
        straight(1),
        EMPTY,
        straight(1),
        entry('west'),
      ],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(1, 2), 'east'),
        runningTrain('b', BLUE, 'square', pos(3, 2), 'west'),
        runningTrain('c', GREEN, 'triangle', pos(2, 1), 'south'),
      ],
      0,
      'playing',
      3,
    );
    const result = resolveStep(state);

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(result.state.lives).toBe(2);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
      'collision',
    ]);
  });

  it('dois descarrilamentos independentes no mesmo passo custam 2', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY, EMPTY],
      [straight(1), straight(1), EMPTY, EMPTY],
      [straight(1), straight(1), EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(1, 1), 'east'),
        runningTrain('b', BLUE, 'square', pos(1, 2), 'east'),
      ],
      0,
      'playing',
      3,
    );
    const result = resolveStep(state);

    expect(result.state.lives).toBe(1);
    expect(result.state.status).toBe('deadEnd');
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'noExit',
      'noExit',
    ]);

    const losses = lifeLossesOf(result.events);

    expect(losses.map((event) => event.remaining)).toEqual([2, 1]);
    expect(losses.every((event) => event.step === 1)).toBe(true);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'lifeLost',
      'deadEnd',
    ]);
  });

  it('duplo descarrilamento na mesma célula é colisão e custa 1', () => {
    const level = makeLevel(
      'lives-double-derail',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), EMPTY, entry('west')],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(2, 1), 'west'),
      ],
      3,
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const result = game.apply({ kind: 'pass' });

    expect(game.state.lives).toBe(2);

    const collisions = collisionsOf(result.events);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.cells).toEqual([pos(1, 1)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);

    const losses = lifeLossesOf(result.events);

    expect(losses).toHaveLength(1);
    expect(losses[0]?.remaining).toBe(2);
  });

  it('colisão + descarrilamento independente no mesmo passo custam 2', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, entry('west')],
      [EMPTY, straight(1), EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(0, 1), 'east'),
        runningTrain('b', BLUE, 'square', pos(2, 1), 'west'),
        runningTrain('c', GREEN, 'triangle', pos(1, 2), 'east'),
      ],
      0,
      'playing',
      3,
    );
    const result = resolveStep(state);

    expect(result.state.lives).toBe(1);
    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
      'noExit',
    ]);

    const losses = lifeLossesOf(result.events);

    expect(losses.map((event) => event.remaining)).toEqual([2, 1]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'lifeLost',
      'deadEnd',
    ]);
  });
});

describe('vidas — vitória, derrota e D11', () => {
  it('vitória dinâmica com uma perda mantém a run e custa 1 vida', () => {
    const level = makeLevel(
      'lives-victory',
      board([
        [entry('east'), EMPTY, EMPTY, EMPTY, EMPTY],
        [
          entry('east'),
          straight(1),
          straight(1),
          straight(1),
          station(RED),
        ],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(0, 0)),
      ],
      3,
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const second = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('playing');
    expect(game.state.lives).toBe(2);
    expect(lifeLossesOf(second.events).map((event) => event.remaining)).toEqual([
      2,
    ]);

    for (let step = 2; step < 5; step += 1) {
      game.apply({ kind: 'pass' });
    }

    expect(game.state.step).toBe(5);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'a').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('lost ao zerar vence won no mesmo passo (D11) com 3 trens', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, entry('west')],
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), station(GREEN, 'triangle'), EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(0, 1), 'east'),
        runningTrain('b', BLUE, 'square', pos(2, 1), 'west'),
        runningTrain('c', GREEN, 'triangle', pos(0, 3), 'east'),
      ],
      0,
      'playing',
      1,
    );
    const result = resolveStep(state);

    expect(result.state.status).toBe('lost');
    expect(result.state.lives).toBe(0);
    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(deliveriesOf(result.events)).toEqual([
      {
        kind: 'trainDelivered',
        trainId: 'c',
        station: pos(1, 3),
      },
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 0 },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'trainDelivered',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
    ]);
    expect(eventKinds(result.events)).not.toContain('victory');
    expect(trainInState(result.state, 'a').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
    expect(trainInState(result.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
    expect(trainInState(result.state, 'c').status).toEqual({
      kind: 'delivered',
    });
  });

  it('zerar a última vida vira lost, não deadEnd', () => {
    const cells = board([[straight(1), EMPTY]]);
    const state = gameState(
      cells,
      [runningTrain('a', RED, 'circle', pos(0, 0), 'east')],
      0,
      'playing',
      1,
    );
    const result = resolveStep(state);

    expect(result.state.status).toBe('lost');
    expect(result.state.lives).toBe(0);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 0 },
    ]);
    expect(trainInState(result.state, 'a').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('fase sem vidas não emite lifeLost e nunca vira lost', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, entry('west')],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(0, 1), 'east'),
        runningTrain('b', BLUE, 'square', pos(2, 1), 'west'),
      ],
      0,
      'playing',
      null,
    );
    const result = resolveStep(state);

    expect(result.state.status).toBe('deadEnd');
    expect(result.state.lives).toBeNull();
    expect(lifeLossesOf(result.events)).toHaveLength(0);
    expect(eventKinds(result.events)).not.toContain('lifeLost');
  });

  it('reset restaura as vidas do layout', () => {
    const level = makeLevel(
      'lives-reset',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
      2,
    );
    const game = makeGame(level);

    expect(game.state.lives).toBe(2);

    game.apply({ kind: 'pass' });
    const fatal = game.apply({ kind: 'pass' });

    expect(game.state.lives).toBe(1);
    expect(lifeLossesOf(fatal.events)).toHaveLength(1);

    const reset = game.reset();

    expect(reset.lives).toBe(2);
    expect(reset.step).toBe(0);
    expect(reset.status).toBe('ready');
    expect(trainInState(reset, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
  });
});

describe('vidas — dado da fase', () => {
  it('rejeita lives < 1 ou fracionária no setup', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const trains = [trainSetup('red', RED, 'circle', pos(0, 1))];

    expect(() =>
      makeGame(makeLevel('lives-zero', cells, trains, 0)),
    ).toThrow(/lives/);
    expect(() =>
      makeGame(makeLevel('lives-fractional', cells, trains, 1.5)),
    ).toThrow(/lives/);
  });
});
