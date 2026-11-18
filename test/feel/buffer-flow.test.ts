import { describe, expect, it } from 'vitest';
import type { Action } from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { ActionBuffer } from '../../src/core/buffer';
import { setup } from '../../src/core/game';
import {
  board,
  EMPTY,
  entry,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainSetup,
} from '../core/helpers';

/**
 * Corredor sintético do teste de feel — independente do layout do P0 (que o
 * E4 revisa). O trem anda na linha 0; as peças decorativas da linha 1 estão
 * sempre livres e servem de alvo para a rajada sem mexer na rota.
 *
 *   0: >  |  |  @
 *   1: |  |  |  .
 */
function corridor() {
  return makeLevel(
    'feel-corridor',
    board([
      [entry('east'), straight(1), straight(1), station(RED)],
      [straight(0), straight(0), straight(0), EMPTY],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 0))],
  );
}

/** Toque na célula (col, row). */
function tap(col: number, row: number): Action {
  return { kind: 'tap', cell: { col, row } };
}

const TRAIN = 'red';

/**
 * Simula o contrato do loop de `main.ts` sem DOM: uma ação aplicada abre UM
 * passo visual; ações que chegam durante a animação ficam no buffer e drenam
 * uma por passo, na ordem. A duração de cada passo é do render; aqui
 * verificamos que nada se perde nem se adianta.
 */
describe('rajada durante a animação — 3 ações, 3 passos, na ordem', () => {
  it('drena uma ação por passo e o trem avança exatamente 1 célula por ação', () => {
    const game = setup(corridor());
    const buffer = new ActionBuffer(12);

    // 1ª ação (a animação começa): gira a peça decorativa e o trem entra.
    const first = game.apply(tap(1, 1));
    expect(first.advanced).toBe(true);
    expect(game.state.step).toBe(1);
    expect(game.state.trains[0]?.status).toMatchObject({
      kind: 'running',
      cell: { col: 0, row: 0 },
    });

    // 2ª e 3ª chegam durante a animação: enfileiradas, não descartadas.
    expect(buffer.enqueue(tap(2, 1))).toBe(true);
    expect(buffer.enqueue(tap(1, 1))).toBe(true);
    expect(buffer.size).toBe(2);

    // Fim do passo 1: drena a 2ª; o trem anda para (1,0).
    const second = buffer.drainNext((action) => game.apply(action));
    expect(second?.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.trains[0]?.status).toMatchObject({
      kind: 'running',
      cell: { col: 1, row: 0 },
      incoming: 'east',
    });

    // A previsão recalcula a partir da célula nova — sem passo fantasma.
    const prediction = game.prediction(TRAIN, 24);
    expect(prediction?.path[0]).toEqual({ col: 1, row: 0 });
    expect(prediction?.stop).toEqual({
      kind: 'station',
      cell: { col: 3, row: 0 },
      correct: true,
    });

    // Fim do passo 2: drena a 3ª; o trem anda exatamente mais uma célula.
    const third = buffer.drainNext((action) => game.apply(action));
    expect(third?.advanced).toBe(true);
    expect(game.state.step).toBe(3);
    expect(game.state.trains[0]?.status).toMatchObject({
      kind: 'running',
      cell: { col: 2, row: 0 },
      incoming: 'east',
    });
    expect(buffer.isEmpty).toBe(true);

    // A ordem foi preservada: (1,1) girou duas vezes, (2,1) uma.
    expect(cellAt(game.state.board, pos(1, 1))).toMatchObject({
      kind: 'piece',
      piece: { kind: 'straight', rot: 2 },
    });
    expect(cellAt(game.state.board, pos(2, 1))).toMatchObject({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
  });

  it('toque na célula onde o trem chegou no passo anterior não avança (D4)', () => {
    const game = setup(corridor());
    const buffer = new ActionBuffer(12);

    game.apply(tap(1, 1)); // passo 1: trem entra em (0,0)
    buffer.enqueue({ kind: 'pass' }); // passo 2: trem chega em (1,0)
    buffer.enqueue(tap(1, 0)); // dreno: célula ocupada pelo trem

    const second = buffer.drainNext((action) => game.apply(action));
    expect(second?.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.trains[0]?.status).toMatchObject({
      kind: 'running',
      cell: { col: 1, row: 0 },
    });

    const third = buffer.drainNext((action) => game.apply(action));
    expect(third?.advanced).toBe(false);
    expect(third?.outcome).toMatchObject({ kind: 'blocked', reason: 'train' });
    expect(game.state.step).toBe(2);
    // A peça que o trem ocupa não gira: a ação inválida foi descartada.
    expect(cellAt(game.state.board, pos(1, 0))).toMatchObject({
      kind: 'piece',
      piece: { kind: 'straight', rot: 1 },
    });
  });
});
