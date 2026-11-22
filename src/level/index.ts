/**
 * Sequência de fases do tutorial (D10/D20/D23).
 *
 * O boot abre a LISTA DE FASES; a vitória numa fase com sucessora vira
 * «Próxima fase» e carrega a seguinte. A sequência é dado puro: incluir uma
 * fase futura é adicionar o layout aqui, sem tocar em `main.ts`.
 *
 * M6/D23: a cadeia publicada tem QUATRO fases — Contrato → Sincronia →
 * Obstáculos → Densidade. A Densidade do M6 (P3_DENSITY) é a transição de tom:
 * rota segura vs rota perfeita com moedas. O `p3-overload` (4 trens) sai da
 * cadeia e permanece como referência do pico para a faixa 3 do M9; a loja fica
 * inalcançável até o M7 trazer fases reais (esperado — ver plano do MVP2).
 */

import type { LevelLayout } from '../core/types';
import { P0_LEVEL } from './p0';
import { P1_LEVEL } from './p1';
import { P2_LEVEL } from './p2';
import { P3_DENSITY } from './p3';

export const PHASES: readonly LevelLayout[] = [
  P0_LEVEL,
  P1_LEVEL,
  P2_LEVEL,
  P3_DENSITY,
];
