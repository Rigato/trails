import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/config/tuning';
import type { GameEvent } from '../../src/core/types';
import { resolveStep } from '../../src/core/step';
import {
  derailVisuals,
  lifeLostMarkIndices,
  lifePulseProgress,
  lifePulseRing,
  lifePulseScale,
  yArmMix,
  yNeedleSweepAngle,
} from '../../src/render/fx';
import {
  BLUE,
  board,
  EMPTY,
  gameState,
  pos,
  RED,
  runningTrain,
  straight,
} from '../core/helpers';

/**
 * Trains fabricados para o caso §3.10 «troca de células = colisão»: vermelho
 * em (0,0) indo para leste e azul em (1,0) indo para oeste, ambos em retas
 * L–O. Eles trocam de célula no mesmo passo.
 */
function swapCollision() {
  const red = runningTrain('red', RED, 'circle', pos(0, 0), 'east');
  const blue = runningTrain('blue', BLUE, 'square', pos(1, 0), 'west');
  const state = gameState(
    board([[straight(1), straight(1)]]),
    [red, blue],
    0,
    'playing',
    3,
  );

  return { red, blue, resolution: resolveStep(state) };
}

/**
 * Dois descarrilamentos independentes no mesmo passo: cada trem segue para
 * leste e chega a uma célula vazia (noExit), em células diferentes. Duas
 * perdas de vida no mesmo passo = duas marcas pulsando.
 */
function doubleDerail() {
  const red = runningTrain('red', RED, 'circle', pos(0, 0), 'east');
  const blue = runningTrain('blue', BLUE, 'square', pos(0, 1), 'east');
  const state = gameState(
    board([
      [straight(1), EMPTY],
      [straight(1), EMPTY],
    ]),
    [red, blue],
    0,
    'playing',
    3,
  );

  return { red, blue, resolution: resolveStep(state) };
}

function derailsOf(events: readonly GameEvent[]) {
  return events.filter((event) => event.kind === 'trainDerailed');
}

describe('tuning do P1 — parâmetros vivos (E8)', () => {
  it('yToggleMs e lifeLostPulseMs são os defaults do plano §6', () => {
    expect(TUNING.yToggleMs).toBe(120);
    expect(TUNING.lifeLostPulseMs).toBe(350);
  });
});

describe('Y — conexão com crossfade (D12-v2)', () => {
  it('yNeedleSweepAngle codifica o progresso como ângulo 0..π', () => {
    expect(yNeedleSweepAngle(0, 1, 0)).toBe(0);
    expect(yNeedleSweepAngle(0, 1, 1)).toBeCloseTo(Math.PI);
    expect(yNeedleSweepAngle(1, 0, 0)).toBeCloseTo(Math.PI);
    expect(yNeedleSweepAngle(1, 0, 1)).toBe(0);
  });

  it('0→1 começa no braço 0, termina no braço 1 e nunca volta', () => {
    let previous = -Infinity;

    for (let sample = 0; sample <= 200; sample += 1) {
      const mix = yArmMix(1, yNeedleSweepAngle(0, 1, sample / 200));
      expect(mix).toBeGreaterThanOrEqual(previous);
      previous = mix;
    }

    expect(yArmMix(1, yNeedleSweepAngle(0, 1, 0))).toBe(0);
    expect(yArmMix(1, yNeedleSweepAngle(0, 1, 1))).toBeCloseTo(1);
  });

  it('1→0 começa no braço 1, termina no braço 0 e nunca volta', () => {
    let previous = Infinity;

    for (let sample = 0; sample <= 200; sample += 1) {
      const mix = yArmMix(0, yNeedleSweepAngle(1, 0, sample / 200));
      expect(mix).toBeLessThanOrEqual(previous);
      previous = mix;
    }

    expect(yArmMix(0, yNeedleSweepAngle(1, 0, 0))).toBeCloseTo(1);
    expect(yArmMix(0, yNeedleSweepAngle(1, 0, 1))).toBe(0);
  });

  it('em repouso não anima; clampa e não anima quando o braço não muda', () => {
    expect(yArmMix(0)).toBe(0);
    expect(yArmMix(1)).toBe(1);
    expect(yArmMix(1, -Math.PI)).toBe(0);
    expect(yArmMix(1, 2 * Math.PI)).toBe(1);
    expect(yArmMix(0, 2 * Math.PI)).toBe(1);
    expect(yArmMix(0, yNeedleSweepAngle(0, 0, 0.4))).toBe(0);
    expect(yArmMix(1, yNeedleSweepAngle(1, 1, 0.4))).toBe(1);
  });
});

describe('marca de vida perdida (D7/E8)', () => {
  const pulse = { markIndex: 2, startedAt: 1000 };

  it('dura lifeLostPulseMs e termina em 1', () => {
    expect(lifePulseProgress(pulse, 1000)).toBe(0);
    expect(
      lifePulseProgress(pulse, 1000 + TUNING.lifeLostPulseMs / 2),
    ).toBeCloseTo(0.5);
    expect(lifePulseProgress(pulse, 1000 + TUNING.lifeLostPulseMs)).toBe(1);
    expect(lifePulseProgress(pulse, 1000 + TUNING.lifeLostPulseMs + 1)).toBe(1);
  });

  it('a marca cresce no meio e volta; o anel expande e some', () => {
    expect(lifePulseScale(0)).toBe(1);
    expect(lifePulseScale(0.5)).toBeCloseTo(1.55);
    expect(lifePulseScale(1)).toBe(1);

    const start = lifePulseRing(0);
    const middle = lifePulseRing(0.5);
    const end = lifePulseRing(1);

    expect(start.radius).toBeCloseTo(0.55);
    expect(start.alpha).toBeCloseTo(0.55);
    expect(middle.radius).toBeGreaterThan(start.radius);
    expect(middle.alpha).toBeLessThan(start.alpha);
    expect(end.radius).toBeCloseTo(1.6);
    expect(end.alpha).toBe(0);
  });

  it('duas perdas no mesmo passo = duas marcas [2, 1]', () => {
    const { red, blue, resolution } = doubleDerail();
    const indices = lifeLostMarkIndices(resolution.events);

    expect(indices).toEqual([2, 1]);
    expect(resolution.state.lives).toBe(1);

    const visuals = derailVisuals(resolution.events, [red, blue]);
    expect(visuals).toHaveLength(2);
    expect(visuals.map((visual) => visual.train.id)).toEqual(['red', 'blue']);
  });
});

describe('colisão com 2 trens — os dois fantasmas (E8)', () => {
  it('o core emite uma colisão, dois trainDerailed e uma vida; o fx deriva 2 ghosts', () => {
    const { red, blue, resolution } = swapCollision();
    const collisions = resolution.events.filter(
      (event) => event.kind === 'collision',
    );

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({
      kind: 'collision',
      trainIds: ['red', 'blue'],
    });

    const derails = derailsOf(resolution.events);
    expect(derails).toHaveLength(2);
    expect(derails).toMatchObject([
      { trainId: 'red', reason: 'collision', at: pos(1, 0) },
      { trainId: 'blue', reason: 'collision', at: pos(0, 0) },
    ]);

    const visuals = derailVisuals(resolution.events, [red, blue]);
    expect(visuals).toHaveLength(2);
    expect(visuals).toMatchObject([
      { train: { id: 'red' }, at: pos(1, 0), direction: 'east' },
      { train: { id: 'blue' }, at: pos(0, 0), direction: 'west' },
    ]);

    // Colisão = 1 vida, independentemente dos 2 trens (D7); a marca que
    // esvaziou é o índice 2 (remaining).
    expect(lifeLostMarkIndices(resolution.events)).toEqual([2]);
    expect(resolution.state.lives).toBe(2);
    expect(resolution.state.status).toBe('deadEnd');
  });
});
