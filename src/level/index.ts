/**
 * Sequência de fases do protótipo (D10).
 *
 * O boot sempre carrega a primeira fase; a vitória numa fase com sucessora
 * vira «Próxima fase» e carrega a seguinte. A sequência é dado puro: incluir
 * uma fase futura é adicionar o layout aqui, sem tocar em `main.ts`.
 */

import type { LevelLayout } from '../core/types';
import { P0_LEVEL } from './p0';
import { P1_LEVEL } from './p1';
import { P2_DRAFT } from './p2';

// P2 entra como RASCUNHO (E11): destrava o render do rio/ponte/moedas (E12);
// o layout definitivo é do E14/SA4.
export const PHASES: readonly LevelLayout[] = [P0_LEVEL, P1_LEVEL, P2_DRAFT];
