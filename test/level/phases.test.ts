/**
 * Cadeia publicada — tutorial de 4 fases (M6/D23) + faixa 1 do jogo real (M7).
 *
 * O P3+ (Densidade+, 4 trens) sai da cadeia e permanece como referência do
 * pico para a faixa 3 do M9. A faixa 1 tem 4 fases não-tutorial, cada uma com
 * 3 trens e a loja disponível (Resgate/Time-travel).
 */

import { describe, expect, it } from 'vitest';
import { PHASES } from '../../src/level';
import { P0_LEVEL } from '../../src/level/p0';
import { P1_LEVEL } from '../../src/level/p1';
import { P2_LEVEL } from '../../src/level/p2';
import { P3_DENSITY } from '../../src/level/p3';
import { P3_OVERLOAD } from '../../src/level/p3-overload';
import { R1_LEVEL } from '../../src/level/real/r1';
import { R2_LEVEL } from '../../src/level/real/r2';
import { R3_LEVEL } from '../../src/level/real/r3';
import { R4_LEVEL } from '../../src/level/real/r4';

describe('PHASES — tutorial de 4 fases + faixa 1 (M7)', () => {
  it('a cadeia tem 8 fases: P0 → P1 → P2 → P3 → r1 → r2 → r3 → r4', () => {
    expect(PHASES).toHaveLength(8);
    expect(PHASES[0]).toBe(P0_LEVEL);
    expect(PHASES[1]).toBe(P1_LEVEL);
    expect(PHASES[2]).toBe(P2_LEVEL);
    expect(PHASES[3]).toBe(P3_DENSITY);
    expect(PHASES[4]).toBe(R1_LEVEL);
    expect(PHASES[5]).toBe(R2_LEVEL);
    expect(PHASES[6]).toBe(R3_LEVEL);
    expect(PHASES[7]).toBe(R4_LEVEL);
    expect(PHASES).not.toContain(P3_OVERLOAD);
  });

  it('as 4 primeiras são de ensino; as 4 reais não são (loja viva)', () => {
    for (const phase of PHASES.slice(0, 4)) {
      expect(phase.tutorial).toBe(true);
    }

    for (const phase of PHASES.slice(4)) {
      expect(phase.tutorial).toBe(false);
      expect(phase.lives).toBe(3);
      expect(phase.trains).toHaveLength(3);
    }

    expect(P3_OVERLOAD.tutorial).toBeUndefined();
  });

  it('só o P1 apresenta o seletor (D24): selectorHint exclusivo da Sincronia', () => {
    expect(P1_LEVEL.selectorHint).toBe(true);

    for (const phase of PHASES.filter((candidate) => candidate !== P1_LEVEL)) {
      expect(phase.selectorHint).toBeUndefined();
    }
  });

  it('os ids da faixa 1 são estáveis e prefixados r1–r4', () => {
    expect(PHASES.slice(4).map((phase) => phase.id)).toEqual([
      'r1-o-trilho-da-vez',
      'r2-o-cruzamento',
      'r3-a-janela-tripla',
      'r4-o-desvio-da-vez',
    ]);
  });
});
