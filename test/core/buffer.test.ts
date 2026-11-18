import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import {
  ActionBuffer,
  DEFAULT_BUFFER_CAPACITY,
} from '../../src/core/buffer';
import {
  board,
  EMPTY,
  entry,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainById,
  trainSetup,
} from './helpers';

function corridor() {
  return makeLevel(
    'corridor',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [entry('east'), straight(1), straight(1), straight(1), station(RED)],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 1))],
  );
}

describe('ActionBuffer — FIFO e teto', () => {
  it('preserva a ordem de chegada', () => {
    const buffer = new ActionBuffer();
    const a: Action = { kind: 'tap', cell: pos(0, 0) };
    const b: Action = { kind: 'pass' };
    const c: Action = { kind: 'tap', cell: pos(1, 1) };

    expect(buffer.enqueue(a)).toBe(true);
    expect(buffer.enqueue(b)).toBe(true);
    expect(buffer.enqueue(c)).toBe(true);
    expect(buffer.size).toBe(3);
    expect(buffer.peek()).toEqual(a);
    expect(buffer.dequeue()).toEqual(a);
    expect(buffer.dequeue()).toEqual(b);
    expect(buffer.dequeue()).toEqual(c);
    expect(buffer.dequeue()).toBeUndefined();
    expect(buffer.isEmpty).toBe(true);
  });

  it('respeita o teto e descarta a ação mais nova', () => {
    const buffer = new ActionBuffer(2);

    expect(buffer.capacity).toBe(2);
    expect(buffer.enqueue({ kind: 'pass' })).toBe(true);
    expect(buffer.enqueue({ kind: 'pass' })).toBe(true);
    expect(buffer.enqueue({ kind: 'pass' })).toBe(false);
    expect(buffer.size).toBe(2);

    buffer.clear();

    expect(buffer.size).toBe(0);
    expect(buffer.isEmpty).toBe(true);
  });

  it('capacidade default é 12', () => {
    expect(DEFAULT_BUFFER_CAPACITY).toBe(12);

    const buffer = new ActionBuffer();

    for (let index = 0; index < 12; index += 1) {
      expect(buffer.enqueue({ kind: 'pass' })).toBe(true);
    }

    expect(buffer.size).toBe(12);
    expect(buffer.enqueue({ kind: 'pass' })).toBe(false);
  });
});

describe('ActionBuffer — dreno e revalidação (D4)', () => {
  it('ação enfileirada que virou célula ocupada é descartada sem passo', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' }); // trem na entrada

    const buffer = new ActionBuffer();

    buffer.enqueue({ kind: 'pass' }); // move para (1,1)
    buffer.enqueue({ kind: 'tap', cell: pos(1, 1) }); // vira célula ocupada

    const results = buffer.drain(game.apply);

    expect(results).toHaveLength(2);
    expect(results[0]?.advanced).toBe(true);
    expect(results[0]?.outcome).toEqual({ kind: 'passed' });
    expect(results[1]?.advanced).toBe(false);
    expect(results[1]?.outcome).toEqual({
      kind: 'blocked',
      reason: 'train',
    });
    expect(game.state.step).toBe(2);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'east',
    });
    expect(cellAt(game.state.board, pos(1, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
    expect(buffer.isEmpty).toBe(true);
  });

  it('toque nulo enfileirado não avança; a próxima ação segue', () => {
    const game = makeGame(corridor());
    const buffer = new ActionBuffer();

    buffer.enqueue({ kind: 'tap', cell: pos(0, 0) });
    buffer.enqueue({ kind: 'pass' });

    const results = buffer.drain(game.apply);

    expect(results).toHaveLength(2);
    expect(results[0]?.advanced).toBe(false);
    expect(results[0]?.outcome).toEqual({ kind: 'null', reason: 'empty' });
    expect(results[1]?.advanced).toBe(true);
    expect(game.state.step).toBe(1);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
    expect(buffer.isEmpty).toBe(true);
  });

  it('drainNext drena uma ação por vez', () => {
    const game = makeGame(corridor());
    const buffer = new ActionBuffer();

    buffer.enqueue({ kind: 'pass' });

    const first = buffer.drainNext(game.apply);

    expect(first?.advanced).toBe(true);
    expect(buffer.isEmpty).toBe(true);
    expect(buffer.drainNext(game.apply)).toBeUndefined();
    expect(game.state.step).toBe(1);
  });
});
