/**
 * Sequência de fases do protótipo (D10/D20).
 *
 * O boot sempre carrega a primeira fase; a vitória numa fase com sucessora
 * vira «Próxima fase» e carrega a seguinte. A sequência é dado puro: incluir
 * uma fase futura é adicionar o layout aqui, sem tocar em `main.ts`.
 *
 * D20: a sonda Q7 em duas fases — «Densidade» (3 trens) e «Densidade+»
 * (4 trens, a prova de carga). Esta é a cadeia publicada do experimento.
 */

import type { LevelLayout } from '../core/types';
import { P0_LEVEL } from './p0';
import { P1_LEVEL } from './p1';
import { P2_LEVEL } from './p2';
import { P3_LEVEL } from './p3';
import { P3_OVERLOAD } from './p3-overload';

export const PHASES: readonly LevelLayout[] = [
  P0_LEVEL,
  P1_LEVEL,
  P2_LEVEL,
  P3_LEVEL,
  P3_OVERLOAD,
];
