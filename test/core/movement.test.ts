import { describe, expect, it } from 'vitest';
import type {
  CurvePiece,
  Direction,
  Rotation,
  StraightPiece,
  YPiece,
} from '../../src/core/types';
import { opposite } from '../../src/core/types';
import {
  moveThroughPiece,
  pieceConnections,
  resolveCell,
  ySides,
} from '../../src/core/movement';
import { EMPTY, entry, station, straight, y } from './helpers';

describe('movement — reta', () => {
  it('rot 0 e 2 conectam norte–sul', () => {
    for (const rot of [0, 2] as const) {
      const piece: StraightPiece = { kind: 'straight', rot };

      expect(new Set(pieceConnections(piece))).toEqual(
        new Set(['north', 'south']),
      );
      expect(moveThroughPiece(piece, 'south')).toBe('south');
      expect(moveThroughPiece(piece, 'north')).toBe('north');
      expect(moveThroughPiece(piece, 'east')).toBeNull();
      expect(moveThroughPiece(piece, 'west')).toBeNull();
    }
  });

  it('rot 1 e 3 conectam leste–oeste', () => {
    for (const rot of [1, 3] as const) {
      const piece: StraightPiece = { kind: 'straight', rot };

      expect(new Set(pieceConnections(piece))).toEqual(
        new Set(['east', 'west']),
      );
      expect(moveThroughPiece(piece, 'east')).toBe('east');
      expect(moveThroughPiece(piece, 'west')).toBe('west');
      expect(moveThroughPiece(piece, 'north')).toBeNull();
      expect(moveThroughPiece(piece, 'south')).toBeNull();
    }
  });
});

interface CurveCase {
  readonly rot: Rotation;
  readonly connections: readonly [Direction, Direction];
  readonly exits: readonly (readonly [Direction, Direction])[];
  readonly blocked: readonly Direction[];
}

describe('movement — curva', () => {
  const cases: readonly CurveCase[] = [
    {
      rot: 0,
      connections: ['north', 'east'],
      exits: [
        ['south', 'east'],
        ['west', 'north'],
      ],
      blocked: ['north', 'east'],
    },
    {
      rot: 1,
      connections: ['east', 'south'],
      exits: [
        ['north', 'east'],
        ['west', 'south'],
      ],
      blocked: ['east', 'south'],
    },
    {
      rot: 2,
      connections: ['south', 'west'],
      exits: [
        ['north', 'west'],
        ['east', 'south'],
      ],
      blocked: ['south', 'west'],
    },
    {
      rot: 3,
      connections: ['west', 'north'],
      exits: [
        ['east', 'north'],
        ['south', 'west'],
      ],
      blocked: ['west', 'north'],
    },
  ];

  it.each(cases)('rot $rot tem as conexões e saídas canônicas', (curveCase) => {
    const piece: CurvePiece = { kind: 'curve', rot: curveCase.rot };

    expect(new Set(pieceConnections(piece))).toEqual(
      new Set(curveCase.connections),
    );

    for (const [incoming, exit] of curveCase.exits) {
      expect(moveThroughPiece(piece, incoming)).toBe(exit);
    }

    for (const incoming of curveCase.blocked) {
      expect(moveThroughPiece(piece, incoming)).toBeNull();
    }
  });
});

interface YCase {
  readonly rot: Rotation;
  readonly stub: Direction;
  readonly arm0: Direction;
  readonly arm1: Direction;
  readonly closed: Direction;
}

describe('movement — Y (8 estados)', () => {
  const cases: readonly YCase[] = [
    { rot: 0, stub: 'north', arm0: 'east', arm1: 'west', closed: 'south' },
    { rot: 1, stub: 'east', arm0: 'south', arm1: 'north', closed: 'west' },
    { rot: 2, stub: 'south', arm0: 'west', arm1: 'east', closed: 'north' },
    { rot: 3, stub: 'west', arm0: 'north', arm1: 'south', closed: 'east' },
  ];

  it.each(cases)(
    'rot $rot: talo→ponta ativa, qualquer ponta→talo, fechado→noExit',
    (yCase) => {
      for (const arm of [0, 1] as const) {
        const piece: YPiece = {
          kind: 'y',
          rot: yCase.rot,
          arm,
          next: 'toggle',
        };
        const activeTip = arm === 0 ? yCase.arm0 : yCase.arm1;

        expect(ySides(piece)).toEqual({
          stub: yCase.stub,
          arm0: yCase.arm0,
          arm1: yCase.arm1,
          closed: yCase.closed,
        });

        // Entrar pelo talo: a saída é a ponta ativa (relativa à peça).
        expect(moveThroughPiece(piece, opposite(yCase.stub))).toBe(activeTip);

        // Qualquer ponta, ativa ou inativa, sai pelo talo.
        expect(moveThroughPiece(piece, opposite(yCase.arm0))).toBe(
          yCase.stub,
        );
        expect(moveThroughPiece(piece, opposite(yCase.arm1))).toBe(
          yCase.stub,
        );

        // Lado fechado não aceita entrada.
        expect(moveThroughPiece(piece, opposite(yCase.closed))).toBeNull();
      }
    },
  );

  it('resolveCell integra o Y ao passo/previsão', () => {
    const yCell = y(0, 0, 'toggle');

    expect(resolveCell(yCell, 'south')).toEqual({
      kind: 'exit',
      direction: 'east',
    });
    expect(resolveCell(yCell, 'west')).toEqual({
      kind: 'exit',
      direction: 'north',
    });
    expect(resolveCell(yCell, 'north')).toEqual({ kind: 'noExit' });
  });
});

describe('resolveCell', () => {
  it('resolve peça com saída e peça bloqueada', () => {
    expect(resolveCell(straight(1), 'east')).toEqual({
      kind: 'exit',
      direction: 'east',
    });
    expect(resolveCell(straight(0), 'east')).toEqual({ kind: 'noExit' });
  });

  it('célula vazia não tem saída', () => {
    expect(resolveCell(EMPTY, 'east')).toEqual({ kind: 'noExit' });
  });

  it('estação é um ponto de parada, não uma passagem', () => {
    expect(resolveCell(station(), 'east')).toEqual({ kind: 'station' });
  });

  it('entrada só aceita o trem viajando para dentro', () => {
    expect(resolveCell(entry('east'), 'east')).toEqual({
      kind: 'exit',
      direction: 'east',
    });
    expect(resolveCell(entry('east'), 'north')).toEqual({ kind: 'noExit' });
    expect(resolveCell(entry('east'), 'west')).toEqual({ kind: 'noExit' });
  });
});
