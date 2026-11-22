/**
 * Economia da vitória (M3/D27/D30/D31) — testes puros, sem DOM.
 *
 * A tabela n×(n−1) é índice a índice; o lookup fora dela nunca inventa bônus.
 * O selo cobre a fase com e sem moedas, o bloqueio por consumível e a regra
 * de set: re-vitória perfeita não duplica.
 */

import { describe, expect, it } from 'vitest';
import {
  addSeal,
  bonusForDelivered,
  sealCondition,
  victoryBanking,
} from '../../src/save/economy';

/** Tabela de produção (D27), repetida aqui como contrato fechado. */
const TABLE = [0, 0, 2, 6, 12] as const;

describe('victoryBanking — bônus n×(n−1) + moedas na vitória (D27)', () => {
  it('a tabela vale índice a índice: 1→0, 2→2, 3→6, 4→12', () => {
    expect(bonusForDelivered(0, TABLE)).toBe(0);
    expect(bonusForDelivered(1, TABLE)).toBe(0);
    expect(bonusForDelivered(2, TABLE)).toBe(2);
    expect(bonusForDelivered(3, TABLE)).toBe(6);
    expect(bonusForDelivered(4, TABLE)).toBe(12);
  });

  it('índice fora da tabela (ou inválido) devolve 0', () => {
    expect(bonusForDelivered(5, TABLE)).toBe(0);
    expect(bonusForDelivered(-1, TABLE)).toBe(0);
    expect(bonusForDelivered(2.5, TABLE)).toBe(0);
    expect(bonusForDelivered(Number.NaN, TABLE)).toBe(0);
    expect(bonusForDelivered(3, [])).toBe(0);
  });

  it('soma moedas e bônus e credita na carteira', () => {
    expect(
      victoryBanking({ delivered: 3, coins: 4, wallet: 5, table: TABLE }),
    ).toEqual({ coins: 4, bonus: 6, banked: 10, walletAfter: 15 });
  });

  it('vitória «chocha» de 1 trem não rende bônus, mas as moedas entram', () => {
    expect(
      victoryBanking({ delivered: 1, coins: 2, wallet: 8, table: TABLE }),
    ).toEqual({ coins: 2, bonus: 0, banked: 2, walletAfter: 10 });
  });

  it('fase sem moedas e 1 trem (P0) banca 0 e mantém a carteira', () => {
    expect(
      victoryBanking({ delivered: 1, coins: 0, wallet: 14, table: TABLE }),
    ).toEqual({ coins: 0, bonus: 0, banked: 0, walletAfter: 14 });
  });

  it('2 trens (P1) creditam exatamente +2 na carteira', () => {
    expect(
      victoryBanking({ delivered: 2, coins: 0, wallet: 7, table: TABLE }),
    ).toEqual({ coins: 0, bonus: 2, banked: 2, walletAfter: 9 });
  });
});

describe('sealCondition — selo de perfeição (D30)', () => {
  it('todos os trens + todas as moedas + run sem consumível → selo', () => {
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: 4,
        coinsTotal: 4,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('fase sem moedas: 0 de 0 satisfaz a parte das moedas', () => {
    expect(
      sealCondition({
        delivered: 2,
        trainTotal: 2,
        coins: 0,
        coinsTotal: 0,
        consumableUsed: false,
      }),
    ).toBe(true);
  });

  it('faltou um trem → sem selo', () => {
    expect(
      sealCondition({
        delivered: 2,
        trainTotal: 3,
        coins: 4,
        coinsTotal: 4,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('faltou uma moeda → sem selo', () => {
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: 3,
        coinsTotal: 4,
        consumableUsed: false,
      }),
    ).toBe(false);
  });

  it('consumível usado bloqueia o selo mesmo com tudo entregue e coletado', () => {
    expect(
      sealCondition({
        delivered: 3,
        trainTotal: 3,
        coins: 4,
        coinsTotal: 4,
        consumableUsed: true,
      }),
    ).toBe(false);
  });
});

describe('addSeal — selo não farmável (D31)', () => {
  it('grava a fase uma vez e marca a conquista como nova', () => {
    const first = addSeal([], 'p1-sincronia');

    expect(first.sealNew).toBe(true);
    expect(first.seals).toEqual(['p1-sincronia']);
  });

  it('re-vitória perfeita não duplica o selo nem re-pulsa', () => {
    const existing = ['p0-contrato', 'p1-sincronia'];
    const again = addSeal(existing, 'p1-sincronia');

    expect(again.sealNew).toBe(false);
    expect(again.seals).toBe(existing);
    expect(again.seals).toEqual(['p0-contrato', 'p1-sincronia']);
  });

  it('fases diferentes acumulam, cada uma com sua estrela', () => {
    const first = addSeal([], 'p0-contrato');
    const second = addSeal(first.seals, 'p1-sincronia');

    expect(second.sealNew).toBe(true);
    expect(second.seals).toEqual(['p0-contrato', 'p1-sincronia']);
  });
});
