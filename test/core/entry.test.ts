import { describe, expect, it } from 'vitest';
import {
  board,
  curve,
  EMPTY,
  eventKinds,
  makeGame,
  makeLevel,
  pos,
  RED,
  station,
  straight,
  trainInState,
  trainSetup,
} from './helpers';

/**
 * Entrada = marcador de borda + primeira célula de trilho.
 *
 * As três regras abaixo são o contrato do designer: o trem espera FORA, o
 * primeiro passo pisa na célula sem resolver chegada, a previsão avisa antes se
 * o trilho estiver torto e o jogador pode girar essa peça enquanto espera.
 */
describe('entrada — primeira célula de trilho', () => {
  it('trilho torto: previsão avisa noExit antes do passo 1; passo 2 descarrila', () => {
    const level = makeLevel(
      'entry-wrong',
      board([
        [EMPTY, EMPTY, EMPTY],
        [straight(0), EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1), 'east')],
    );
    const game = makeGame(level);

    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });

    const before = game.prediction('red');

    expect(before?.path).toEqual([pos(0, 1)]);
    expect(before?.stop).toEqual({ kind: 'noExit', cell: pos(0, 1) });

    const enter = game.apply({ kind: 'pass' });

    expect(enter.advanced).toBe(true);
    expect(game.state.step).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'noExit',
      cell: pos(0, 1),
    });

    const fatal = game.apply({ kind: 'pass' });

    expect(fatal.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.status).toBe('deadEnd');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(eventKinds(fatal.events)).toEqual(['trainDerailed', 'deadEnd']);
  });

  it('girar a peça de entrada com trem waiting é permitido e resolve', () => {
    const level = makeLevel(
      'entry-rotate',
      board([
        [EMPTY, EMPTY, EMPTY],
        [straight(0), station(RED), EMPTY],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1), 'east')],
    );
    const game = makeGame(level);

    expect(game.prediction('red')?.stop).toEqual({
      kind: 'noExit',
      cell: pos(0, 1),
    });

    const rotate = game.apply({ kind: 'tap', cell: pos(0, 1) });

    expect(rotate.advanced).toBe(true);
    expect(rotate.outcome.kind).toBe('rotated');
    expect(game.state.step).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 1),
      incoming: 'east',
    });
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'station',
      cell: pos(1, 1),
      correct: true,
    });

    const deliver = game.apply({ kind: 'pass' });

    expect(deliver.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
  });

  it('aceita curva como primeira célula (qualquer peça de trilho)', () => {
    const level = makeLevel(
      'entry-curve',
      board([
        [EMPTY, EMPTY, EMPTY],
        [curve(0), EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY],
      ]),
      [trainSetup('red', RED, 'circle', pos(0, 1), 'east')],
    );

    expect(() => makeGame(level)).not.toThrow();
  });

  it('trilho alinhado entra e segue sem passo extra (timeline preservado)', () => {    const level = makeLevel(
      'entry-aligned',
      board([[straight(1), station(RED)]]),
      [trainSetup('red', RED, 'circle', pos(0, 0), 'east')],
    );
    const game = makeGame(level);

    expect(game.prediction('red')?.path).toEqual([pos(0, 0), pos(1, 0)]);
    expect(game.prediction('red')?.stop).toEqual({
      kind: 'station',
      cell: pos(1, 0),
      correct: true,
    });

    const enter = game.apply({ kind: 'pass' });

    expect(enter.advanced).toBe(true);
    expect(game.state.step).toBe(1);
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'running',
      cell: pos(0, 0),
      incoming: 'east',
    });

    const deliver = game.apply({ kind: 'pass' });

    expect(deliver.advanced).toBe(true);
    expect(game.state.step).toBe(2);
    expect(game.state.status).toBe('won');
    expect(trainInState(game.state, 'red').status).toEqual({
      kind: 'delivered',
    });
  });
});
