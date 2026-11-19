import { describe, expect, it } from 'vitest';
import type { Board, CellPos, LevelLayout } from '../../src/core/types';
import { validateLayout } from '../../src/core/game';
import {
  board,
  bridge,
  EMPTY,
  makeGame,
  makeLevel,
  pos,
  RED,
  river,
  station,
  straight,
  trainSetup,
} from './helpers';

function badLayout(
  cells: Board,
  coins?: readonly CellPos[],
): LevelLayout {
  return { id: 'bad', name: 'bad', board: cells, trains: [], coins };
}

function expectInvalid(layout: LevelLayout, message: string): void {
  expect(() => validateLayout(layout)).toThrow(message);
}

describe('validação — banda de rio e ponte', () => {
  it('aceita banda horizontal com ponte perpendicular', () => {
    const cells = board([
      [straight(1), EMPTY, EMPTY],
      [river(), bridge('north-south'), river()],
      [EMPTY, EMPTY, EMPTY],
    ]);

    expect(() =>
      makeGame(
        makeLevel(
          'river-horizontal',
          cells,
          [trainSetup('red', RED, 'circle', pos(0, 0))],
          3,
        ),
      ),
    ).not.toThrow();
  });

  it('aceita banda vertical com ponte perpendicular', () => {
    const cells = board([
      [straight(1), river(), EMPTY],
      [EMPTY, bridge('east-west'), EMPTY],
      [EMPTY, river(), EMPTY],
    ]);

    expect(() =>
      makeGame(
        makeLevel(
          'river-vertical',
          cells,
          [trainSetup('red', RED, 'circle', pos(0, 0))],
          3,
        ),
      ),
    ).not.toThrow();
  });

  it('aceita dois rios, cada um com sua ponte', () => {
    const cells = board([
      [straight(1), EMPTY, EMPTY, EMPTY, EMPTY],
      [river(), bridge('north-south'), river(), EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, river(), bridge('north-south'), river()],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    ]);

    expect(() =>
      makeGame(
        makeLevel(
          'two-rivers',
          cells,
          [trainSetup('red', RED, 'circle', pos(0, 0))],
          3,
        ),
      ),
    ).not.toThrow();
  });

  it('rejeita banda não-reta (L)', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY],
          [EMPTY, bridge('north-south'), river()],
          [EMPTY, river(), EMPTY],
        ]),
      ),
      'Layout inválido: o rio precisa ser uma banda reta e contígua (linha ou coluna).',
    );
  });

  it('rejeita banda diagonal/escada', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY, EMPTY],
          [EMPTY, bridge('north-south'), river(), EMPTY],
          [EMPTY, EMPTY, river(), EMPTY],
          [EMPTY, EMPTY, river(), EMPTY],
        ]),
      ),
      'Layout inválido: o rio precisa ser uma banda reta e contígua (linha ou coluna).',
    );
  });

  it('rejeita banda quebrada: o segmento sem ponte é um rio sem ponte', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
          [river(), bridge('north-south'), EMPTY, EMPTY, river()],
        ]),
      ),
      'Layout inválido: cada rio precisa de exatamente uma ponte.',
    );
  });

  it('rejeita rio sem ponte', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY],
          [river(), river()],
        ]),
      ),
      'Layout inválido: cada rio precisa de exatamente uma ponte.',
    );
  });

  it('rejeita dois rios quando só um tem ponte própria', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
          [river(), bridge('north-south'), EMPTY, river(), EMPTY],
        ]),
      ),
      'Layout inválido: cada rio precisa de exatamente uma ponte.',
    );
  });

  it('rejeita duas pontes na mesma banda', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
          [river(), bridge('north-south'), river(), bridge('north-south'), river()],
        ]),
      ),
      'Layout inválido: cada rio precisa de exatamente uma ponte.',
    );
  });

  it('rejeita ponte fora da banda de rio', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY],
          [EMPTY, bridge('north-south'), EMPTY],
          [EMPTY, EMPTY, EMPTY],
        ]),
      ),
      'Layout inválido: a ponte precisa estar dentro da banda de um rio.',
    );
  });

  it('rejeita eixo de ponte paralelo à banda', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY],
          [river(), bridge('east-west'), river()],
        ]),
      ),
      'Layout inválido: o eixo da ponte precisa ser perpendicular ao rio.',
    );
  });
});

describe('validação — moedas', () => {
  it('aceita moeda sobre a ponte', () => {
    const cells = board([
      [straight(1), EMPTY, EMPTY],
      [river(), bridge('north-south'), river()],
      [EMPTY, EMPTY, EMPTY],
    ]);

    expect(() =>
      makeGame(
        {
          ...makeLevel(
            'coin-bridge',
            cells,
            [trainSetup('red', RED, 'circle', pos(0, 0))],
            3,
          ),
          coins: [pos(1, 1)],
        },
      ),
    ).not.toThrow();
  });

  it('rejeita moeda fora da grade', () => {
    expectInvalid(
      badLayout(board([[straight(1), EMPTY]]), [pos(-1, 0)]),
      'Layout inválido: moeda fora da grade.',
    );
  });

  it('rejeita moeda duplicada', () => {
    expectInvalid(
      badLayout(board([[straight(1), straight(1)]]), [
        pos(1, 0),
        pos(1, 0),
      ]),
      'Layout inválido: moeda duplicada em (1,0).',
    );
  });

  it('rejeita moeda em célula vazia', () => {
    expectInvalid(
      badLayout(board([[straight(1), EMPTY]]), [pos(1, 0)]),
      'Layout inválido: a moeda em (1,0) precisa estar sobre trilho (peça ou ponte).',
    );
  });

  it('rejeita moeda na água', () => {
    expectInvalid(
      badLayout(
        board([
          [EMPTY, EMPTY, EMPTY],
          [river(), bridge('north-south'), river()],
        ]),
        [pos(0, 1)],
      ),
      'Layout inválido: a moeda em (0,1) precisa estar sobre trilho (peça ou ponte).',
    );
  });

  it('rejeita moeda na estação', () => {
    expectInvalid(
      badLayout(board([[straight(1), station(RED)]]), [pos(1, 0)]),
      'Layout inválido: a moeda em (1,0) precisa estar sobre trilho (peça ou ponte).',
    );
  });
});
