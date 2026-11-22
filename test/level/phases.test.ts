/**
 * Cadeia publicada do tutorial (M6/D23): quatro fases, todas de ensino.
 *
 * O P3+ (Densidade+, 4 trens) sai da cadeia e permanece como referência do
 * pico para a faixa 3 do M9; a loja fica temporariamente inalcançável até o
 * M7 trazer as fases reais (anotado no relatório do épico).
 */

import { describe, expect, it } from 'vitest';
import { PHASES } from '../../src/level';
import { P0_LEVEL } from '../../src/level/p0';
import { P1_LEVEL } from '../../src/level/p1';
import { P2_LEVEL } from '../../src/level/p2';
import { P3_DENSITY } from '../../src/level/p3';
import { P3_OVERLOAD } from '../../src/level/p3-overload';

describe('PHASES — tutorial de 4 fases (M6/D23)', () => {
  it('a cadeia é P0 → P1 → P2 → P3, sem o P3+', () => {
    expect(PHASES).toHaveLength(4);
    expect(PHASES[0]).toBe(P0_LEVEL);
    expect(PHASES[1]).toBe(P1_LEVEL);
    expect(PHASES[2]).toBe(P2_LEVEL);
    expect(PHASES[3]).toBe(P3_DENSITY);
    expect(PHASES).not.toContain(P3_OVERLOAD);
  });

  it('todas as quatro fases são de ensino; o P3+ segue fora como referência', () => {
    for (const phase of PHASES) {
      expect(phase.tutorial).toBe(true);
    }

    expect(P3_OVERLOAD.tutorial).toBeUndefined();
  });

  it('só o P1 apresenta o seletor (D24): selectorHint exclusivo da Sincronia', () => {
    expect(P1_LEVEL.selectorHint).toBe(true);
    expect(P0_LEVEL.selectorHint).toBeUndefined();
    expect(P2_LEVEL.selectorHint).toBeUndefined();
    expect(P3_DENSITY.selectorHint).toBeUndefined();
  });
});
