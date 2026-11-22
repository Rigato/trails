/**
 * Regra pura de progresso (M2): vitória desbloqueia a sucessora.
 *
 * Sem browser, sem save: só a função que o shell usa ao vencer e a fase
 * recomendada que alimenta o pulso D6 na lista.
 */

import { describe, expect, it } from 'vitest';
import {
  nextUnlockedIndex,
  recommendedPhaseIndex,
} from '../../src/save/progress';

describe('progresso entre sessões — desbloqueio', () => {
  it('vencer a fase 1 (índice 0) desbloqueia a fase 2 (índice 1)', () => {
    expect(nextUnlockedIndex(0, 0, 5)).toBe(1);
  });

  it('vencer no meio da cadeia abre exatamente a sucessora', () => {
    expect(nextUnlockedIndex(2, 2, 5)).toBe(3);
  });

  it('a última fase clampa no último índice (não cria fase inexistente)', () => {
    expect(nextUnlockedIndex(3, 4, 5)).toBe(4);
    expect(nextUnlockedIndex(4, 4, 5)).toBe(4);
  });

  it('re-vencer fase antiga não regride o progresso', () => {
    expect(nextUnlockedIndex(4, 0, 5)).toBe(4);
    expect(nextUnlockedIndex(3, 1, 5)).toBe(3);
  });

  it('um save adiantado demais é clampado; vitória não usa índice inválido', () => {
    expect(nextUnlockedIndex(99, 0, 5)).toBe(4);
    expect(nextUnlockedIndex(1, -1, 5)).toBe(1);
    expect(nextUnlockedIndex(1, Number.NaN, 5)).toBe(1);
  });

  it('sequência vazia é defensiva: devolve 0', () => {
    expect(nextUnlockedIndex(3, 0, 0)).toBe(0);
  });
});

describe('progresso entre sessões — fase recomendada (pulso D6)', () => {
  it('boot sem save recomenda a fase 1', () => {
    expect(recommendedPhaseIndex(0, 5)).toBe(0);
  });

  it('depois de vencer a fase 1, recomenda a fase 2', () => {
    expect(recommendedPhaseIndex(1, 5)).toBe(1);
  });

  it('completar a sequência recomenda a última fase para rejogar', () => {
    expect(recommendedPhaseIndex(4, 5)).toBe(4);
    expect(recommendedPhaseIndex(99, 5)).toBe(4);
  });

  it('save inválido cai na fase 1, nunca num índice fora da lista', () => {
    expect(recommendedPhaseIndex(-3, 5)).toBe(0);
    expect(recommendedPhaseIndex(Number.NaN, 5)).toBe(0);
    expect(recommendedPhaseIndex(2, 0)).toBe(0);
  });
});
