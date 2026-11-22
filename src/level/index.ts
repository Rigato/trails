/**
 * Sequência publicada de fases — tutorial + faixa 1 do jogo real (M7).
 *
 * O boot abre a LISTA DE FASES; a vitória numa fase com sucessora vira
 * «Próxima fase» e carrega a seguinte. A sequência é dado puro: incluir uma
 * fase futura é adicionar o layout aqui, sem tocar em `main.ts`.
 *
 * M6/D23: a cadeia de ensino tem QUATRO fases — Contrato → Sincronia →
 * Obstáculos → Densidade. A Densidade (P3_DENSITY) é a transição de tom:
 * rota segura vs rota perfeita com moedas.
 *
 * M7: a faixa 1 do jogo real entra depois do tutorial, com 3 trens por fase
 * (D20/D32) e a loja viva (não-tutorial): «O trilho da vez» (aquecimento),
 * «O cruzamento» (sobe), «A janela tripla» (pico, com a colisão dupla real do
 * M4) e «O desvio da vez» (vale que revisita a ideia do trilho compartilhado
 * no Y). O `p3-overload` (4 trens) segue fora, como referência da faixa 3.
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

export const PHASES: readonly LevelLayout[] = [
  P0_LEVEL,
  P1_LEVEL,
  P2_LEVEL,
  P3_DENSITY,
  R1_LEVEL,
  R2_LEVEL,
  R3_LEVEL,
  R4_LEVEL,
];
