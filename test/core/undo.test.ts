/**
 * Time-travel (M5/D29) — testes do core.
 *
 * O `GameState` é um snapshot imutável completo; o `Game` guarda a pilha da
 * run e `undoStep()` troca a referência de volta. Os testes cobrem o que o
 * risco técnico nomeado exige: reversão INTEGRAL de um passo composto (giro +
 * movimento + coleta + descarrilamento + vida), undo encadeado, recusas,
 * `deadEnd`, `justTunneled`, o resgate do M4 fora do histórico e a limpeza do
 * histórico no `reset`.
 *
 * A carteira e `consumableUsed` são do shell (não existem no core); aqui se
 * verifica que o estado restaurado é exatamente o anterior — inclusive vidas e
 * moedas, que o resgate NÃO devolve e o undo restaura apenas até o ponto em que
 * elas existiam.
 */

import { describe, expect, it } from 'vitest';
import type { Action, Game, LevelLayout } from '../../src/core/types';
import { setup } from '../../src/core/game';
import {
  BLUE,
  EMPTY,
  RED,
  board,
  curve,
  makeLevel,
  pos,
  station,
  straight,
  trainInState,
  trainSetup,
  tunnel,
} from './helpers';

const PASS: Action = { kind: 'pass' };

/** Roda ações em sequência; devolve o jogo para o próximo trecho. */
function play(game: Game, actions: readonly Action[]): void {
  for (const action of actions) {
    game.apply(action);
  }
}

/**
 * Corredor de uma linha: entrada a oeste e estação vermelha no fim.
 *
 * Passos: 1 entra em (0,0); 2 → (1,0); 3 → (2,0); 4 entrega em (3,0).
 */
function corridor(): LevelLayout {
  return makeLevel(
    'undo-corridor',
    board([
      [straight(1), straight(1), straight(1), station(RED, 'circle')],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 0))],
  );
}

/**
 * Passo composto: no mesmo passo, o toque gira (1,0), o vermelho anda para lá,
 * coleta a moeda, descarrila (`noExit`, a curva girada perdeu o lado oeste) e
 * perde uma vida; o azul anda em segurança. O passo seguinte continua `playing`
 * (o azul está ativo), então o undo é uma reversão normal, não um deadEnd.
 */
function composite(lives = 3): LevelLayout {
  const base = makeLevel(
    'undo-composite',
    board([
      [straight(1), curve(3), EMPTY],
      [straight(1), straight(1), straight(1)],
    ]),
    [
      trainSetup('red', RED, 'circle', pos(0, 0)),
      trainSetup('blue', BLUE, 'square', pos(0, 1)),
    ],
    lives,
  );

  return { ...base, coins: [pos(1, 0)] };
}

/** Um trem que morre no passo 2, com moeda na célula fatal: deadEnd. */
function fatalSingle(lives = 3): LevelLayout {
  const base = makeLevel(
    'undo-fatal',
    board([[straight(1), curve(0)]]),
    [trainSetup('red', RED, 'circle', pos(0, 0))],
    lives,
  );

  return { ...base, coins: [pos(1, 0)] };
}

/**
 * Corredor do resgate do M4: o vermelho tem estação; o azul morre no vazio.
 * O toque gira a entrada do vermelho para N–S; os dois descarrilam no passo 2.
 */
function rescueCorridor(lives = 3): LevelLayout {
  const base = makeLevel(
    'undo-rescue',
    board([
      [EMPTY, EMPTY, EMPTY, EMPTY],
      [straight(1), straight(1), straight(1), station(RED, 'circle')],
      [straight(0), EMPTY, EMPTY, EMPTY],
    ]),
    [
      trainSetup('red', RED, 'circle', pos(0, 1)),
      trainSetup('blue', BLUE, 'square', pos(0, 2)),
    ],
    lives,
  );

  return { ...base, coins: [pos(1, 1)] };
}

/** Trilho com um par de túneis: o trem atravessa A→B no passo 3. */
function tunnelRun(): LevelLayout {
  return makeLevel(
    'undo-tunnel',
    board([
      [
        straight(1),
        tunnel(pos(3, 0)),
        EMPTY,
        tunnel(pos(1, 0)),
      ],
    ]),
    [trainSetup('red', RED, 'circle', pos(0, 0))],
  );
}

describe('undo — reversão integral (D29)', () => {
  it('um giro + undo restaura a peça, o passo e o status ready', () => {
    const game = setup(corridor());
    const initial = game.state;

    const result = game.apply({ kind: 'tap', cell: pos(0, 0) });

    expect(result.advanced).toBe(true);
    expect(game.state.step).toBe(1);

    const restored = game.undoStep();

    expect(restored).toBe(initial);
    expect(game.state).toBe(initial);
    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(game.state.board).toBe(initial.board);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 0),
      direction: 'east',
    });
  });

  it('passo composto: giro, movimento, moeda, descarrilamento e vida voltam exatos', () => {
    const game = setup(composite(3));

    // Passo 1: os dois entram na grade.
    game.apply(PASS);

    const before = game.state;

    expect(before.step).toBe(1);
    expect(before.lives).toBe(3);
    expect(before.coinsCollected).toEqual([]);

    // Passo 2: toque na curva + movimento + coleta + morte no MESMO passo.
    const result = game.apply({ kind: 'tap', cell: pos(1, 0) });

    expect(result.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toEqual([pos(1, 0)]);
    expect(game.state.status).toBe('playing');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(1, 1),
      incoming: 'east',
    });

    const restored = game.undoStep();

    expect(restored).toBe(before);
    expect(game.state).toBe(before);
    expect(game.state.step).toBe(1);
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);
    expect(game.state.status).toBe('playing');

    // A peça voltou ao giro anterior (curva 3 = oeste–norte)…
    const rotatedBack = game.state.board.rows[0]?.[1];

    expect(rotatedBack).toEqual({
      kind: 'piece',
      piece: { kind: 'curve', rot: 3 },
    });

    // …e os dois trens voltaram ao estado do passo 1.
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
  });

  it('entrega desfeita: o trem entregue volta a correr e o status volta a playing', () => {
    const game = setup(
      makeLevel(
        'undo-delivery',
        board([
          [straight(1), station(RED, 'circle'), EMPTY],
          [straight(1), straight(1), straight(1)],
        ]),
        [
          trainSetup('red', RED, 'circle', pos(0, 0)),
          trainSetup('blue', BLUE, 'square', pos(0, 1)),
        ],
      ),
    );

    game.apply(PASS);
    const beforeDelivery = game.state;

    // O vermelho entrega no passo 2; o azul continua ativo (a run não termina).
    game.apply(PASS);

    expect(game.state.status).toBe('playing');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });

    const restored = game.undoStep();

    expect(restored).toBe(beforeDelivery);
    expect(game.state.status).toBe('playing');
    expect(game.state.step).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'east',
    });
  });

  it('undo encadeado: N passos voltam um a um, inclusive justTunneled', () => {
    const game = setup(tunnelRun());
    const states = [game.state];

    // 1: entra em (0,0); 2: no portal (1,0); 3: atravessa para (3,0).
    for (let step = 1; step <= 3; step += 1) {
      game.apply(PASS);
      states.push(game.state);
      expect(game.state.step).toBe(step);
    }

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(3, 0),
      incoming: 'east',
      justTunneled: true,
    });

    // O snapshot do passo 2 (portal, sem justTunneled) está na pilha.
    expect(trainInState(states[2]!, 'red').status).toEqual({
      kind: 'running',
      cell: pos(1, 0),
      incoming: 'east',
    });

    for (let step = 3; step >= 1; step -= 1) {
      const restored = game.undoStep();

      expect(restored).toBe(states[step - 1]);
      expect(game.state).toBe(states[step - 1]);
      expect(game.state.step).toBe(step - 1);
    }

    expect(game.undoStep()).toBeUndefined();
    expect(game.state).toBe(states[0]);
  });

  it('aplicação pós-undo funciona e volta a empilhar histórico', () => {
    const game = setup(composite(3));

    play(game, [PASS]);
    game.apply({ kind: 'tap', cell: pos(1, 0) });
    expect(game.state.step).toBe(2);

    const restored = game.undoStep();

    expect(restored?.step).toBe(1);

    // Nova ação a partir do estado restaurado: avança e empilha de novo.
    const result = game.apply(PASS);

    expect(result.advanced).toBe(true);
    expect(game.state.step).toBe(2);

    const undoneAgain = game.undoStep();

    expect(undoneAgain).toBe(restored);
    expect(game.state.step).toBe(1);
  });
});

describe('undo — recusas (D29)', () => {
  it('passo 0 recusa sem efeito', () => {
    const game = setup(corridor());
    const initial = game.state;

    expect(game.undoStep()).toBeUndefined();
    expect(game.state).toBe(initial);
    expect(game.state.step).toBe(0);
  });

  it('won recusa sem efeito', () => {
    const game = setup(corridor());

    play(game, [PASS, PASS, PASS, PASS]);
    expect(game.state.status).toBe('won');

    const won = game.state;

    expect(game.undoStep()).toBeUndefined();
    expect(game.state).toBe(won);
    expect(game.state.step).toBe(4);
  });

  it('lost recusa sem efeito', () => {
    const game = setup(composite(1));

    play(game, [PASS]);
    game.apply({ kind: 'tap', cell: pos(1, 0) });

    expect(game.state.status).toBe('lost');
    expect(game.state.lives).toBe(0);

    const lost = game.state;

    expect(game.undoStep()).toBeUndefined();
    expect(game.state).toBe(lost);
    expect(game.state.step).toBe(2);
  });
});

describe('undo — deadEnd e resgate (D29/D28)', () => {
  it('deadEnd permite e revive o passo fatal (trem, vida e moeda voltam)', () => {
    const game = setup(fatalSingle(3));

    game.apply(PASS);
    const beforeFatal = game.state;

    game.apply(PASS);

    expect(game.state.status).toBe('deadEnd');
    expect(game.state.step).toBe(2);
    expect(game.state.lives).toBe(2);
    expect(game.state.coinsCollected).toEqual([pos(1, 0)]);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });

    const restored = game.undoStep();

    expect(restored).toBe(beforeFatal);
    expect(game.state.status).toBe('playing');
    expect(game.state.step).toBe(1);
    expect(game.state.lives).toBe(3);
    expect(game.state.coinsCollected).toEqual([]);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'east',
    });
  });

  it('após resgate + passo, undo volta ao snapshot pós-resgate (sem reembolso)', () => {
    const game = setup(rescueCorridor(3));

    // Passo 1: toque gira a entrada vermelha; os dois entram.
    // Passo 2: os dois descarrilam, 1 vida restante, deadEnd.
    play(game, [{ kind: 'tap', cell: pos(0, 1) }, PASS]);

    expect(game.state.status).toBe('deadEnd');
    expect(game.state.step).toBe(2);
    expect(game.state.lives).toBe(1);

    const rescued = game.rescue('red');

    expect(rescued).toBeDefined();
    const postRescue = game.state;

    expect(postRescue.step).toBe(2);
    expect(postRescue.status).toBe('playing');
    expect(trainInState(postRescue, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });

    // O resgate não é passo: o próximo passo empilha o snapshot pós-resgate.
    game.apply(PASS);
    expect(game.state.step).toBe(3);

    const restored = game.undoStep();

    expect(restored).toBe(postRescue);
    expect(game.state).toBe(postRescue);
    expect(game.state.step).toBe(2);

    // O trem volta `waiting`; a vida perdida continua perdida (M4 não devolve
    // vida e o undo não reembolsa o que já foi comprado).
    expect(game.state.lives).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
  });
});

describe('undo — reset e histórico da run', () => {
  it('reset limpa a pilha: a run nova começa sem passado', () => {
    const game = setup(composite(3));

    play(game, [PASS]);
    game.apply({ kind: 'tap', cell: pos(1, 0) });
    expect(game.state.step).toBe(2);
    expect(game.undoStep()).toBeDefined();

    const fresh = game.reset();

    expect(game.state).toBe(fresh);
    expect(game.state.step).toBe(0);
    expect(game.undoStep()).toBeUndefined();

    // Um passo da run nova empilha só o início dela.
    game.apply(PASS);
    expect(game.undoStep()).toBe(fresh);
    expect(game.undoStep()).toBeUndefined();
  });
});
