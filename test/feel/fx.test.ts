import { describe, expect, it } from 'vitest';
import { TUNING } from '../../src/config/tuning';
import type { StepEasing } from '../../src/config/tuning';
import {
  CELL_FLASH_MS,
  derailProgress,
  easeStep,
  flashIntensity,
  pulseProgress,
  rotationProgress,
  stationPulseScale,
  type DerailExit,
  type DeliveryPulse,
} from '../../src/render/fx';

const EASINGS: readonly StepEasing[] = [
  'linear',
  'easeOutQuad',
  'easeInOutQuad',
  'easeOutCubic',
];

describe('easeStep — a curva do passo', () => {
  for (const easing of EASINGS) {
    it(`${easing} começa em 0, termina em 1 e não volta`, () => {
      expect(easeStep(easing, 0)).toBe(0);
      expect(easeStep(easing, 1)).toBe(1);

      let previous = 0;

      for (let step = 1; step <= 100; step += 1) {
        const value = easeStep(easing, step / 100);
        expect(value).toBeGreaterThanOrEqual(previous - 1e-12);
        previous = value;
      }
    });
  }

  it('clampa progresso fora de [0, 1]', () => {
    expect(easeStep('easeOutQuad', -0.5)).toBe(0);
    expect(easeStep('easeOutQuad', 1.5)).toBe(1);
  });

  it('easeOutQuad chega adiantado (o passo desacelera no fim)', () => {
    expect(easeStep('easeOutQuad', 0.5)).toBeGreaterThan(0.5);
  });
});

describe('rotationProgress — giro com sobregiro', () => {
  it('começa e termina exatamente no alvo', () => {
    expect(rotationProgress(0, TUNING.rotationOvershoot)).toBe(0);
    expect(rotationProgress(1, TUNING.rotationOvershoot)).toBe(1);
  });

  it('ultrapassa o alvo com o sobregiro do tuning e volta', () => {
    let peak = 0;

    for (let step = 0; step <= 1000; step += 1) {
      peak = Math.max(peak, rotationProgress(step / 1000, TUNING.rotationOvershoot));
    }

    expect(peak).toBeGreaterThan(TUNING.rotationOvershoot - 1e-6);
    expect(peak).toBeLessThan(TUNING.rotationOvershoot + 1e-6);
  });

  it('sem sobregiro é uma desaceleração simples', () => {
    for (let step = 0; step <= 100; step += 1) {
      expect(rotationProgress(step / 100, 1)).toBeLessThanOrEqual(1);
    }
  });
});

describe('flash de toque nulo/bloqueado (D3)', () => {
  const flash = { cell: { col: 0, row: 0 }, startedAt: 1000 };

  it('nasce no toque e apaga dentro da constante curta', () => {
    expect(flashIntensity(flash, 1000)).toBe(1);
    expect(flashIntensity(flash, 1000 + CELL_FLASH_MS / 2)).toBeCloseTo(0.25);
    expect(flashIntensity(flash, 1000 + CELL_FLASH_MS)).toBe(0);
    expect(flashIntensity(flash, 1000 + CELL_FLASH_MS + 1)).toBe(0);
  });
});

describe('pulse de entrega (D5)', () => {
  const pulse: DeliveryPulse = {
    cell: { col: 4, row: 1 },
    color: '#d64545',
    startedAt: 2000,
  };

  it('a estação começa e termina em 1 e atinge o pico no meio', () => {
    expect(stationPulseScale(0)).toBe(1);
    expect(stationPulseScale(0.5)).toBeCloseTo(TUNING.deliverPulseScale);
    expect(stationPulseScale(1)).toBe(1);
  });

  it('o progresso respeita a duração do tuning', () => {
    expect(pulseProgress(pulse, 2000)).toBe(0);
    expect(pulseProgress(pulse, 2000 + TUNING.deliverPulseMs / 2)).toBeCloseTo(0.5);
    expect(pulseProgress(pulse, 2000 + TUNING.deliverPulseMs)).toBe(1);
  });
});

describe('saída do trem descarrilado (D1)', () => {
  const exit: DerailExit = {
    train: {
      id: 'red',
      color: '#d64545',
      shape: 'circle',
      status: { kind: 'derailed', reason: 'noExit' },
    },
    cell: { col: 2, row: 5 },
    direction: 'south',
    reason: 'noExit',
    startedAt: 3000,
  };

  it('leva derailExitMs até desaparecer', () => {
    expect(derailProgress(exit, 3000)).toBe(0);
    expect(derailProgress(exit, 3000 + TUNING.derailExitMs)).toBe(1);
    expect(derailProgress(exit, 3000 + TUNING.derailExitMs + 500)).toBe(1);
  });
});

describe('contrato de ritmo do tuning (§6)', () => {
  it('defaults do E3 estão declarados no arquivo único', () => {
    expect(TUNING.stepDurationMs).toBe(180);
    expect(TUNING.stepEasing).toBe('easeOutQuad');
    expect(TUNING.rotationMs).toBe(110);
    expect(TUNING.rotationOvershoot).toBeGreaterThan(1);
    expect(TUNING.bufferedStepGapMs).toBe(0);
    expect(TUNING.predictionDashMs).toBe(1200);
  });
});
