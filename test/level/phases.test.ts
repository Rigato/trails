/**
 * Cadeia publicada — tutorial de 4 fases (M6/D23) + 12 fases reais (M7/M9).
 *
 * O P3+ (Densidade+, 4 trens) e o P3 original seguem fora da cadeia. A faixa 1
 * (r1–r4) abre o jogo real; a faixa 2 (r5–r8) tem duas disputas entrelaçadas,
 * túnel/cruzamento em rota e o pico do «preço da pressa»; a faixa 3 (r9–r12)
 * tem a janela de um passo, a combinação total, o pico de 4 trens «A mesa
 * cheia» (Q7) e o vale final «A última moeda».
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
import { R5_LEVEL } from '../../src/level/real/r5';
import { R6_LEVEL } from '../../src/level/real/r6';
import { R7_LEVEL } from '../../src/level/real/r7';
import { R8_LEVEL } from '../../src/level/real/r8';
import { R9_LEVEL } from '../../src/level/real/r9';
import { R10_LEVEL } from '../../src/level/real/r10';
import { R11_LEVEL } from '../../src/level/real/r11';
import { R12_LEVEL } from '../../src/level/real/r12';

describe('PHASES — tutorial de 4 + 12 fases reais (M9)', () => {
  it('a cadeia tem 16 fases: P0–P3 + r1–r12', () => {
    expect(PHASES).toHaveLength(16);
    expect(PHASES[0]).toBe(P0_LEVEL);
    expect(PHASES[1]).toBe(P1_LEVEL);
    expect(PHASES[2]).toBe(P2_LEVEL);
    expect(PHASES[3]).toBe(P3_DENSITY);
    expect(PHASES.slice(4, 8)).toEqual([R1_LEVEL, R2_LEVEL, R3_LEVEL, R4_LEVEL]);
    expect(PHASES.slice(8, 12)).toEqual([R5_LEVEL, R6_LEVEL, R7_LEVEL, R8_LEVEL]);
    expect(PHASES.slice(12, 16)).toEqual([R9_LEVEL, R10_LEVEL, R11_LEVEL, R12_LEVEL]);
    expect(PHASES).not.toContain(P3_OVERLOAD);
  });

  it('as 4 primeiras são de ensino; as 12 reais não são (loja viva)', () => {
    for (const phase of PHASES.slice(0, 4)) {
      expect(phase.tutorial).toBe(true);
    }

    for (const phase of PHASES.slice(4)) {
      expect(phase.tutorial).toBe(false);
      expect(phase.lives).toBe(3);
    }

    for (const phase of PHASES.slice(4, 14)) {
      expect(phase.trains).toHaveLength(3);
    }

    expect(R11_LEVEL.trains).toHaveLength(4);
    expect(R12_LEVEL.trains).toHaveLength(3);
    expect(P3_OVERLOAD.tutorial).toBeUndefined();
  });

  it('só o P1 apresenta o seletor (D24)', () => {
    expect(P1_LEVEL.selectorHint).toBe(true);

    for (const phase of PHASES.filter((candidate) => candidate !== P1_LEVEL)) {
      expect(phase.selectorHint).toBeUndefined();
    }
  });

  it('os ids são estáveis: r1–r12', () => {
    expect(PHASES.slice(4).map((phase) => phase.id)).toEqual([
      'r1-o-trilho-da-vez',
      'r2-o-cruzamento',
      'r3-a-janela-tripla',
      'r4-o-desvio-da-vez',
      'r5-o-tunel-e-o-cruzamento',
      'r6-o-atalho-do-tunel',
      'r7-o-preco-da-pressa',
      'r8-o-tunel-da-vez',
      'r9-a-janela-de-um-passo',
      'r10-a-combinacao-total',
      'r11-a-mesa-cheia',
      'r12-a-ultima-moeda',
    ]);
  });
});
