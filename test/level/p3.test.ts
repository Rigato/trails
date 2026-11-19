import { describe, expect, it } from 'vitest';
import type { Action, GameEvent } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { resolveStep } from '../../src/core/step';
import { P3_DRAFT } from '../../src/level/p3';
import {
  collisionsOf,
  crossing,
  derailsOf,
  eventKinds,
  gameState,
  lifeLossesOf,
  mountain,
  pos,
  runningTrain,
  trainInState,
  tunnel,
} from '../core/helpers';

/** Solução documentada no cabeçalho de `src/level/p3.ts` (8 passos). */
const SOLUTION: readonly Action[] = [
  { kind: 'tap', cell: pos(5, 4) },
  { kind: 'tap', cell: pos(4, 2) },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
];

const PASS: Action = { kind: 'pass' };

function setupP3() {
  return setup(P3_DRAFT);
}

describe('P3 «Densidade» — contrato do dado', () => {
  it('6×6, 3 pares e 3 estações; verde/triângulo declarado no nível', () => {
    const board6 = P3_DRAFT.board;
    const red = P3_DRAFT.trains.find((train) => train.id === 'red');
    const blue = P3_DRAFT.trains.find((train) => train.id === 'blue');
    const green = P3_DRAFT.trains.find((train) => train.id === 'green');

    expect(board6.width).toBe(6);
    expect(board6.height).toBe(6);
    expect(P3_DRAFT.lives).toBe(3);
    expect(P3_DRAFT.trains).toHaveLength(3);
    expect(red?.shape).toBe('circle');
    expect(blue?.shape).toBe('square');
    expect(green?.shape).toBe('triangle');
    expect(green?.color).toBe('#3f8f5f');
    expect(new Set(P3_DRAFT.trains.map((train) => train.color)).size).toBe(3);

    const redStation = cellAt(board6, pos(4, 1));
    const blueStation = cellAt(board6, pos(2, 5));
    const greenStation = cellAt(board6, pos(5, 3));

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
    expect(greenStation).toEqual({
      kind: 'fixed',
      fixed: {
        kind: 'station',
        color: green?.color,
        shape: green?.shape,
      },
    });
  });

  it('túnel simétrico, cruzamento, montanha e moedas sobre peça', () => {
    const board6 = P3_DRAFT.board;
    const tunnels = [];

    for (let row = 0; row < board6.height; row += 1) {
      for (let col = 0; col < board6.width; col += 1) {
        const cell = cellAt(board6, pos(col, row));

        if (cell?.kind === 'fixed' && cell.fixed.kind === 'tunnel') {
          tunnels.push({ cell: pos(col, row), exit: cell.fixed.exit });
        }
      }
    }

    expect(tunnels).toEqual([
      { cell: pos(1, 4), exit: pos(4, 4) },
      { cell: pos(4, 4), exit: pos(1, 4) },
    ]);
    expect(cellAt(board6, pos(1, 4))).toEqual(tunnel(pos(4, 4)));
    expect(cellAt(board6, pos(4, 4))).toEqual(tunnel(pos(1, 4)));
    expect(cellAt(board6, pos(2, 2))).toEqual(crossing());
    expect(cellAt(board6, pos(4, 3))).toEqual(mountain());

    expect(P3_DRAFT.coins).toEqual([pos(1, 2), pos(2, 2)]);

    for (const coin of P3_DRAFT.coins ?? []) {
      expect(cellAt(board6, coin)?.kind).toBe('piece');
    }
  });

  it('entradas off-board, células de trilho e 3 trens partem no passo 1', () => {
    const red = P3_DRAFT.trains.find((train) => train.id === 'red');
    const blue = P3_DRAFT.trains.find((train) => train.id === 'blue');
    const green = P3_DRAFT.trains.find((train) => train.id === 'green');

    expect(red?.entry).toEqual({
      cell: pos(0, 0),
      direction: 'east',
    });
    expect(blue?.entry).toEqual({
      cell: pos(2, 0),
      direction: 'south',
    });
    expect(green?.entry).toEqual({
      cell: pos(0, 4),
      direction: 'east',
    });

    for (const entry of [red?.entry, blue?.entry, green?.entry]) {
      expect(entry).toBeDefined();
      expect(cellAt(P3_DRAFT.board, entry!.cell)?.kind).toBe('piece');
    }

    const game = setupP3();

    game.apply(SOLUTION[0]!); // toggle do Y verde; os 3 entram juntos

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 0),
      incoming: 'south',
    });
    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'running',
      cell: pos(0, 4),
      incoming: 'east',
    });
  });
});

describe('P3 «Densidade» — solução documentada', () => {
  it('8 passos entregam 3/3, com 2 moedas e 3 vidas, sem colisão', () => {
    const game = setupP3();
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = game.apply(action);

      allEvents.push(...result.events);
      expect(result.advanced).toBe(true);
      expect(game.state.step).toBe(index + 1);
    }

    expect(trainInState(game.state, 'red').status).toEqual({ kind: 'delivered' });
    expect(trainInState(game.state, 'blue').status).toEqual({ kind: 'delivered' });
    expect(trainInState(game.state, 'green').status).toEqual({ kind: 'delivered' });
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([pos(2, 2), pos(1, 2)]);
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('posições, moedas e a travessia do túnel passo a passo', () => {
    const game = setupP3();
    const expected = [
      [
        { kind: 'running', cell: pos(0, 0), incoming: 'east' },
        { kind: 'running', cell: pos(2, 0), incoming: 'south' },
        { kind: 'running', cell: pos(0, 4), incoming: 'east' },
        [],
      ],
      [
        { kind: 'running', cell: pos(1, 0), incoming: 'east' },
        { kind: 'running', cell: pos(2, 1), incoming: 'south' },
        { kind: 'running', cell: pos(1, 4), incoming: 'east' },
        [],
      ],
      [
        { kind: 'running', cell: pos(1, 1), incoming: 'south' },
        { kind: 'running', cell: pos(2, 2), incoming: 'south' },
        {
          kind: 'running',
          cell: pos(4, 4),
          incoming: 'east',
          justTunneled: true,
        },
        [pos(2, 2)],
      ],
      [
        { kind: 'running', cell: pos(1, 2), incoming: 'south' },
        { kind: 'running', cell: pos(2, 3), incoming: 'south' },
        { kind: 'running', cell: pos(5, 4), incoming: 'east' },
        [pos(2, 2), pos(1, 2)],
      ],
      [
        { kind: 'running', cell: pos(2, 2), incoming: 'east' },
        { kind: 'running', cell: pos(2, 4), incoming: 'south' },
        { kind: 'delivered' },
        [pos(2, 2), pos(1, 2)],
      ],
      [
        { kind: 'running', cell: pos(3, 2), incoming: 'east' },
        { kind: 'delivered' },
        { kind: 'delivered' },
        [pos(2, 2), pos(1, 2)],
      ],
      [
        { kind: 'running', cell: pos(4, 2), incoming: 'east' },
        { kind: 'delivered' },
        { kind: 'delivered' },
        [pos(2, 2), pos(1, 2)],
      ],
      [
        { kind: 'delivered' },
        { kind: 'delivered' },
        { kind: 'delivered' },
        [pos(2, 2), pos(1, 2)],
      ],
    ] as const;

    for (const [index, action] of SOLUTION.entries()) {
      game.apply(action);

      const [red, blue, green, coins] = expected[index]!;

      expect(trainInState(game.state, 'red').status).toEqual(red);
      expect(trainInState(game.state, 'blue').status).toEqual(blue);
      expect(trainInState(game.state, 'green').status).toEqual(green);
      expect(game.state.coinsCollected).toEqual(coins);
    }
  });
});

describe('P3 «Densidade» — rotas de falha documentadas', () => {
  it('Y vermelho sem toggle: red morre na montanha no passo 8', () => {
    const game = setupP3();

    game.apply({ kind: 'tap', cell: pos(5, 4) }); // salva o verde
    for (let step = 0; step < 7; step += 1) {
      game.apply(PASS);
    }

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'mountain',
    });
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'blue').status).toEqual({ kind: 'delivered' });
    expect(trainInState(game.state, 'green').status).toEqual({ kind: 'delivered' });
  });

  it('Y verde esquecido: green descarrila em (5,5) com noExit', () => {
    const game = setupP3();

    game.apply({ kind: 'tap', cell: pos(4, 2) }); // salva o vermelho
    for (let step = 0; step < 7; step += 1) {
      game.apply(PASS);
    }

    expect(trainInState(game.state, 'green').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(game.state.lives).toBe(2);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'red').status).toEqual({ kind: 'delivered' });
    expect(trainInState(game.state, 'blue').status).toEqual({ kind: 'delivered' });
  });

  it('receita do cabeçalho: cruzamento simultâneo no P3 colide', () => {
    const red = P3_DRAFT.trains.find((train) => train.id === 'red');
    const blue = P3_DRAFT.trains.find((train) => train.id === 'blue');
    const result = resolveStep(
      gameState(
        P3_DRAFT.board,
        [
          runningTrain(
            'red',
            red!.color,
            red!.shape,
            pos(1, 2),
            'south',
          ),
          runningTrain(
            'blue',
            blue!.color,
            blue!.shape,
            pos(2, 1),
            'south',
          ),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([pos(2, 2)]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
  });

  it('receita do cabeçalho: swap do túnel do P3 colide', () => {
    const red = P3_DRAFT.trains.find((train) => train.id === 'red');
    const blue = P3_DRAFT.trains.find((train) => train.id === 'blue');
    const result = resolveStep(
      gameState(
        P3_DRAFT.board,
        [
          runningTrain(
            'red',
            red!.color,
            red!.shape,
            pos(1, 4),
            'east',
          ),
          runningTrain(
            'blue',
            blue!.color,
            blue!.shape,
            pos(4, 4),
            'west',
          ),
        ],
        0,
        'playing',
        3,
      ),
    );

    expect(collisionsOf(result.events)).toHaveLength(1);
    expect(collisionsOf(result.events)[0]?.cells).toEqual([
      pos(4, 4),
      pos(1, 4),
    ]);
    expect(derailsOf(result.events).map((event) => event.reason)).toEqual([
      'collision',
      'collision',
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 1, remaining: 2 },
    ]);
  });
});
