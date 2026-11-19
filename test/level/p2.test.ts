import { describe, expect, it } from 'vitest';
import type { Action, CellPos, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { P2_DRAFT } from '../../src/level/p2';
import {
  bridge,
  collisionsOf,
  derailsOf,
  eventKinds,
  lifeLossesOf,
  pos,
  trainInState,
} from '../core/helpers';

/** Ação da solução: toque numa célula ou «passar turno». */
type SolutionAction = { readonly kind: 'tap'; readonly cell: CellPos } | { readonly kind: 'pass' };

/** Solução documentada no cabeçalho de `src/level/p2.ts` (10 passos). */
const SOLUTION: readonly SolutionAction[] = [
  { kind: 'tap', cell: pos(2, 5) }, // toggle entrada azul
  { kind: 'tap', cell: pos(2, 1) }, // curva vermelha
  { kind: 'tap', cell: pos(1, 3) }, // curva azul
  { kind: 'tap', cell: pos(4, 2) }, // reta compartilhada
  { kind: 'tap', cell: pos(2, 3) }, // curva azul
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'tap', cell: pos(5, 2) }, // toggle split
  { kind: 'pass' },
];

const PASS: Action = { kind: 'pass' };

function setupP2() {
  return setup(P2_DRAFT);
}

describe('P2 «Obstáculos» — contrato do dado', () => {
  it('6×6, um rio vertical com uma ponte perpendicular', () => {
    const board = P2_DRAFT.board;
    const water: CellPos[] = [];
    const bridges: CellPos[] = [];

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(P2_DRAFT.lives).toBe(3);
    expect(P2_DRAFT.trains).toHaveLength(2);

    for (let row = 0; row < board.height; row += 1) {
      for (let col = 0; col < board.width; col += 1) {
        const cell = cellAt(board, pos(col, row));

        if (cell?.kind === 'fixed' && cell.fixed.kind === 'river') {
          water.push(pos(col, row));
        }

        if (cell?.kind === 'fixed' && cell.fixed.kind === 'bridge') {
          bridges.push(pos(col, row));
        }
      }
    }

    // Banda 4-conexa e reta na coluna 3; a ponte é a única travessia.
    expect(water).toEqual([
      pos(3, 0),
      pos(3, 1),
      pos(3, 3),
      pos(3, 4),
      pos(3, 5),
    ]);
    expect(bridges).toEqual([pos(3, 2)]);
    expect(cellAt(board, pos(3, 2))).toEqual(bridge('east-west'));

    for (let row = 0; row < board.height; row += 1) {
      const cell = cellAt(board, pos(3, row));

      expect(cell?.kind).toBe('fixed');

      if (cell?.kind === 'fixed') {
        expect(['river', 'bridge']).toContain(cell.fixed.kind);
      }
    }

    // Nenhuma água fora da banda.
    expect(water.every((cell) => cell.col === 3)).toBe(true);
  });

  it('as três moedas ficam sobre trilho e uma delas na ponte', () => {
    expect(P2_DRAFT.coins).toEqual([pos(1, 1), pos(1, 4), pos(3, 2)]);

    for (const coin of P2_DRAFT.coins ?? []) {
      const cell = cellAt(P2_DRAFT.board, coin);
      const onTrack =
        cell?.kind === 'piece' ||
        (cell?.kind === 'fixed' && cell.fixed.kind === 'bridge');

      expect(onTrack).toBe(true);
    }

    expect(cellAt(P2_DRAFT.board, pos(3, 2))).toEqual(
      bridge('east-west'),
    );
  });

  it('entradas off-board, células de trilho e estações dos pares', () => {
    const red = P2_DRAFT.trains.find((train) => train.id === 'red');
    const blue = P2_DRAFT.trains.find((train) => train.id === 'blue');

    expect(red?.entry).toEqual({
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(blue?.entry).toEqual({
      cell: pos(2, 5),
      direction: 'north',
    });
    expect(cellAt(P2_DRAFT.board, pos(0, 1))?.kind).toBe('piece');
    expect(cellAt(P2_DRAFT.board, pos(2, 5))?.kind).toBe('piece');

    const redStation = cellAt(P2_DRAFT.board, pos(5, 1));
    const blueStation = cellAt(P2_DRAFT.board, pos(5, 3));

    expect(redStation).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: red?.color,
        shape: red?.shape,
      },
    });
    expect(blueStation).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: blue?.color,
        shape: blue?.shape,
      },
    });
  });
});

describe('P2 «Obstáculos» — primeiro quadro e solução', () => {
  it('o primeiro quadro avisa o giro vermelho e a água azul (Pilar 3)', () => {
    const game = setupP2();

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'waiting',
      cell: pos(2, 5),
      direction: 'north',
    });

    expect(game.prediction('red')?.path).toEqual([
      pos(0, 1),
      pos(1, 1),
      pos(2, 1),
    ]);
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'noExit',
      cell: pos(2, 1),
    });
    expect(game.prediction('blue')?.path).toEqual([
      pos(2, 5),
      pos(3, 5),
    ]);
    expect(game.prediction('blue')?.stop).toEqual({
      kind: 'water',
      cell: pos(3, 5),
    });
  });

  it('a solução de 10 passos entrega 2/2, com 3 moedas e 3 vidas', () => {
    const game = setupP2();
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = game.apply(action);

      allEvents.push(...result.events);
      expect(result.advanced).toBe(true);
      expect(game.state.step).toBe(index + 1);
    }

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([
      pos(1, 1),
      pos(1, 4),
      pos(3, 2),
    ]);
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);

    // A moeda da ponte é uma só: o vermelho coleta no 5; o azul passa no 7.
    const coinEvents = allEvents.filter(
      (event) => event.kind === 'coinCollected',
    );

    expect(coinEvents).toHaveLength(3);
    expect(
      coinEvents.filter(
        (event) =>
          event.kind === 'coinCollected' &&
          event.cell.col === 3 &&
          event.cell.row === 2,
      ),
    ).toEqual([
      {
        kind: 'coinCollected',
        trainId: 'red',
        cell: pos(3, 2),
      },
    ]);
  });

  it('posições, moedas e a janela do split passo a passo', () => {
    const game = setupP2();
    const expected = [
      [
        { kind: 'running', cell: pos(0, 1), incoming: 'east' },
        { kind: 'running', cell: pos(2, 5), incoming: 'north' },
        [],
      ],
      [
        { kind: 'running', cell: pos(1, 1), incoming: 'east' },
        { kind: 'running', cell: pos(1, 5), incoming: 'west' },
        [pos(1, 1)],
      ],
      [
        { kind: 'running', cell: pos(2, 1), incoming: 'east' },
        { kind: 'running', cell: pos(1, 4), incoming: 'north' },
        [pos(1, 1), pos(1, 4)],
      ],
      [
        { kind: 'running', cell: pos(2, 2), incoming: 'south' },
        { kind: 'running', cell: pos(1, 3), incoming: 'north' },
        [pos(1, 1), pos(1, 4)],
      ],
      [
        { kind: 'running', cell: pos(3, 2), incoming: 'east' },
        { kind: 'running', cell: pos(2, 3), incoming: 'east' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
      [
        { kind: 'running', cell: pos(4, 2), incoming: 'east' },
        { kind: 'running', cell: pos(2, 2), incoming: 'north' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
      [
        { kind: 'running', cell: pos(5, 2), incoming: 'east' },
        { kind: 'running', cell: pos(3, 2), incoming: 'east' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
      [
        { kind: 'delivered' },
        { kind: 'running', cell: pos(4, 2), incoming: 'east' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
      [
        { kind: 'delivered' },
        { kind: 'running', cell: pos(5, 2), incoming: 'east' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
      [
        { kind: 'delivered' },
        { kind: 'delivered' },
        [pos(1, 1), pos(1, 4), pos(3, 2)],
      ],
    ] as const;

    for (const [index, action] of SOLUTION.entries()) {
      game.apply(action);

      const [red, blue, coins] = expected[index]!;

      expect(trainInState(game.state, 'red').status).toEqual(red);
      expect(trainInState(game.state, 'blue').status).toEqual(blue);
      expect(game.state.coinsCollected).toEqual(coins);
    }

    // O split só fica livre no passo 9: o vermelho já entregou, o azul está
    // em (4,2) e o toque pode trocar o braço norte→sul.
    expect(cellAt(game.state.board, pos(5, 2))).toEqual({
      kind: 'piece',
      piece: { kind: 'y', rot: 3, arm: 1, next: 'rotate' },
    });
  });
});

describe('P2 «Obstáculos» — rotas de falha', () => {
  it('sem o toggle da entrada, o azul afunda em (3,5)', () => {
    const game = setupP2();

    game.apply(PASS);
    const result = game.apply(PASS);

    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'water',
    });
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('playing');
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(3, 5),
        direction: 'east',
        reason: 'water',
      },
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 2, remaining: 2 },
    ]);
  });

  it('sem o giro de (2,3), o azul desce e afunda em (3,4)', () => {
    const game = setupP2();

    for (const action of SOLUTION.slice(0, 4)) {
      game.apply(action);
    }

    game.apply(PASS); // passo 5: azul entra em (2,3) ainda rot 2
    game.apply(PASS); // passo 6: azul desce para (2,4)
    const result = game.apply(PASS); // passo 7: rampa para a água

    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'water',
    });
    expect(game.state.lives).toBe(2);
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(3, 4),
        direction: 'east',
        reason: 'water',
      },
    ]);
  });

  it('com dois giros em (2,1), o vermelho sobe e afunda em (3,0)', () => {
    const game = setupP2();

    game.apply({ kind: 'tap', cell: pos(2, 5) }); // entrada azul
    game.apply({ kind: 'tap', cell: pos(2, 1) }); // rot 1→2
    game.apply({ kind: 'tap', cell: pos(2, 1) }); // rot 2→3
    game.apply({ kind: 'tap', cell: pos(1, 3) }); // mantém o azul vivo
    const result = game.apply(PASS); // vermelho sobe para (2,0)

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'water',
    });
    expect(game.state.lives).toBe(2);
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'red',
        at: pos(3, 0),
        direction: 'east',
        reason: 'water',
      },
    ]);
  });

  it('sem o toggle do split, o azul morre em @ e vence 1/2', () => {
    const game = setupP2();

    for (const action of SOLUTION.slice(0, 8)) {
      game.apply(action);
    }

    game.apply(PASS); // passo 9 sem toggle
    const result = game.apply(PASS); // passo 10: split norte → @ (5,1)

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('won');
    expect(derailsOf(result.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(5, 1),
        direction: 'north',
        reason: 'wrongStation',
      },
    ]);
    expect(eventKinds(result.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'victory',
    ]);
  });
});
