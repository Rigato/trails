/**
 * Fase P0 «Contrato» — testes da fase DEFINITIVA (E4).
 *
 * O core (`test/core/*`) testa regras genéricas; este arquivo testa o DADO da
 * fase: o primeiro quadro que ensina o contrato (D6), a sequência documentada
 * em `src/level/p0.ts` e a leitura distribuída da previsão. Migrado do bloco
 * «P0 — fumaça» que vivia em `test/core/game.test.ts`.
 */

import { describe, expect, it } from 'vitest';
import type {
  CellPos,
  Game,
  GameEvent,
  Prediction,
  PredictionStop,
  Station,
} from '../../src/core/types';
import { cellAt } from '../../src/core/types';
import { setup } from '../../src/core/game';
import { TUNING } from '../../src/config/tuning';
import { P0_LEVEL } from '../../src/level/p0';
import { firstHintTarget, hintPulseIntensity } from '../../src/render/fx';
import {
  eventKinds,
  pos,
  trainById,
  trainInState,
} from '../core/helpers';

/** Ação da solução: um giro CW em `cell` ou o botão «passar turno». */
type SolutionAction =
  | { readonly kind: 'rotate'; readonly cell: CellPos }
  | { readonly kind: 'pass' };

/**
 * Sequência oficial (espelhada no comentário de `src/level/p0.ts`).
 *
 * 8 giros (um por peça do caminho, na ordem em que o trem chega) + 2 passagens
 * finais até a estação. Entrega no 10º passo.
 */
const SOLUTION: readonly SolutionAction[] = [
  { kind: 'rotate', cell: pos(1, 1) },
  { kind: 'rotate', cell: pos(2, 1) },
  { kind: 'rotate', cell: pos(2, 2) },
  { kind: 'rotate', cell: pos(2, 3) },
  { kind: 'rotate', cell: pos(3, 3) },
  { kind: 'rotate', cell: pos(4, 3) },
  { kind: 'rotate', cell: pos(4, 2) },
  { kind: 'rotate', cell: pos(4, 1) },
  { kind: 'pass' },
  { kind: 'pass' },
];

/**
 * Onde a previsão termina depois de cada passo da solução (passos 1–9).
 *
 * É a prova automatizada do «tutorial distribuído»: o destino visível muda a
 * cada ação e aponta o próximo problema — duas vezes para uma rota errada
 * (passos 3 e 5), o resto para uma peça ainda virada.
 */
const STOPS_AFTER_STEP: readonly PredictionStop[] = [
  { kind: 'noExit', cell: pos(2, 1) },
  { kind: 'noExit', cell: pos(2, 2) },
  { kind: 'noExit', cell: pos(1, 3) },
  { kind: 'noExit', cell: pos(3, 3) },
  { kind: 'noExit', cell: pos(4, 4) },
  { kind: 'noExit', cell: pos(4, 2) },
  { kind: 'noExit', cell: pos(4, 1) },
  { kind: 'station', cell: pos(5, 1), correct: true },
  { kind: 'station', cell: pos(5, 1), correct: true },
];

/** Previsão do único trem, com erro claro se ela não existir. */
function predictionOf(game: Game): Prediction {
  const prediction = game.prediction('red');

  if (prediction === undefined) {
    throw new Error('O trem "red" deveria ter previsão.');
  }

  return prediction;
}

/** Aplica uma ação da solução e devolve o resultado do core. */
function applySolution(game: Game, action: SolutionAction) {
  return action.kind === 'rotate'
    ? game.apply({ kind: 'tap', cell: action.cell })
    : game.apply({ kind: 'pass' });
}

describe('P0 — fase «Contrato» (layout definitivo)', () => {
  it('o dado da fase respeita o contrato do P0: 6×6, 1 par, só retas/curvas', () => {
    const { board } = P0_LEVEL;
    const cells = board.rows.flat();

    expect(board.width).toBe(6);
    expect(board.height).toBe(6);
    expect(cells).toHaveLength(36);
    expect(P0_LEVEL.trains).toHaveLength(1);

    let station: Station | undefined;
    let entries = 0;
    let pieces = 0;

    for (const cell of cells) {
      if (cell.kind === 'piece') {
        pieces += 1;
      } else if (cell.kind === 'fixed' && cell.fixed.kind === 'station') {
        station = cell.fixed;
      } else if (cell.kind === 'fixed' && cell.fixed.kind === 'entry') {
        entries += 1;
      }
    }

    // 8 peças na solução + 2 decoys isoladas; nada além de retas e curvas.
    expect(pieces).toBe(10);
    expect(entries).toBe(1);
    expect(station).toBeDefined();

    const train = P0_LEVEL.trains[0];

    expect(train).toBeDefined();
    expect(train?.color).toBe(station?.color);
    expect(train?.shape).toBe(station?.shape);
    expect(train?.entry).toEqual(pos(0, 1));
  });

  it('a cor do par trem/estação vem do tuning (§6, palette.pair)', () => {
    const train = P0_LEVEL.trains[0];

    expect(train?.color).toBe(TUNING.palette.pair);

    const stationCell = cellAt(P0_LEVEL.board, pos(5, 1));

    expect(stationCell).toMatchObject({
      kind: 'fixed',
      fixed: { kind: 'station', color: TUNING.palette.pair },
    });
  });

  it('primeiro quadro: entrada → trem → previsão morre na peça do 1º giro (D6)', () => {
    const game = setup(P0_LEVEL);

    expect(game.state.step).toBe(0);
    expect(game.state.status).toBe('ready');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });

    const prediction = predictionOf(game);

    // Uma célula de previsão e o ponto de parada exatamente na reta vertical
    // (1,1): o traço pontilhado visível morre dentro da peça do primeiro giro.
    expect(prediction.path).toEqual([pos(0, 1), pos(1, 1)]);
    expect(prediction.stop).toEqual({ kind: 'noExit', cell: pos(1, 1) });

    // O halo do D6 deriva do ESTADO (não há coordenada escrita no render) e
    // aponta a mesma peça que a solução gira primeiro.
    expect(firstHintTarget(game.state, [prediction])).toEqual(pos(1, 1));
    expect(SOLUTION[0]).toEqual({ kind: 'rotate', cell: pos(1, 1) });
  });

  it('a solução documentada entrega no 10º passo, sem colisão nem descarrilamento', () => {
    const game = setup(P0_LEVEL);
    const allEvents: GameEvent[] = [];

    for (const [index, action] of SOLUTION.entries()) {
      const result = applySolution(game, action);

      expect(result.advanced).toBe(true);
      expect(result.outcome.kind).toBe(
        action.kind === 'rotate' ? 'rotated' : 'passed',
      );
      expect(game.state.step).toBe(index + 1);
      allEvents.push(...result.events);
    }

    expect(game.state.step).toBe(10);
    expect(game.state.status).toBe('won');
    expect(trainById(game, 'red').status).toEqual({ kind: 'delivered' });
    expect(game.prediction('red')).toBeUndefined();

    const last = allEvents.filter(
      (event) => event.kind === 'trainDelivered' || event.kind === 'victory',
    );

    // A entrega é o último movimento: nada de evento depois da vitória.
    expect(eventKinds(allEvents).slice(-3)).toEqual([
      'trainMoved',
      'trainDelivered',
      'victory',
    ]);
    expect(last.map((event) => event.kind)).toEqual([
      'trainDelivered',
      'victory',
    ]);
    expect(allEvents.some((event) => event.kind === 'collision')).toBe(false);
    expect(allEvents.some((event) => event.kind === 'trainDerailed')).toBe(
      false,
    );
  });

  it('cada ação da solução muda o destino da previsão (tutorial distribuído)', () => {
    const game = setup(P0_LEVEL);

    for (const [index, action] of SOLUTION.entries()) {
      applySolution(game, action);

      const step = index + 1;

      if (step === SOLUTION.length) {
        expect(game.prediction('red')).toBeUndefined();
        break;
      }

      const prediction = predictionOf(game);
      const expected = STOPS_AFTER_STEP[index];

      expect(expected).toBeDefined();
      expect(prediction.stop).toEqual(expected);

      // A previsão parte sempre de onde o trem está: o jogador vê a
      // consequência da ação no mesmo quadro, sem piscar.
      const train = trainInState(game.state, 'red');

      if (train.status.kind === 'running') {
        expect(prediction.path[0]).toEqual(train.status.cell);
      } else {
        expect(train.status.kind).toBe('waiting');
      }
    }
  });

  it('o hint do D6 sobrevive a toque nulo e para na primeira ação válida', () => {
    const game = setup(P0_LEVEL);

    expect(firstHintTarget(game.state, [predictionOf(game)])).toEqual(pos(1, 1));

    // Toque nulo em célula vazia: não é ação, o passo não anda e o hint fica.
    const nullTap = game.apply({ kind: 'tap', cell: pos(0, 0) });

    expect(nullTap.advanced).toBe(false);
    expect(nullTap.outcome).toEqual({ kind: 'null', reason: 'empty' });
    expect(game.state.step).toBe(0);
    expect(firstHintTarget(game.state, [predictionOf(game)])).toEqual(pos(1, 1));

    // Qualquer ação válida (giro ou «passar turno») ensina o contrato: o hint
    // some, mesmo que o destino ainda não esteja resolvido.
    const first = game.apply({ kind: 'tap', cell: pos(1, 1) });

    expect(first.advanced).toBe(true);
    expect(firstHintTarget(game.state, [predictionOf(game)])).toBeNull();
  });

  it('o halo respira no período do tuning; período ≤ 0 desliga o hint', () => {
    const period = TUNING.firstHintPulseMs;

    expect(hintPulseIntensity(0, period)).toBeCloseTo(0);
    expect(hintPulseIntensity(period / 2, period)).toBeCloseTo(1);
    expect(hintPulseIntensity(period, period)).toBeCloseTo(0);

    for (let sample = 0; sample <= 20; sample += 1) {
      const value = hintPulseIntensity((period * sample) / 20, period);

      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }

    // Desligar o hint é só zerar o parâmetro — sem flags novas no tuning.
    expect(hintPulseIntensity(123, 0)).toBe(0);
    expect(hintPulseIntensity(123, -1)).toBe(0);
  });

  it('ignorar a previsão descarrila (D1) e o recomeço restaura o 1º quadro', () => {
    const game = setup(P0_LEVEL);

    // Dois «passar turno» sem girar a peça (1,1): a previsão já avisava.
    const enter = game.apply({ kind: 'pass' });

    expect(enter.advanced).toBe(true);
    expect(predictionOf(game).stop).toEqual({
      kind: 'noExit',
      cell: pos(1, 1),
    });

    const fatal = game.apply({ kind: 'pass' });

    expect(fatal.advanced).toBe(true);
    expect(game.state.status).toBe('deadEnd');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'derailed',
      reason: 'noExit',
    });
    expect(eventKinds(fatal.events)).toEqual([
      'trainMoved',
      'trainDerailed',
      'deadEnd',
    ]);

    // Sem vidas, sem derrota: recomeçar é o estado inicial, e o hint volta.
    const reset = game.reset();

    expect(reset).toBe(game.state);
    expect(reset.step).toBe(0);
    expect(reset.status).toBe('ready');
    expect(trainById(game, 'red').status).toEqual({
      kind: 'waiting',
      cell: pos(0, 1),
      direction: 'east',
    });
    expect(predictionOf(game).stop).toEqual({
      kind: 'noExit',
      cell: pos(1, 1),
    });
    expect(firstHintTarget(game.state, [predictionOf(game)])).toEqual(pos(1, 1));
  });
});
