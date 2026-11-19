import { describe, expect, it } from 'vitest';
import { cellAt } from '../../src/core/types';
import { ActionBuffer } from '../../src/core/buffer';
import { predictPath } from '../../src/core/prediction';
import { resolveStep } from '../../src/core/step';
import {
  board,
  BLUE,
  collisionsOf,
  derailsOf,
  EMPTY,
  gameState,
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
  tunnel,
  y,
} from './helpers';

function eastboundBoard() {
  return board([
    [
      straight(1),
      tunnel(pos(3, 0)),
      EMPTY,
      tunnel(pos(1, 0)),
      straight(1),
    ],
  ]);
}

describe('túnel — travessia', () => {
  it('atravessa em 1 passo para leste, preserva a direção e marca justTunneled', () => {
    const cells = eastboundBoard();
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
      cell: pos(3, 0),
      incoming: 'east',
      justTunneled: true,
    });

    const third = resolveStep(second.state);

    expect(trainInState(third.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(4, 0),
      incoming: 'east',
    });
  });

  it('atravessa em 1 passo para oeste, preservando a direção', () => {
    const cells = eastboundBoard();
    const first = resolveStep(
      gameState(
        cells,
        [runningTrain('a', RED, 'circle', pos(4, 0), 'west')],
        0,
        'playing',
        3,
      ),
    );

    expect(trainInState(first.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(3, 0),
      incoming: 'west',
    });

    const second = resolveStep(first.state);

    expect(trainInState(second.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(1, 0),
      incoming: 'west',
      justTunneled: true,
    });

    const third = resolveStep(second.state);

    expect(trainInState(third.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'west',
    });
  });

  it('saída desconectada descarrila com noExit depois da travessia', () => {
    const cells = board([
      [tunnel(pos(2, 0)), EMPTY, tunnel(pos(0, 0)), EMPTY],
    ]);
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
      cell: pos(2, 0),
      incoming: 'east',
      justTunneled: true,
    });

    const fatal = resolveStep(first.state);

    expect(derailsOf(fatal.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'a',
        at: pos(3, 0),
        direction: 'east',
        reason: 'noExit',
      },
    ]);
    expect(lifeLossesOf(fatal.events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
    ]);
  });
});

describe('túnel — §3.10 e capacidade', () => {
  it('swap A↔B no mesmo passo = colisão pela regra geral', () => {
    const cells = board([
      [EMPTY, tunnel(pos(3, 0)), EMPTY, tunnel(pos(1, 0)), EMPTY],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(1, 0), 'east'),
          runningTrain('b', BLUE, 'square', pos(3, 0), 'west'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([
      pos(3, 0),
      pos(1, 0),
    ]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
  });

  it('dois trens no mesmo portal no mesmo passo = colisão (uma célula por vez)', () => {
    const cells = board([
      [straight(1), tunnel(pos(3, 0)), EMPTY, tunnel(pos(1, 0)), EMPTY],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
          runningTrain('b', BLUE, 'square', pos(3, 0), 'west'),
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
  });
});

describe('túnel — previsão', () => {
  it('path atravessa os dois portais e continua na direção preservada', () => {
    const cells = board([
      [
        straight(1),
        tunnel(pos(3, 0)),
        EMPTY,
        tunnel(pos(1, 0)),
        station(RED),
      ],
    ]);

    const prediction = predictPath(
      cells,
      runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
    );

    expect(prediction?.path).toEqual([
      pos(0, 0),
      pos(1, 0),
      pos(3, 0),
      pos(4, 0),
    ]);
    expect(prediction?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 0),
      correct: true,
    });
  });
});

describe('túnel — D4', () => {
  it('toggle enfileirado de um Y que o trem ocupa após a travessia não avança', () => {
    const level = makeLevel(
      'tunnel-buffer',
      board([
        [
          straight(1),
          tunnel(pos(3, 0)),
          EMPTY,
          tunnel(pos(1, 0)),
          y(3, 0, 'toggle'),
        ],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 0))],
    );
    const game = makeGame(level);
    const buffer = new ActionBuffer();

    // 1: entra em (0,0); 2: entra no portal A; 3: atravessa para B;
    // 4: sai para o Y (4,0). O tap enfileirado seria um toggle do Y livre,
    // mas no dreno o Y já está ocupado.
    buffer.enqueue({ kind: 'pass' });
    buffer.enqueue({ kind: 'pass' });
    buffer.enqueue({ kind: 'pass' });
    buffer.enqueue({ kind: 'pass' });
    buffer.enqueue({ kind: 'tap', cell: pos(4, 0) });

    const results = buffer.drain(game.apply);

    expect(results).toHaveLength(5);
    expect(results.slice(0, 4).every((result) => result.advanced)).toBe(true);
    expect(results[4]?.advanced).toBe(false);
    expect(results[4]?.outcome).toEqual({
      kind: 'blocked',
      reason: 'train',
    });
    expect(game.state.step).toBe(4);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(4, 0),
      incoming: 'east',
    });
    // O Y não foi tocado: o tap enfileirado virou blocked, não toggle.
    expect(cellAt(game.state.board, pos(4, 0))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 0, next: 'toggle' },
    });
    expect(buffer.isEmpty).toBe(true);
  });
});
