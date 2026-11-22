/**
 * Sequência publicada de fases — tutorial + 12 fases reais (M9 completo).
 *
 * O boot abre a LISTA DE FASES; a vitória numa fase com sucessora vira
 * «Próxima fase» e carrega a seguinte. A sequência é dado puro: incluir uma
 * fase futura é adicionar o layout aqui, sem tocar em `main.ts`.
 *
 * M6/D23: a cadeia de ensino tem QUATRO fases — Contrato → Sincronia →
 * Obstáculos → Densidade. A Densidade (P3_DENSITY) é a transição de tom:
 * rota segura vs rota perfeita com moedas.
 *
 * M7: a faixa 1 do jogo real (r1–r4), 3 trens por fase (D20/D32), a loja viva
 * e o primeiro contato com o seletor CW/CCW; a r3 tem a colisão dupla real do
 * M4.
 *
 * M9: a faixa 2 (r5–r8) — duas disputas entrelaçadas, túnel/cruzamento em
 * rota e moedas em zona de risco, com o pico do «preço da pressa» (r7) e o
 * vale do túnel (r8); a faixa 3 (r9–r12) — janelas apertadas, combinação
 * total, o PICO de 4 trens «A mesa cheia» (r11, Q7 como conteúdo) e o vale
 * final «A última moeda» (r12, a ideia mais nova no último nível).
 *
 * `p3-overload` (4 trens) segue fora da cadeia, como referência histórica da
 * E19; `P3_LEVEL` também está fora (é a base congelada da Densidade).
 */

import type { LevelLayout } from '../core/types';
import { P0_LEVEL } from './p0';
import { P1_LEVEL } from './p1';
import { P2_LEVEL } from './p2';
import { P3_DENSITY } from './p3';
import { R1_LEVEL } from './real/r1';
import { R2_LEVEL } from './real/r2';
import { R3_LEVEL } from './real/r3';
import { R4_LEVEL } from './real/r4';
import { R5_LEVEL } from './real/r5';
import { R6_LEVEL } from './real/r6';
import { R7_LEVEL } from './real/r7';
import { R8_LEVEL } from './real/r8';
import { R9_LEVEL } from './real/r9';
import { R10_LEVEL } from './real/r10';
import { R11_LEVEL } from './real/r11';
import { R12_LEVEL } from './real/r12';

export const PHASES: readonly LevelLayout[] = [
  P0_LEVEL,
  P1_LEVEL,
  P2_LEVEL,
  P3_DENSITY,
  R1_LEVEL,
  R2_LEVEL,
  R3_LEVEL,
  R4_LEVEL,
  R5_LEVEL,
  R6_LEVEL,
  R7_LEVEL,
  R8_LEVEL,
  R9_LEVEL,
  R10_LEVEL,
  R11_LEVEL,
  R12_LEVEL,
];
