import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { classifyAction, withRotatedPiece } from '../../src/core/actions';
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
  y,
} from './helpers';

describe('Y no jogo — ABAB e ocupação', () => {
  it('todo toque em Y livre alterna toggle/rotate e avança exatamente 1 passo', () => {
    const level = makeLevel(
      'y-off-path',
      board([
        [y(0, 0, 'toggle'), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [
          entry('east'),
          straight(1),
          straight(1),
          straight(1),
          straight(1),
          station(RED),
        ],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
    );
    const game = makeGame(level);
    const kinds: string[] = [];

    for (let tap = 0; tap < 4; tap += 1) {
      const result = game.apply({ kind: 'tap', cell: pos(0, 0) });

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(tap % 2 === 0 ? 'toggled' : 'rotated');
      expect(game.state.step).toBe(tap + 1);
      expect(eventKinds(result.events)[0]).toBe(
        tap % 2 === 0 ? 'pieceToggled' : 'pieceRotated',
      );
      kinds.push(result.outcome.kind);
    }

    expect(kinds).toEqual(['toggled', 'rotated', 'toggled', 'rotated']);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(3, 1),
      incoming: 'east',
    });
  });

  it('Y ocupado por trem bloqueia o toque sem avançar', () => {
    const level = makeLevel(
      'y-occupied',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), y(0, 0, 'toggle'), EMPTY],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const move = game.apply({ kind: 'pass' });

    expect(move.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'east',
    });

    const blocked = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(blocked.advanced).toBe(false);
    expect(blocked.outcome).toEqual({ kind: 'blocked', reason: 'train' });
    expect(game.state.step).toBe(2);
    expect(cellAt(game.state.board, pos(1, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 0, arm: 0, next: 'toggle' },
    });
  });
});

describe('Y — §3.10', () => {
  it('dois trens em pontas opostas no mesmo passo colidem na célula do Y', () => {
    const level = makeLevel(
      'y-opposite',
      board([
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [
          entry('east'),
          straight(1),
          y(0, 0, 'toggle'),
          straight(1),
          entry('west'),
        ],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('red', RED, 'circle', pos(0, 1)),
        trainSetup('blue', BLUE, 'square', pos(4, 1)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });
    const result = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('deadEnd');
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'deadEnd',
    ]);

    const collisions = collisionsOf(result.events);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.trainIds).toEqual(['red', 'blue']);
    expect(collisions[0]?.cells).toEqual([pos(2, 1)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toHaveLength(0);
  });

  it('swap através do Y usa a regra geral de troca de células', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [EMPTY, y(0, 0, 'toggle'), straight(1)],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(cells, [
      runningTrain('a', RED, 'circle', pos(1, 1), 'south'),
      runningTrain('b', BLUE, 'square', pos(2, 1), 'west'),
    ]);
    const result = resolveStep(state);

    expect(result.state.status).toBe('deadEnd');

    const collisions = collisionsOf(result.events);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.trainIds).toEqual(['a', 'b']);
    expect(collisions[0]?.cells).toHaveLength(2);
    expect(collisions[0]?.cells).toContainEqual(pos(1, 1));
    expect(collisions[0]?.cells).toContainEqual(pos(2, 1));
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
  });
});

/**
 * Estado fabricado da janela: A entra no Y no passo 1, B chega dois passos
 * depois. Com rearme no meio, ambos entregam; sem, B vai à estação errada.
 */
function runSyncWindow(rearm: boolean) {
  const cells = board([
    [EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, station(RED), y(2, 0, 'toggle'), station(BLUE)],
    [EMPTY, EMPTY, straight(2), EMPTY],
    [EMPTY, EMPTY, straight(2), EMPTY],
    [EMPTY, EMPTY, straight(2), EMPTY],
  ]);
  let state = gameState(
    cells,
    [
      runningTrain('a', RED, 'circle', pos(2, 2), 'north'),
      runningTrain('b', BLUE, 'square', pos(2, 4), 'north'),
    ],
    0,
    'playing',
    3,
  );
  const events: GameEvent[] = [];

  for (let step = 0; step < 2; step += 1) {
    const result = resolveStep(state);

    state = result.state;
    events.push(...result.events);
  }

  if (rearm) {
    const toggle = classifyAction(state, {
      kind: 'tap',
      cell: pos(2, 1),
    });

    expect(toggle.kind).toBe('toggled');

    if (toggle.kind !== 'toggled') {
      throw new Error('esperava toggled no Y');
    }

    state = {
      ...state,
      board: withRotatedPiece(state.board, pos(2, 1), toggle.to),
    };
  }

  for (let step = 0; step < 2; step += 1) {
    const result = resolveStep(state);

    state = result.state;
    events.push(...result.events);
  }

  return { state, events };
}

describe('Y — janela de sincronia (fabricada)', () => {
  it('rearmar o Y entre A e B entrega os dois', () => {
    const { state, events } = runSyncWindow(true);

    expect(state.step).toBe(4);
    expect(state.status).toBe('won');
    expect(state.lives).toBe(3);
    expect(trainInState(state, 'a').status).toEqual({ kind: 'delivered' });
    expect(trainInState(state, 'b').status).toEqual({ kind: 'delivered' });
    expect(deliveriesOf(events)).toHaveLength(2);
    expect(collisionsOf(events)).toHaveLength(0);
    expect(derailsOf(events)).toHaveLength(0);
    expect(lifeLossesOf(events)).toHaveLength(0);
  });

  it('sem rearmar, B descarrila na estação errada (rota sacrificial)', () => {
    const { state, events } = runSyncWindow(false);

    expect(state.status).toBe('won');
    expect(state.lives).toBe(2);
    expect(trainInState(state, 'a').status).toEqual({ kind: 'delivered' });
    expect(trainInState(state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(collisionsOf(events)).toHaveLength(0);

    const derails = derailsOf(events);

    expect(derails).toHaveLength(1);
    expect(derails[0]?.reason).toBe('wrongStation');

    const losses = lifeLossesOf(events);

    expect(losses).toHaveLength(1);
    expect(losses[0]?.remaining).toBe(2);
  });
});
