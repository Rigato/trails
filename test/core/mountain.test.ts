import { describe, expect, it } from 'vitest';
import type { Board, CellPos, LevelLayout } from '../../src/core/types';
import { validateLayout } from '../../src/core/game';
import { predictPath } from '../../src/core/prediction';
import { resolveStep } from '../../src/core/step';
import {
  board,
  derailsOf,
  EMPTY,
  eventKinds,
  gameState,
  lifeLossesOf,
  mountain,
  pos,
  RED,
  runningTrain,
  straight,
  trainInState,
  tunnel,
} from './helpers';

function badLayout(
  cells: Board,
  coins?: readonly CellPos[],
): LevelLayout {
  return { id: 'bad', name: 'bad', board: cells, trains: [], coins };
}

describe('montanha — chegada e previsão', () => {
  it('chegada na montanha descarrila com mountain e custa 1 vida', () => {
    const cells = board([[straight(1), mountain()]]);
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
        reason: 'mountain',
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
    expect(trainInState(result.state, 'a').status).toEqual({
      kind: 'derailed',
      reason: 'mountain',
    });
  });

  it('a previsão para na montanha com stop.kind próprio (destino)', () => {
    const cells = board([[straight(1), mountain()]]);
    const prediction = predictPath(
      cells,
      runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
    );

    expect(prediction?.path).toEqual([pos(0, 0), pos(1, 0)]);
    expect(prediction?.stop).toEqual({
      kind: 'mountain',
      cell: pos(1, 0),
    });
  });

  it('a previsão para na montanha quando o trem já está nela', () => {
    const cells = board([[mountain()]]);
    const prediction = predictPath(
      cells,
      runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
    );

    expect(prediction?.path).toEqual([pos(0, 0)]);
    expect(prediction?.stop).toEqual({
      kind: 'mountain',
      cell: pos(0, 0),
    });
  });
});

describe('validação — túnel e moedas nos fixos novos', () => {
  it('rejeita par de túnel assimétrico', () => {
    expect(() =>
      validateLayout(
        badLayout(
          board([
            [tunnel(pos(1, 0)), tunnel(pos(2, 0)), tunnel(pos(1, 0))],
          ]),
        ),
      ),
    ).toThrow(
      'Layout inválido: os portais do túnel em (0,0) e (1,0) precisam apontar um para o outro.',
    );
  });

  it('rejeita portal de túnel fora da grade', () => {
    expect(() =>
      validateLayout(
        badLayout(board([[tunnel(pos(3, 0))]])),
      ),
    ).toThrow(
      'Layout inválido: o parceiro do túnel em (0,0) está fora da grade.',
    );
  });

  it('rejeita túnel apontando para célula que não é portal', () => {
    expect(() =>
      validateLayout(
        badLayout(board([[tunnel(pos(1, 0)), EMPTY]])),
      ),
    ).toThrow(
      'Layout inválido: o túnel em (0,0) precisa apontar para outro portal.',
    );
  });

  it('rejeita moeda sobre túnel', () => {
    expect(() =>
      validateLayout(
        badLayout(
          board([
            [tunnel(pos(2, 0)), EMPTY, tunnel(pos(0, 0))],
          ]),
          [pos(0, 0)],
        ),
      ),
    ).toThrow(
      'Layout inválido: a moeda em (0,0) precisa estar sobre trilho (peça ou ponte).',
    );
  });

  it('rejeita moeda sobre montanha', () => {
    expect(() =>
      validateLayout(
        badLayout(
          board([[straight(1), mountain()]]),
          [pos(1, 0)],
        ),
      ),
    ).toThrow(
      'Layout inválido: a moeda em (1,0) precisa estar sobre trilho (peça ou ponte).',
    );
  });
});

describe('lost — 3 trens e 3 perdas independentes', () => {
  it('três montanhas no mesmo passo zeram as vidas e viram lost', () => {
    const cells = board([
      [straight(1), mountain()],
      [straight(1), mountain()],
      [straight(1), mountain()],
    ]);
    const result = resolveStep(
      gameState(
        cells,
        [
          runningTrain('a', RED, 'circle', pos(0, 0), 'east'),
          runningTrain('b', RED, 'circle', pos(0, 1), 'east'),
          runningTrain('c', RED, 'circle', pos(0, 2), 'east'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'mountain',
      'mountain',
      'mountain',
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
