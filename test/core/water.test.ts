import { describe, expect, it } from 'vitest';
import { resolveCell } from '../../src/core/movement';
import { predictPath } from '../../src/core/prediction';
import { resolveStep } from '../../src/core/step';
import {
  board,
  BLUE,
  bridge,
  collisionsOf,
  derailsOf,
  EMPTY,
  eventKinds,
  gameState,
  lifeLossesOf,
  pos,
  RED,
  river,
  runningTrain,
  straight,
  trainInState,
} from './helpers';

describe('rio — água', () => {
  it('resolveCell de rio é water em qualquer direção', () => {
    const cell = river();

    for (const direction of ['north', 'east', 'south', 'west'] as const) {
      expect(resolveCell(cell, direction)).toEqual({ kind: 'water' });
    }
  });

  it('chegada em rio descarrila com water e custa 1 vida', () => {
    const cells = board([[straight(1), river()]]);
    const result = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(0, 0), 'east')],
        0,
        'playing',
        3,
      ),
    );

    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'a',
        at: pos(1, 0),
        direction: 'east',
        reason: 'water',
      },
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
    expect(result.state.lives).toBe(2);
    expect(result.state.status).toBe('deadEnd');
    expect(trainInState(result.state, 'a').status).toEqual({
      kind: 'derailed',
      reason: 'water',
    });
  });

  it('água sob o trem que se move descarrila antes de sair da célula', () => {
    const cells = board([[river()]]);
    const result = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(0, 0), 'east')],
        0,
        'playing',
        3,
      ),
    );

    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'a',
        at: pos(0, 0),
        direction: 'east',
        reason: 'water',
      },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
    expect(result.state.lives).toBe(2);
  });

  it('dois trens na mesma célula de água no mesmo passo = colisão (1 vida)', () => {
    const cells = board([[straight(1), river(), straight(1)]]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
          runningTrain('b', BLUE, 'square', pos(2, 0), 'west'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([pos(1, 0)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
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
    expect(result.state.lives).toBe(2);
    expect(result.state.status).toBe('deadEnd');
  });

  it('previsão para na água quando a célula atual é rio', () => {
    const cells = board([[river()]]);
    const prediction = predictPath(
      cells,
      runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
    );

    expect(prediction?.path).toEqual([pos(0, 0)]);
    expect(prediction?.stop).toEqual({ kind: 'water', cell: pos(0, 0) });
    expect(prediction?.loop).toBe(false);
  });

  it('previsão inclui a célula de rio de destino e para nela', () => {
    const cells = board([[straight(1), river()]]);
    const prediction = predictPath(
      cells,
      runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
    );

    expect(prediction?.path).toEqual([pos(0, 0), pos(1, 0)]);
    expect(prediction?.stop).toEqual({ kind: 'water', cell: pos(1, 0) });
    expect(prediction?.loop).toBe(false);
  });
});

describe('vidas — lost por três águas independentes', () => {
  it('três perdas de água no mesmo passo zeram as vidas e lost vence deadEnd (D11)', () => {
    const cells = board([
      [EMPTY, bridge('east-west')],
      [straight(1), river()],
      [straight(1), river()],
      [straight(1), river()],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(0, 1), 'east'),
          runningTrain('b', RED, 'circle', pos(0, 2), 'east'),
          runningTrain('c', RED, 'circle', pos(0, 3), 'east'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'water',
      'water',
      'water',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
      { kind: 'lifeLost', step: 1, remaining: 1 },
      { kind: 'lifeLost', step: 1, remaining: 0 },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'trainDerailed',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'lifeLost',
      'lifeLost',
    ]);
    expect(eventKinds(result.events)).not.toContain('victory');
    expect(eventKinds(result.events)).not.toContain('deadEnd');
    expect(result.state.lives).toBe(0);
    expect(result.state.status).toBe('lost');
  });
});
