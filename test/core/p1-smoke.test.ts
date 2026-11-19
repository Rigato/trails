import { describe, expect, it } from 'vitest';
import type { CellPos, Game, GameEvent } from '../../src/core/types';
import { P1_LEVEL } from '../../src/level/p1';
import {
  collisionsOf,
  derailsOf,
  deliveriesOf,
  eventKinds,
  lifeLossesOf,
  makeGame,
  pos,
  trainInState,
} from './helpers';

/** Ação da solução do rascunho: giro, toggle do Y ou passar turno. */
type SolutionAction =
  | { readonly kind: 'rotate'; readonly cell: CellPos }
  | { readonly kind: 'toggle'; readonly cell: CellPos }
  | { readonly kind: 'pass' };

/** Sequência espelhada no comentário de `src/level/p1.ts`. */
const SOLUTION: readonly SolutionAction[] = [
  { kind: 'rotate', cell: pos(1, 3) },
  { kind: 'rotate', cell: pos(2, 2) },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'pass' },
  { kind: 'toggle', cell: pos(2, 1) },
  { kind: 'pass' },
];

function applySolution(game: Game, action: SolutionAction) {
  return action.kind === 'pass'
    ? game.apply({ kind: 'pass' })
    : game.apply({ kind: 'tap', cell: action.cell });
}

function expectedOutcome(action: SolutionAction) {
  if (action.kind === 'pass') {
    return 'passed';
  }

  return action.kind === 'toggle' ? 'toggled' : 'rotated';
}

describe('P1 «Sincronia» — rascunho de ponta a ponta', () => {
  it('a solução documentada entrega os dois trens (6 e 8) com 3 vidas intactas', () => {
    const game = makeGame(P1_LEVEL);

    expect(game.state.lives).toBe(3);
    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');

    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = applySolution(game, action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(expectedOutcome(action));
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);

      if (index === 5) {
        // Vermelho entregue no passo 6; azul ainda em campo.
        expect(trainInState(game.state, 'red').status).toEqual({
          kind: 'delivered',
        });
        expect(trainInState(game.state, 'blue').status.kind).toBe('running');
        expect(game.state.lives).toBe(3);
      }

      if (index === 6) {
        // O toggle do split no passo 7 é a ação da janela.
        expect(eventKinds(result.events)[0]).toBe('pieceToggled');
        expect(game.state.lives).toBe(3);
      }
    }

    expect(game.state.step).toBe(8);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(3);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'delivered',
    });
    expect(game.prediction('red')).toBeUndefined();
    expect(game.prediction('blue')).toBeUndefined();
    expect(deliveriesOf(allEvents)).toHaveLength(2);
    expect(collisionsOf(allEvents)).toHaveLength(0);
    expect(derailsOf(allEvents)).toHaveLength(0);
    expect(lifeLossesOf(allEvents)).toHaveLength(0);
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
  });

  it('sem o toggle do passo 7, o azul descarrila na estação errada; won com 2 vidas', () => {
    const game = makeGame(P1_LEVEL);

    for (const action of SOLUTION.slice(0, 6)) {
      applySolution(game, action);
    }

    // Passo 7 sem toggle: azul entra no split com a agulha O.
    const seventh = game.apply({ kind: 'pass' });

    expect(seventh.advanced).toBe(true);
    expect(game.state.step).toBe(7);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'running',
      cell: pos(2, 1),
      incoming: 'north',
    });
    expect(game.state.lives).toBe(3);

    // Passo 8: sai O para a estação vermelha e descarrila por cor.
    const eighth = game.apply({ kind: 'pass' });

    expect(eighth.advanced).toBe(true);
    expect(game.state.step).toBe(8);
    expect(game.state.status).toBe('won');
    expect(game.state.lives).toBe(2);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
    expect(trainInState(game.state, 'blue').status).toEqual({
      kind: 'derailed',
      reason: 'wrongStation',
    });
    expect(collisionsOf(eighth.events)).toHaveLength(0);
    expect(derailsOf(eighth.events)).toEqual([
      {
        kind: 'trainDerailed',
        trainId: 'blue',
        at: pos(1, 1),
        direction: 'west',
        reason: 'wrongStation',
      },
    ]);
    expect(lifeLossesOf(eighth.events)).toEqual([
      { kind: 'lifeLost', step: 8, remaining: 2 },
    ]);
    expect(eventKinds(eighth.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'lifeLost',
      'victory',
    ]);
  });
});
