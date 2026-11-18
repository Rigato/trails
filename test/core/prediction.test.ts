import { describe, expect, it } from 'vitest';
import type {
  CellPos,
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../../src/core/types';
import {
  DEFAULT_PREDICTION_STEPS,
  predictPath,
} from '../../src/core/prediction';
import {
  board,
  BLUE,
  EMPTY,
  entry,
  gameState,
  makeGame,
  makeLevel,
  pos,
  RED,
  runningTrain,
  station,
  straight,
  trainById,
  trainInState,
  trainSetup,
  curve,
} from './helpers';

function corridor(
  firstRot: Rotation = 1,
  stationColor: Color = RED,
  stationShape: Shape = 'circle',
): LevelLayout {
  return makeLevel(
    'corridor',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [
        entry('east'),
        straight(firstRot),
        straight(1),
        straight(1),
        station(stationColor, stationShape),
      ],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 1))],
  );
}

/** Loop 2×2 no sentido horário. */
const loopBoard = board([
  [curve(1), curve(2)],
  [curve(0), curve(3)],
]);

describe('predictPath — paradas', () => {
  it('trem waiting: caminho começa na entrada e termina na estação certa', () => {
    const game = makeGame(corridor());
    const prediction = game.prediction('red');

    expect(prediction?.path).toEqual([
      pos(0, 1),
      pos(1, 1),
      pos(2, 1),
      pos(3, 1),
      pos(4, 1),
    ]);
    expect(prediction?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 1),
      correct: true,
    });
    expect(prediction?.loop).toBe(false);
  });

  it('estação de cor errada sinaliza correct: false', () => {
    const game = makeGame(corridor(1, BLUE, 'square'));
    const prediction = game.prediction('red');

    expect(prediction?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 1),
      correct: false,
    });
  });

  it('borda: para na última célula e aponta a direção de saída', () => {
    const level = makeLevel(
      'offboard',
      board([
        [EMPTY, EMPTY],
        [entry('east'), straight(1)],
        [EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    const prediction = game.prediction('red');

    expect(prediction?.path).toEqual([pos(1, 1)]);
    expect(prediction?.stop).toEqual({
      kind: 'border',
      cell: pos(1, 1),
      direction: 'east',
    });
  });

  it('célula sem saída: inclui a célula fatal no caminho', () => {
    const level = makeLevel(
      'no-exit',
      board([
        [EMPTY, EMPTY, EMPTY, EMPTY],
        [entry('east'), straight(1), EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
    );
    const game = makeGame(level);

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    const prediction = game.prediction('red');

    expect(prediction?.path).toEqual([pos(1, 1), pos(2, 1)]);
    expect(prediction?.stop).toEqual({ kind: 'noExit', cell: pos(2, 1) });
  });
});

describe('predictPath — loop', () => {
  it('detecta o ciclo por (célula + direção de entrada) e devolve o anel', () => {
    const train = runningTrain('loop', RED, 'circle', pos(0, 0), 'north');
    const prediction = predictPath(loopBoard, train);

    expect(prediction?.path).toEqual([
      pos(0, 0),
      pos(1, 0),
      pos(1, 1),
      pos(0, 1),
      pos(0, 0),
    ]);
    expect(prediction?.stop).toEqual({ kind: 'loop', cell: pos(0, 0) });
    expect(prediction?.loop).toBe(true);
  });

  it('cap de segurança default é 24 e trava a simulação', () => {
    expect(DEFAULT_PREDICTION_STEPS).toBe(24);

    const train = runningTrain('loop', RED, 'circle', pos(0, 0), 'north');
    const prediction = predictPath(loopBoard, train, 3);

    expect(prediction?.path).toEqual([pos(0, 0), pos(1, 0), pos(1, 1)]);
    expect(prediction?.stop).toEqual({ kind: 'limit', cell: pos(1, 1) });
    expect(prediction?.loop).toBe(false);
  });

  it('Game.prediction repassa o cap de segurança', () => {
    const game = makeGame(corridor());
    const prediction = game.prediction('red', 2);

    expect(prediction?.path).toHaveLength(2);
    expect(prediction?.stop).toEqual({ kind: 'limit', cell: pos(1, 1) });
  });
});

describe('predictPath — recálculo e independência', () => {
  it('recalcula após giro de peça', () => {
    const game = makeGame(corridor(0));

    const before = game.prediction('red');

    expect(before?.path).toEqual([pos(0, 1), pos(1, 1)]);
    expect(before?.stop).toEqual({ kind: 'noExit', cell: pos(1, 1) });

    game.apply({ kind: 'tap', cell: pos(1, 1) });

    const after = game.prediction('red');

    expect(after?.path).toEqual([
      pos(0, 1),
      pos(1, 1),
      pos(2, 1),
      pos(3, 1),
      pos(4, 1),
    ]);
    expect(after?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 1),
      correct: true,
    });
  });

  it('recalcula após passo e começa na posição atual', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    const prediction = game.prediction('red');

    expect(prediction?.path[0]).toEqual(pos(1, 1));
    expect(prediction?.path).toEqual([
      pos(1, 1),
      pos(2, 1),
      pos(3, 1),
      pos(4, 1),
    ]);
  });

  it('ignora outros trens: o caminho atravessa a célula ocupada por outro trem', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY, EMPTY],
      [straight(1), straight(1), straight(1), straight(1)],
      [EMPTY, EMPTY, EMPTY, EMPTY],
    ]);
    const a = runningTrain('a', RED, 'circle', pos(1, 1), 'east');
    const b = runningTrain('b', BLUE, 'square', pos(2, 1), 'east');
    const state = gameState(cells, [a, b]);
    const prediction = predictPath(
      state.board,
      trainInState(state, 'a'),
    );
    const path: readonly CellPos[] = [
      pos(1, 1),
      pos(2, 1),
      pos(3, 1),
    ];

    expect(prediction?.path).toEqual(path);
    expect(prediction?.stop).toEqual({
      kind: 'border',
      cell: pos(3, 1),
      direction: 'east',
    });
  });

  it('não existe previsão para trem entregue ou descarrilado', () => {
    const delivered = makeGame(corridor());

    for (let step = 0; step < 5; step += 1) {
      delivered.apply({ kind: 'pass' });
    }

    expect(
      predictPath(delivered.state.board, trainById(delivered, 'red')),
    ).toBeUndefined();

    const derailed = makeGame(corridor(1, BLUE, 'square'));

    for (let step = 0; step < 5; step += 1) {
      derailed.apply({ kind: 'pass' });
    }

    expect(
      predictPath(derailed.state.board, trainById(derailed, 'red')),
    ).toBeUndefined();
    expect(delivered.prediction('desconhecido')).toBeUndefined();
  });
});
