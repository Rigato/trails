import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { ActionBuffer } from '../../src/core/buffer';
import { setup } from '../../src/core/game';
import {
  BLUE,
  board,
  EMPTY,
  entry,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainSetup,
  y,
} from '../core/helpers';

/**
 * Dois corredores paralelos (um trem para cada lado) e um Y decorativo na
 * terceira linha, sempre livre: o teste isola o contrato do buffer com 2 trens
 * + Y, sem depender do rascunho do P1 (o layout definitivo é do E9).
 *
 *   0: >  |  |  |  @
 *   1: @  |  |  |  <
 *   2: .  .  Y  .  .
 */
function syncCorridor() {
  return makeLevel(
    'feel-sync',
    board([
      [entry('east'), straight(1), straight(1), straight(1), station(RED)],
      [
        station(BLUE, 'square'),
        straight(1),
        straight(1),
        straight(1),
        entry('west'),
      ],
      [EMPTY, EMPTY, y(0, 0, 'toggle'), EMPTY, EMPTY],
    ]),
    [
      trainSetup('red', RED, 'circle', pos(0, 0)),
      trainSetup('blue', BLUE, 'square', pos(4, 1)),
    ],
  );
}

/** Toque na célula (col, row). */
function tap(col: number, row: number): Action {
  return { kind: 'tap', cell: { col, row } };
}

/**
 * E8: rajada de 3 ações durante o primeiro passo, com 2 trens em campo e um Y.
 *
 * A 1ª ação é o toggle do Y; as outras duas chegam durante a animação e
 * drenam uma por passo — a 2ª é «passar turno», a 3ª gira o MESMO Y (ABAB:
 * depois do toggle, o próximo toque gira). No fim, 3 passos na ordem, os dois
 * trens avançaram uma célula por passo e o Y ficou girado.
 */
describe('buffer com 2 trens + Y (E8)', () => {
  it('3 ações durante a animação → 3 passos na ordem, um toggle e um giro do Y', () => {
    const game = setup(syncCorridor());
    const buffer = new ActionBuffer(12);

    const first = game.apply(tap(2, 2));

    expect(first.advanced).toBe(true);
    expect(first.outcome.kind).toBe('toggled');
    expect(game.state.step).toBe(1);
    expect(game.state.trains).toMatchObject([
      {
        id: 'red',
        status: { kind: 'running', cell: pos(0, 0) },
      },
      {
        id: 'blue',
        status: { kind: 'running', cell: pos(4, 1) },
      },
    ]);

    expect(buffer.enqueue({ kind: 'pass' })).toBe(true);
    expect(buffer.enqueue(tap(2, 2))).toBe(true);
    expect(buffer.size).toBe(2);

    const second = buffer.drainNext((action) => game.apply(action));

    expect(second?.advanced).toBe(true);
    expect(second?.outcome).toEqual({ kind: 'passed' });
    expect(game.state.step).toBe(2);
    expect(game.state.trains).toMatchObject([
      {
        id: 'red',
        status: { kind: 'running', cell: pos(1, 0), incoming: 'east' },
      },
      {
        id: 'blue',
        status: { kind: 'running', cell: pos(3, 1), incoming: 'west' },
      },
    ]);

    const third = buffer.drainNext((action) => game.apply(action));

    expect(third?.advanced).toBe(true);
    expect(third?.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(3);
    expect(game.state.trains).toMatchObject([
      {
        id: 'red',
        status: { kind: 'running', cell: pos(2, 0), incoming: 'east' },
      },
      {
        id: 'blue',
        status: { kind: 'running', cell: pos(2, 1), incoming: 'west' },
      },
    ]);
    expect(buffer.isEmpty).toBe(true);

    // ABAB: toggle (arm 0→1) e depois giro 90° CW; o braço viaja com a peça.
    expect(cellAt(game.state.board, pos(2, 2))).toMatchObject({
      kind: 'piece',
      piece: { kind: 'y', rot: 1, arm: 1, next: 'toggle' },
    });

    // As duas previsões partem das células novas e terminam na estação certa.
    const red = game.prediction('red', 24);
    const blue = game.prediction('blue', 24);

    expect(red?.path[0]).toEqual(pos(2, 0));
    expect(red?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 0),
      correct: true,
    });
    expect(blue?.path[0]).toEqual(pos(2, 1));
    expect(blue?.stop).toEqual({
      kind: 'station',
      cell: pos(0, 1),
      correct: true,
    });
  });
});
