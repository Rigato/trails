import { describe, expect, it } from 'vitest';
import type {
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import {
  board,
  BLUE,
  derailsOf,
  deliveriesOf,
  EMPTY,
  entry,
  eventKinds,
  makeGame,
  makeLevel,
  movementsOf,
  pos,
  RED,
  station,
  straight,
  trainById,
  trainSetup,
} from './helpers';

/** Corredor de 5×3: entrada a oeste, 3 retas e estação a leste. */
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

describe('game — estado inicial e entrada', () => {
  it('começa ready, com trem waiting fora da grade; previsão parte da entrada', () => {
    const game = makeGame(corridor());

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });

    const prediction = game.prediction('red');

    expect(prediction?.path[0]).toEqual(pos(0, 1));
    expect(prediction?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 1),
      correct: true,
    });
  });

  it('waiting não ocupa: girar a peça da entrada é permitido e avança 1 passo', () => {
    const game = makeGame(corridor());
    const result = game.apply({ kind: 'tap', cell: pos(0, 1) });

    expect(result.advanced).toBe(true);
    expect(result.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(1);
    expect(game.state.status).toBe('playing');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
  });

  it('1º passo válido entra na entrada; o 2º anda exatamente 1 célula', () => {
    const game = makeGame(corridor());

    const first = game.apply({ kind: 'pass' });

    expect(first.advanced).toBe(true);
    expect(first.outcome).toEqual({ kind: 'passed' });
    expect(game.state.step).toBe(1);
    expect(game.state.status).toBe('playing');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });

    const moves = movementsOf(first.events);

    expect(moves).toEqual([
      {
        kind: 'trainMoved',
        trainId: 'red',
        from: null,
        to: pos(0, 1),
      },
    ]);

    const second = game.apply({ kind: 'pass' });

    expect(second.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'east',
    });
  });
});

describe('game — 1 ação = 1 passo', () => {
  it('giro de peça livre move exatamente 1 célula e emite pieceRotated', () => {
    const game = makeGame(corridor(0));
    const result = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(result.advanced).toBe(true);
    expect(result.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(1);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
    expect(eventKinds(result.events)[0]).toBe('pieceRotated');
  });

  it('giro de peça à frente com o trem em campo move exatamente 1 célula', () => {
    const game = makeGame(corridor(0));

    game.apply({ kind: 'tap', cell: pos(1, 1) });
    game.apply({ kind: 'pass' });

    expect(game.state.step).toBe(2);

    const result = game.apply({ kind: 'tap', cell: pos(3, 1) });

    expect(result.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(3);
    expect(trainById(game, 'red').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'east',
    });
  });

  it('toque nulo em vazio, estação e célula do trem não move', () => {
    const game = makeGame(corridor());

    game.apply({ kind: 'pass' });
    game.apply({ kind: 'pass' });

    expect(game.state.step).toBe(2);

    const before = game.state;
    const empty = game.apply({ kind: 'tap', cell: pos(0, 0) });
    const fixed = game.apply({ kind: 'tap', cell: pos(4, 1) });
    const blocked = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(empty.advanced).toBe(false);
    expect(empty.outcome).toEqual({ kind: 'null', reason: 'empty' });
    expect(fixed.advanced).toBe(false);
    expect(fixed.outcome).toEqual({ kind: 'null', reason: 'fixed' });
    expect(blocked.advanced).toBe(false);
    expect(blocked.outcome).toEqual({ kind: 'blocked', reason: 'train' });
    expect(game.state.step).toBe(2);
    expect(game.state).toBe(before);
    expect(empty.state).toBe(before);
    expect(fixed.state).toBe(before);
    expect(blocked.state).toBe(before);
  });
});

describe('game — entrega e fim', () => {
  it('entrega na estação da cor certa sai do tabuleiro e vira vitória', () => {
    const game = makeGame(corridor());
    let last = game.apply({ kind: 'pass' });

    for (let step = 1; step < 5; step += 1) {
      last = game.apply({ kind: 'pass' });
    }

    expect(game.state.step).toBe(5);
    expect(game.state.status).toBe('won');
    expect(trainById(game, 'red').status).toEqual({ kind: 'delivered' });
    expect(game.prediction('red')).toBeUndefined();

    expect(deliveriesOf(last.events)).toEqual([
      {
        kind: 'trainDelivered',
        trainId: 'red',
        station: pos(4, 1),
      },
    ]);
    expect(eventKinds(last.events)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);

    const after = game.apply({ kind: 'pass' });

    expect(after.advanced).toBe(false);
    expect(after.outcome).toEqual({ kind: 'ignored', reason: 'finished' });
    expect(game.state.step).toBe(5);
  });

  it('estação de cor errada descarrila e expõe deadEnd', () => {
    const game = makeGame(corridor(1, BLUE, 'square'));

    for (let step = 0; step < 4; step += 1) {
      game.apply({ kind: 'pass' });
    }

    expect(game.prediction('red')?.stop).toEqual({
      kind: 'station',
      cell: pos(4, 1),
      correct: false,
    });

    const last = game.apply({ kind: 'pass' });

    expect(game.state.step).toBe(5);
    expect(game.state.status).toBe('deadEnd');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(game.prediction('red')).toBeUndefined();
    expect(derailsOf(last.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'red',
        at: pos(4, 1),
        direction: 'east',
        reason: 'wrongStation',
      },
    ]);
    expect(eventKinds(last.events).at(-1)).toBe('deadEnd');

    const after = game.apply({ kind: 'pass' });

    expect(after.outcome).toEqual({ kind: 'ignored', reason: 'finished' });
    expect(after.advanced).toBe(false);
    expect(game.state.step).toBe(5);
  });

  it('saída pela borda descarrila offBoard e a previsão para na última célula', () => {
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

    const result = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('deadEnd');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'offBoard',
    });
    expect(eventKinds(result.events)).toEqual(['trainDerailed', 'deadEnd']);
  });

  it('chegar a célula vazia descarrila noExit; previsão inclui a célula fatal', () => {
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

    const result = game.apply({ kind: 'pass' });

    expect(game.state.status).toBe('deadEnd');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(movementsOf(result.events)).toEqual([
      {
        kind: 'trainMoved',
        trainId: 'red',
        from: pos(1, 1),
        to: pos(2, 1),
      },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'deadEnd',
    ]);
  });
});

describe('game — reset', () => {
  it('restaura o estado inicial e as orientações originais', () => {
    const game = makeGame(corridor(0));

    game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(game.state.step).toBe(1);

    const reset = game.reset();

    expect(reset).toBe(game.state);
    expect(reset.step).toBe(0);
    expect(reset.status).toBe('ready');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(cellAt(reset.board, pos(1, 1))).toEqual({
      kind: 'piece',
      piece: { kind: 'straight', rot: 0 },
    });
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'noExit',
      cell: pos(1, 1),
    });

    const again = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(again.advanced).toBe(true);
    expect(game.state.step).toBe(1);
  });
});

describe('game — validação do layout', () => {  it('aceita o corredor válido', () => {
    expect(() => setup(corridor())).not.toThrow();
  });

  it('rejeita board com número de linhas errado', () => {
    const level = corridor();
    const bad: LevelLayout = {
      ...level,
      board: { ...level.board, rows: level.board.rows.slice(0, 2) },
    };

    expect(() => setup(bad)).toThrow(/linhas/);
  });

  it('rejeita linha com largura errada', () => {
    const level = corridor();
    const rows = level.board.rows.map((row, index) =>
      index === 0 ? row.slice(0, 4) : row,
    );
    const bad: LevelLayout = {
      ...level,
      board: { ...level.board, rows },
    };

    expect(() => setup(bad)).toThrow(/linha 0/);
  });

  it('rejeita dimensões não positivas', () => {
    const bad = makeLevel('zero', board([]), []);

    expect(() => setup(bad)).toThrow(/inteiros positivos/);
  });

  it('rejeita entrada fora da grade', () => {
    const bad = makeLevel('out-of-bounds', corridor().board, [
      trainSetup('red', RED, 'circle', pos(-1, 0)),
    ]);

    expect(() => setup(bad)).toThrow(/fora da grade/);
  });

  it('rejeita entrada fora da borda', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [EMPTY, straight(1), EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const bad = makeLevel('interior', cells, [
      trainSetup('red', RED, 'circle', pos(1, 1)),
    ]);

    expect(() => setup(bad)).toThrow(/borda e apontar para dentro/);
  });

  it('rejeita direção de entrada paralela à borda', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('north'), EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const bad = makeLevel('wrong-direction', cells, [
      trainSetup('red', RED, 'circle', pos(0, 1), 'north'),
    ]);

    expect(() => setup(bad)).toThrow(/borda e apontar para dentro/);
  });

  it('rejeita primeira célula de entrada sem peça de trilho', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const bad = makeLevel('no-track', cells, [
      trainSetup('red', RED, 'circle', pos(0, 1)),
    ]);

    expect(() => setup(bad)).toThrow(/peça de trilho/);
  });

  it('rejeita dois trens na mesma entrada', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const bad = makeLevel('shared-entry', cells, [
      trainSetup('a', RED, 'circle', pos(0, 1)),
      trainSetup('b', BLUE, 'square', pos(0, 1)),
    ]);

    expect(() => setup(bad)).toThrow(/mesma entrada/);
  });

  it('rejeita ids de trem duplicados', () => {
    const cells = board([
      [EMPTY, EMPTY, EMPTY],
      [entry('east'), EMPTY, entry('west')],
      [EMPTY, EMPTY, EMPTY],
    ]);
    const bad = makeLevel('duplicate-id', cells, [
      trainSetup('a', RED, 'circle', pos(0, 1)),
      trainSetup('a', BLUE, 'square', pos(2, 1), 'west'),
    ]);

    expect(() => setup(bad)).toThrow(/duplicado/);
  });

  it('rejeita fase sem trem', () => {
    const bad = makeLevel('no-trains', board([[EMPTY]]), []);

    expect(() => setup(bad)).toThrow(/ao menos um trem/);
  });
});
