import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/config/tuning';
import { resolveStep } from '../../src/core/step';
import {
  coinPulseProgress,
  coinTickProgress,
  derailProgress,
  derailVisuals,
  type CoinPulse,
  type DerailExit,
} from '../../src/render/fx';
import {
  board,
  gameState,
  pos,
  RED,
  river,
  runningTrain,
  straight,
} from '../core/helpers';

describe('moeda — pulse e tick do contador (E13)', () => {
  const pulse: CoinPulse = { cell: pos(1, 0), startedAt: 1000 };

  it('o pulse do tabuleiro vai de 0 a 1 em coinPulseMs', () => {
    expect(coinPulseProgress(pulse, 1000)).toBe(0);
    expect(
      coinPulseProgress(pulse, 1000 + TUNING.coinPulseMs / 2),
    ).toBeCloseTo(0.5);
    expect(coinPulseProgress(pulse, 1000 + TUNING.coinPulseMs)).toBe(1);
    // Depois do fim clampa em 1: o draw encerra o pulse em 1.
    expect(coinPulseProgress(pulse, 1000 + TUNING.coinPulseMs + 1)).toBe(1);
  });

  it('antes da janela é 0 e o tick do HUD usa a mesma janela', () => {
    expect(coinPulseProgress(pulse, 999)).toBe(0);
    expect(coinTickProgress(1000, 999)).toBe(0);
    expect(coinTickProgress(1000, 1000)).toBe(0);
    expect(coinTickProgress(1000, 1000 + TUNING.coinPulseMs / 2)).toBeCloseTo(
      0.5,
    );
    expect(coinTickProgress(1000, 1000 + TUNING.coinPulseMs)).toBe(1);
    expect(coinTickProgress(1000, 1000 + TUNING.coinPulseMs + 1)).toBe(1);
  });
});

describe('fantasma da água — reason water (E13)', () => {
  const red = runningTrain('red', RED, 'circle', pos(0, 0), 'east');
  const resolution = resolveStep(
    gameState(
      board([[straight(1), river()]]),
      [red],
      0,
      'playing',
      3,
    ),
  );
  const [visual] = derailVisuals(resolution.events, [red]);

  it('derailVisuals preserva reason water e a célula de chegada', () => {
    expect(visual).toBeDefined();
    expect(visual).toMatchObject({
      train: { id: 'red' },
      at: pos(1, 0),
      direction: 'east',
      reason: 'water',
    });
  });

  it('o afundamento usa o mesmo relógio: 0→1 em derailExitMs', () => {
    if (visual === undefined) {
      throw new Error('derailVisuals não produziu o fantasma da água');
    }

    const exit: DerailExit = {
      train: red,
      cell: visual.at,
      direction: visual.direction,
      reason: visual.reason,
      startedAt: 3000,
    };

    expect(derailProgress(exit, 3000)).toBe(0);
    expect(derailProgress(exit, 3000 + TUNING.derailExitMs / 2)).toBeCloseTo(
      0.5,
    );
    expect(derailProgress(exit, 3000 + TUNING.derailExitMs)).toBe(1);
    expect(derailProgress(exit, 3000 + TUNING.derailExitMs + 1)).toBe(1);

    // A decisão afundar (water) vs deslizar vive no draw; o relógio puro do
    // fantasma é o mesmo para os dois motivos.
    const slide: DerailExit = { ...exit, reason: 'noExit' };

    expect(derailProgress(slide, 3000 + TUNING.derailExitMs / 2)).toBeCloseTo(
      0.5,
    );
  });
});
