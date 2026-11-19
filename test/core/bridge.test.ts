import { describe, expect, it } from 'vitest';
import { resolveCell } from '../../src/core/movement';
import { resolveStep } from '../../src/core/step';
import {
  BLUE,
  board,
  bridge,
  collisionsOf,
  derailsOf,
  EMPTY,
  eventKinds,
  gameState,
  lifeLossesOf,
  pos,
  RED,
  runningTrain,
  straight,
  trainInState,
} from './helpers';

describe('ponte — tabela de movimento', () => {
  it('eixo E–O atravessa para leste e para oeste; entrada de lado é noExit', () => {
    const cell = bridge('east-west');

    expect(resolveCell(cell, 'east')).toEqual({
      kind: 'exit',
      direction: 'east',
    });
    expect(resolveCell(cell, 'west')).toEqual({
      kind: 'exit',
      direction: 'west',
    });
    expect(resolveCell(cell, 'north')).toEqual({ kind: 'noExit' });
    expect(resolveCell(cell, 'south')).toEqual({ kind: 'noExit' });
  });

  it('eixo N–S atravessa para norte e para sul; entrada de lado é noExit', () => {
    const cell = bridge('north-south');

    expect(resolveCell(cell, 'north')).toEqual({
      kind: 'exit',
      direction: 'north',
    });
    expect(resolveCell(cell, 'south')).toEqual({
      kind: 'exit',
      direction: 'south',
    });
    expect(resolveCell(cell, 'east')).toEqual({ kind: 'noExit' });
    expect(resolveCell(cell, 'west')).toEqual({ kind: 'noExit' });
  });
});

describe('ponte — passo', () => {
  it('um trem atravessa a ponte E–O e continua no passo seguinte', () => {
    const cells = board([[straight(1), bridge('east-west'), straight(1)]]);
    const first = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(0, 0), 'east')],
        0,
        'playing',
        3,
      ),
    );

    expect(trainInState(first.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(1, 0),
      incoming: 'east',
    });

    const second = resolveStep(first.state);

    expect(trainInState(second.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(2, 0),
      incoming: 'east',
    });
    expect(lifeLossesOf(first.events)).toHaveLength(0);
    expect(lifeLossesOf(second.events)).toHaveLength(0);
  });

  it('um trem atravessa a ponte N–S e continua no passo seguinte', () => {
    const cells = board([
      [straight(0)],
      [bridge('north-south')],
      [straight(0)],
    ]);
    const first = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(0, 0), 'south')],
        0,
        'playing',
        3,
      ),
    );

    expect(trainInState(first.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'south',
    });

    const second = resolveStep(first.state);

    expect(trainInState(second.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(0, 2),
      incoming: 'south',
    });
  });

  it('entrada de lado na ponte descarrila com noExit no passo', () => {
    const cells = board([
      [EMPTY, straight(0), EMPTY],
      [EMPTY, bridge('east-west'), EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(1, 0), 'south')],
        0,
        'playing',
        3,
      ),
    );

    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'a',
        at: pos(1, 1),
        direction: 'south',
        reason: 'noExit',
      },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
    expect(result.state.lives).toBe(2);
    expect(result.state.status).toBe('deadEnd');
  });

  it('dois trens na mesma ponte no mesmo passo colidem (1 vida)', () => {
    const cells = board([
      [EMPTY, straight(0), EMPTY],
      [EMPTY, bridge('north-south'), EMPTY],
      [EMPTY, straight(0), EMPTY],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(1, 0), 'south'),
          runningTrain('b', BLUE, 'square', pos(1, 2), 'north'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([pos(1, 1)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(result.state.lives).toBe(2);
    expect(result.state.status).toBe('deadEnd');
  });
});
