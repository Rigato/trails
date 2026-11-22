/**
 * Resgate de trem (M4/D28) — testes do core.
 *
 * O resgate NÃO é ação: em `deadEnd`, o trem derailed volta `waiting` ao
 * `TrainSetup.entry` original e a run retoma em `playing`, sem devolver a vida
 * e sem gastar passo. A re-entrada é a da partida (D13): o próximo passo pisa
 * na primeira célula e o seguinte resolve a peça; colisão e célula ocupada
 * seguem a regra geral, sem exceção nova.
 *
 * O tabuleiro de teste é um corredor de 4×3: o vermelho tem estação em (3,1)
 * e o azul morre no próprio passo de resolução. Um toque gira a entrada do
 * vermelho para N–S antes de ele pisar; o azul já nasce com a entrada N–S.
 * Os dois descarrilam no passo 2 (dois eventos independentes, 2 vidas) e
 * produzem o deadEnd com 1 vida restante.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, LevelLayout } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { resolveStep } from '../../src/core/step';
import { P0_LEVEL } from '../../src/level/p0';
import { P1_LEVEL } from '../../src/level/p1';
import { P2_LEVEL } from '../../src/level/p2';
import { P3_LEVEL } from '../../src/level/p3';
import { P3_OVERLOAD } from '../../src/level/p3-overload';
import {
  BLUE,
  EMPTY,
  RED,
  board,
  collisionsOf,
  lifeLossesOf,
  makeLevel,
  pos,
  station,
  straight,
  trainInState,
} from './helpers';

const PASS: Action = { kind: 'pass' };
const TAP_RED_ENTRY: Action = { kind: 'tap', cell: pos(0, 1) };

/** Corredor: vermelho entrega em (3,1); azul cai no vazio de (1,2). */
function corridor(lives: number): LevelLayout {
  const base = makeLevel(
    'rescue-corridor',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY],
      [straight(1), straight(1), straight(1), station(RED, 'circle')],
      [straight(0), EMPTY, EMPTY, EMPTY],
    ]),
    [
      {
        id: 'red',
        color: RED,
        shape: 'circle',
        entry: { cell: pos(0, 1), direction: 'east' },
      },
      {
        id: 'blue',
        color: BLUE,
        shape: 'square',
        entry: { cell: pos(0, 2), direction: 'east' },
      },
    ],
    lives,
  );

  return { ...base, coins: [pos(1, 1)] };
}

/** Roda ações em sequência; devolve o jogo para o próximo trecho. */
function play(game: Game, actions: readonly Action[]): void {
  for (const action of actions) {
    game.apply(action);
  }
}

/**
 * Leva o corredor ao deadEnd do passo 2.
 *
 * O toque gira a entrada do vermelho para N–S antes de ele pisar (step 1); o
 * azul já nasce com a entrada N–S e morre no próprio passo de resolução. Os
 * dois derrails são eventos independentes → 2 vidas.
 */
function toDeadEnd(game: Game): void {
  play(game, [TAP_RED_ENTRY, PASS]);
}

describe('rescue — dado do tutorial (D23)', () => {
  it('P0–P3 são tutorial; a sonda P3+ não é', () => {
    expect(P0_LEVEL.tutorial).toBe(true);
    expect(P1_LEVEL.tutorial).toBe(true);
    expect(P2_LEVEL.tutorial).toBe(true);
    expect(P3_LEVEL.tutorial).toBe(true);
    expect(P3_OVERLOAD.tutorial).toBeUndefined();
  });
});

describe('rescue — resgate feliz (D28)', () => {
  it('deadEnd + trem derailed: volta waiting na entrada, status playing, sem passo/vida', () => {
    const game = setup(corridor(3));

    toDeadEnd(game);

    const before = game.state;

    expect(before.status).toBe('deadEnd');
    expect(before.step).toBe(2);
    expect(before.lives).toBe(1);
    expect(before.coinsCollected).toEqual([]);
    expect(trainInState(before, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(before, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });

    const rescued = game.rescue('red');

    expect(rescued).toBeDefined();
    expect(rescued).toEqual(game.state);
    expect(rescued?.status).toBe('playing');
    expect(rescued?.step).toBe(2);
    expect(rescued?.lives).toBe(1);
    expect(rescued?.coinsCollected).toEqual([]);
    expect(trainInState(rescued!, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(trainInState(rescued!, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });

  it('o resgatado entra no PRÓXIMO passo e ainda entrega (vitória dinâmica)', () => {
    const game = setup(corridor(3));

    toDeadEnd(game);
    game.rescue('red');

    // A compra não gastou passo: ainda estamos no 2.
    expect(game.state.step).toBe(2);

    // Passo 3: o toque conserta a entrada (o trem waiting não ocupa a célula)
    // e o resgatado pisa nela sem resolver a peça (D13).
    game.apply({ kind: 'tap', cell: pos(0, 1) });
    expect(game.state.step).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });

    // Passos 4–6: o corredor limpo resolve a entrada, coleta a moeda e entrega.
    play(game, [PASS, PASS, PASS]);

    expect(game.state.status).toBe('won');
    expect(game.state.step).toBe(6);
    expect(game.state.lives).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(game.state.coinsCollected).toEqual([pos(1, 1)]);
  });

  it('resgate já usado não muda o estado em playing (o shell limita a 1/run)', () => {
    const game = setup(corridor(3));

    toDeadEnd(game);
    game.rescue('red');

    const after = game.state;

    expect(game.rescue('red')).toBeUndefined();
    expect(game.rescue('blue')).toBeUndefined();
    expect(game.state).toEqual(after);
  });
});

describe('rescue — recusas por status (D28/D11)', () => {
  it('ready: recusa', () => {
    const game = setup(corridor(3));

    expect(game.state.status).toBe('ready');
    expect(game.rescue('red')).toBeUndefined();
    expect(game.state.status).toBe('ready');
    expect(game.state.step).toBe(0);
  });

  it('playing: recusa — inclusive um trem derailed de outro evento', () => {
    const game = setup(corridor(3));

    game.apply(PASS);
    expect(game.state.status).toBe('playing');
    expect(game.rescue('red')).toBeUndefined();
    expect(game.state.status).toBe('playing');

    // Após o resgate do vermelho, o azul continua derailed, mas a run já está
    // em playing: o status manda.
    const other = setup(corridor(3));

    toDeadEnd(other);
    other.rescue('red');
    expect(other.state.status).toBe('playing');
    expect(other.rescue('blue')).toBeUndefined();
  });

  it('won: recusa', () => {
    const level = makeLevel(
      'rescue-won',
      board([[straight(1), straight(1), station(RED, 'circle')]]),
      [
        {
          id: 'red',
          color: RED,
          shape: 'circle',
          entry: { cell: pos(0, 0), direction: 'east' },
        },
      ],
    );
    const game = setup(level);

    play(game, [PASS, PASS, PASS]);
    expect(game.state.status).toBe('won');

    expect(game.rescue('red')).toBeUndefined();
    expect(game.state.status).toBe('won');
  });

  it('lost: recusa — a vida não volta', () => {
    const game = setup(corridor(1));

    toDeadEnd(game);

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
    expect(game.rescue('red')).toBeUndefined();
    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);
  });

  it('trem desconhecido: recusa sem efeito', () => {
    const game = setup(corridor(3));

    toDeadEnd(game);

    expect(game.rescue('ghost')).toBeUndefined();
    expect(game.state.status).toBe('deadEnd');
  });
});

describe('rescue — re-entrada pela regra geral', () => {
  it('entrada ocupada por outro trem no mesmo passo = colisão (1 vida, ambos)', () => {
    const game = setup(corridor(4));

    toDeadEnd(game);
    expect(game.state.lives).toBe(2);

    const rescued = game.rescue('red');
    expect(rescued).toBeDefined();

    // `deadEnd` não tem trem ativo, então a "célula ocupada" é encenada um
    // passo depois: o azul volta a correr em (1,1) indo para oeste, no mesmo
    // passo em que o resgatado entra em (0,1). O `resolveStep` não tem exceção
    // para trem resgatado — os dois dividem o destino.
    const state = {
      ...rescued!,
      trains: rescued!.trains.map((train) =>
        train.id === 'blue'
          ? {
              ...train,
              status: {
                kind: 'running' as const,
                cell: pos(1, 1),
                incoming: 'west' as const,
              },
            }
          : train,
      ),
    };

    const result = resolveStep(state);

    expect(collisionsOf(result.events)).toEqual([
      { kind: 'collision', trainIds: ['red', 'blue'], cells: [pos(0, 1)] },
    ]);
    expect(lifeLossesOf(result.events)).toEqual([
      { kind: 'lifeLost', step: 3, remaining: 1 },
    ]);
    expect(trainInState(result.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
    expect(trainInState(result.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'collision',
    });
    expect(result.state.status).toBe('deadEnd');
    expect(result.state.lives).toBe(1);
  });
});
