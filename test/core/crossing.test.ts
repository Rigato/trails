import { describe, expect, it } from 'vitest';
import { resolveCell } from '../../src/core/movement';
import { resolveStep } from '../../src/core/step';
import {
  board,
  crossing,
  EMPTY,
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
  trainSetup,
} from './helpers';

describe('cruzamento — dois canais retos', () => {
  it('N→S, S→N, E→O, O→E: continua na direção de deslocamento', () => {
    // `incoming` é a direção em que o trem viaja; a “entrada por N” do GDD
    // significa viajar para S. Em todos os canais a saída é a mesma direção.
    const cases = [
      ['north', 'north'], // entra por S, viaja para N, sai N
      ['south', 'south'], // entra por N, viaja para S, sai S
      ['east', 'east'], // entra por O, viaja para L, sai L
      ['west', 'west'], // entra por L, viaja para O, sai O
    ] as const;

    for (const [incoming, exit] of cases) {
      expect(resolveCell(crossing(), incoming)).toEqual({
        kind: 'exit',
        direction: exit,
      });
    }
  });

  it('rot é cosmético: as quatro rotações têm o mesmo movimento', () => {
    for (const rot of [0, 1, 2, 3] as const) {
      for (const direction of ['north', 'east', 'south', 'west'] as const) {
        expect(resolveCell(crossing(rot), direction)).toEqual({
          kind: 'exit',
          direction,
        });
      }
    }
  });

  it('toque no cruzamento é null/crossing e não avança o passo', () => {
    const level = makeLevel(
      'crossing-null',
      board([
        [EMPTY, EMPTY, EMPTY],
        [straight(1), crossing(), station(RED)],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1))],
    );
    const game = makeGame(level);

    const result = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(result.advanced).toBe(false);
    expect(result.outcome).toEqual({ kind: 'null', reason: 'crossing' });
    expect(game.state.step).toBe(0);
  });

  it('dois trens na mesma célula do cruzamento, canais diferentes = colisão', () => {
    const result = resolveStep(
      gameState(
        board([
          [EMPTY, straight(0)],
          [straight(1), crossing()],
        ]),
        [
          runningTrain('a', RED, 'circle', pos(1, 0), 'south'),
          runningTrain('b', RED, 'circle', pos(0, 1), 'east'),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(result.state.lives).toBe(2);
    expect(result.state.status).toBe('deadEnd');
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainMoved',
      'collision',
      'trainDerailed',
      'trainDerailed',
      'lifeLost',
      'deadEnd',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
    expect(
      result.events.find((event) => event.kind === 'collision'),
    ).toMatchObject({
      kind: 'collision',
      cells: [pos(1, 1)],
    });
  });

  it('moeda sobre o cruzamento é coletada no slot', () => {
    const level = makeLevel(
      'crossing-coin',
      board([[straight(1), crossing()]]),
      [trainSetup('red', RED, 'circle', pos(0, 0))],
      3,
    );
    const game = makeGame({ ...level, coins: [pos(1, 0)] });

    game.apply({ kind: 'pass' }); // entra em (0,0)
    const result = game.apply({ kind: 'pass' }); // chega ao cruzamento

    expect(game.state.coinsCollected).toEqual([pos(1, 0)]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'coinCollected',
    ]);
    expect(
      result.events.find((event) => event.kind === 'coinCollected'),
    ).toEqual({
      kind: 'coinCollected',
      trainId: 'red',
      cell: pos(1, 0),
    });
  });
});
