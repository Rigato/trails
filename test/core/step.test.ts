import { describe, expect, it } from 'vitest';
import { predictPath } from '../../src/core/prediction';
import { resolveStep } from '../../src/core/step';
import {
  board,
  BLUE,
  collisionsOf,
  curve,
  derailsOf,
  deliveriesOf,
  EMPTY,
  entry,
  eventKinds,
  gameState,
  GREEN,
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

describe('step — §3.10 resolução simultânea', () => {
  it('mesma célula no mesmo passo (dois destinos fatais): uma collision com todos', () => {
    const level = makeLevel(
      'same-cell',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), EMPTY, entry('west')],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(2, 1)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const result = game.apply({ kind: 'pass' });

    expect(game.state.step).toBe(2);
    expect(game.state.status).toBe('deadEnd');

    const collisions = collisionsOf(result.events);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.trainIds).toEqual(['a', 'b']);
    expect(collisions[0]?.cells).toEqual([pos(1, 1)]);

    const derails = derailsOf(result.events);

    expect(derails.map((event) => event.trainId)).toEqual(['a', 'b']);
    expect(derails.map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'deadEnd',
    ]);
    expect(trainInState(game.state, 'a').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
  });

  it('troca de células no mesmo passo: collision com as duas células', () => {
    const level = makeLevel(
      'swap',
      board([
        [EMPTY, entry('south'), EMPTY],
        [EMPTY, curve(0), curve(2)],
        [EMPTY, EMPTY, entry('north')],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(1, 0)),
        trainSetup('b', BLUE, 'square', pos(2, 2)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    expect(trainInState(game.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'north',
    });

    const result = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('deadEnd');

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

  it('célula deixada no mesmo passo é livre: fileira sem colisão', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY, EMPTY],
      [straight(1), straight(1), straight(1), straight(1)],
      [EMPTY, EMPTY, EMPTY, EMPTY],
    ]);
    const state = gameState(
      cells,
      [
        runningTrain('a', RED, 'circle', pos(2, 1), 'east'),
        runningTrain('b', BLUE, 'square', pos(1, 1), 'east'),
      ],
      5,
      'playing',
    );

    const result = resolveStep(state);

    expect(result.state.step).toBe(6);
    expect(result.state.status).toBe('playing');
    expect(collisionsOf(result.events)).toHaveLength(0);
    expect(derailsOf(result.events)).toHaveLength(0);
    expect(eventKinds(result.events)).toEqual(['trainMoved', 'trainMoved']);
    expect(trainInState(result.state, 'a').status).toEqual({
      kind: 'running',
      cell: pos(3, 1),
      incoming: 'east',
    });
    expect(trainInState(result.state, 'b').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'east',
    });
  });

  it('entrega resolve antes da ocupação: estação livre no mesmo passo', () => {
    const level = makeLevel(
      'delivery-before-occupancy',
      board([
        [EMPTY, EMPTY, EMPTY],
        [entry('east'), station(RED), entry('west')],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(2, 1)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const result = game.apply({ kind: 'pass' });

    expect(collisionsOf(result.events)).toHaveLength(0);
    expect(deliveriesOf(result.events)).toEqual([
      {
        kind: 'trainDelivered',
        trainId: 'a',
        station: pos(1, 1),
      },
    ]);
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'b',
        at: pos(1, 1),
        direction: 'west',
        reason: 'wrongStation',
      },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainDelivered',
      'trainDerailed',
      'victory',
    ]);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'a').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
  });

  it('três trens no mesmo destino: uma collision com todos os envolvidos', () => {
    const level = makeLevel(
      'three-way',
      board([
        [EMPTY, EMPTY, entry('south'), EMPTY, EMPTY],
        [EMPTY, EMPTY, straight(0), EMPTY, EMPTY],
        [entry('east'), straight(1), EMPTY, straight(1), entry('west')],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 2)),
        trainSetup('b', BLUE, 'square', pos(4, 2)),
        trainSetup('c', GREEN, 'triangle', pos(2, 0)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    expect(trainInState(game.state, 'c').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'south',
    });

    const result = game.apply({ kind: 'pass' });
    const collisions = collisionsOf(result.events);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]?.trainIds).toEqual(['a', 'b', 'c']);
    expect(collisions[0]?.cells).toEqual([pos(2, 2)]);
    expect(derailsOf(result.events).map((event) => event.trainId)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'trainDerailed',
      'deadEnd',
    ]);
    expect(game.state.status).toBe('deadEnd');
  });
});

describe('step — estado de jogo', () => {
  it('vitória espera o último trem ativo; trem perdido antes não encerra a run', () => {
    const level = makeLevel(
      'mixed-fates',
      board([
        [entry('east'), EMPTY, EMPTY, EMPTY, EMPTY],
        [entry('east'), straight(1), straight(1), straight(1), station(RED)],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [
        trainSetup('a', RED, 'circle', pos(0, 1)),
        trainSetup('b', BLUE, 'square', pos(0, 0)),
      ],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    const second = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('playing');
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(eventKinds(second.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'trainDerailed',
    ]);

    for (let step = 2; step < 5; step += 1) {
      game.apply({ kind: 'pass' });
    }

    expect(game.state.step).toBe(5);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'a').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'b').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });
});

describe('step — slot de coleta (P2)', () => {
  it('coletor opcional recebe os movimentos do passo', () => {
    const state = gameState(
      board([[straight(1), straight(1)]]),
      [runningTrain('a', RED, 'circle', pos(0, 0), 'east')],
    );
    const seen: number[] = [];
    const result = resolveStep(state, {
      collect: ({ moves }) => {
        seen.push(moves.length);
        return [];
      },
    });

    expect(seen).toEqual([1]);
    expect(result.state.step).toBe(1);
    expect(eventKinds(result.events)).toEqual(['trainMoved']);
  });
});

describe('step — loop e estados inválidos', () => {
  it('trem em loop continua ativo e a previsão segue em anel', () => {
    const cells = board([
      [curve(1), curve(2)],
      [curve(0), curve(3)],
    ]);
    let state = gameState(
      cells,
      [runningTrain('loop', RED, 'circle', pos(0, 0), 'north')],
      0,
      'playing',
    );

    for (let step = 1; step <= 4; step += 1) {
      const result = resolveStep(state);

      state = result.state;

      expect(state.status).toBe('playing');
      expect(collisionsOf(result.events)).toHaveLength(0);
      expect(derailsOf(result.events)).toHaveLength(0);
    }

    expect(state.step).toBe(4);
    expect(trainInState(state, 'loop').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'north',
    });
    expect(predictPath(state.board, trainInState(state, 'loop'))?.loop).toBe(
      true,
    );
  });

  it('trem running sem saída descarrila noExit sem se mover', () => {
    const state = gameState(
      board([[straight(0)]]),
      [runningTrain('x', RED, 'circle', pos(0, 0), 'east')],
    );
    const result = resolveStep(state);

    expect(result.state.status).toBe('deadEnd');
    expect(trainInState(result.state, 'x').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(eventKinds(result.events)).toEqual(['trainDerailed', 'deadEnd']);
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'x',
        at: pos(0, 0),
        direction: 'east',
        reason: 'noExit',
      },
    ]);
  });
});
