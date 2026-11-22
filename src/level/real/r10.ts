/**
 * Fase real 10 — «A combinação total» (M9, faixa 3: sobe).
 *
 * 7×8, 3 trens, 3 estações, 3 vidas, fora do tutorial. A r9 com uma peça a
 * mais torta no caminho do X: a curva (2,5) nasce rot 0 e o azul morre nela se
 * o jogador não a girar. Agora NENHUM dos dois andares tem peça de graça:
 *   segura (X):  (2,5) CW + (3,5) CCW + o Y (5,1) — 3 ações;
 *   perfeita (túnel): bifurcação + (6,7) CCW + (6,3) CCW — 3 ações.
 * A dificuldade não está em um lance secreto: está em combinar todos os blocos
 * na ordem certa, com o X a um passo do verde no 5.
 *
 * UMA IDEIA DOMINANTE: a combinação total dos blocos — o jogador não vence por
 * omissão; cada rota exige que ele alinhe todas as peças que ela usa.
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   .  .  .  |  .  @r .
 *   1   .  .  .  C  -  G  .
 *   2   .  .  .  |  .  |  .
 *   3   -  t  .  |  .  @b u
 *   4   .  r  -  X  @g .  |
 *   5   .  .  r  r  .  .  |
 *   6   -  -  G  .  .  .  |
 *   7   .  .  r  T  .  T  r
 *
 *   O mapa é o da r9 com (2,5) `r` (rot 0, torta; o CW → `s` rot 1 conserta).
 *   `r` (3,5) torto (CCW → `u`), `r` (6,7) torto (CCW → `u`), `u` (6,3)
 *   torto (CCW → `t`). Entradas: vermelho (3,0) SUL, azul (0,6) LESTE,
 *   verde (0,3) LESTE. Estações: @r (5,0), @b (5,3), @g (4,4). Túneis
 *   (3,7)↔(5,7).
 *
 * ROTAS
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r [5].
 *   verde: (0,3) → (1,3) → (1,4) → (2,4) → X (3,4) [5] → @g [6].
 *   azul seguro: G (2,6) → N → (2,5) → (3,5) → X [6] → (3,3) → (3,2) →
 *     C (3,1) [9] → (4,1) → G (5,1) [11] → S → @b [13].
 *   azul perfeito: G (2,6) → S → (2,7) → T (3,7) → T (5,7) → (6,7) [7] →
 *     (6,6) → (6,5) → (6,4) → (6,3) [11] → @b [12].
 *
 * SOLUÇÃO SEGURA — 13 AÇÕES (3/3, 3 vidas, 2/6 moedas)
 *   1.    girar (2,5) CW   curva rot 0 → 1; o azul atravessa para o X.
 *   2.    girar (3,5) CCW  curva rot 0 → 3; o azul sobe para o X.
 *   3–7.  passar
 *   8.    alternar (5,1)   Y do desvio N → S para o azul.
 *   9–13. passar           azul @b no 13; verde coleta (2,4) e o X.
 *   A janela dos consertos é 1–4 (o azul entra em (2,5) no 4) e 1–5 (entra em
 *   (3,5) no 5); o Y tem 6–11.
 *
 * SOLUÇÃO PERFEITA — 12 AÇÕES (3/3, 3 vidas, 6/6 moedas)
 *   1.    alternar (2,6)  bifurcação para o túnel.
 *   2.    girar (6,7) CCW  curva torta → `u`.
 *   3.    girar (6,3) CCW  curva torta → `t`.
 *   4–12. passar          azul coleta (2,7), (6,6), (6,4), (6,3), o X e
 *                         (2,4) (do verde) e entrega em @b no 12.
 *   A rota do túnel não passa por (2,5): os três consertos são outros. Cada
 *   andar tem a sua combinação total.
 *
 * FALHAS / LOST
 *   - SEM (2,5): o azul morre em (2,5) no 4/5; `won` 2/3, 2 vidas, 2 moedas.
 *   - SEM (3,5): o azul morre em (3,5) no 6; `won` 2/3.
 *   - SEM (6,7)/(6,3): o azul do túnel morre no canto direito; `won` 2/3.
 *   - LOST: girar (1,4) (verde no 3), alternar (5,1) cedo (vermelho no 6) e
 *     deixar o azul no braço N sem os consertos (morre no 4/5) — três eventos.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (verde 5 / azul 6) e o Y (vermelho 4 / azul 11)
 *      — a mesma gramática da faixa 2 com a janela de um passo.
 *   2. JANELA LEGÍVEL: as curvas tortas do X estão nas duas primeiras células
 *      da rota do azul; a do túnel é o canto direito; tudo no primeiro quadro.
 *   3. DOIS ANDARES: segura 13/2 com 3 consertos; perfeita 12/6 com 3
 *      consertos no túnel. Nenhuma rota vence por omissão.
 *   4. UMA IDEIA: a combinação total dos blocos.
 *   5. MORTE COM ANTECEDÊNCIA: as curvas tortas são visíveis; o azul morre na
 *      primeira peça errada; o X a um passo é anunciado.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 vence; `lost` exige três erros; os consertos
 *      são reversíveis e as janelas largas.
 */

import type { Board, Cell, Color, LevelLayout, Rotation, Shape } from '../../core/types';
import { TUNING } from '../../config/tuning';

const RED: Color = TUNING.palette.pairs[0];
const BLUE: Color = TUNING.palette.pairs[1];
const GREEN: Color = '#3f8f5f';

const RED_SHAPE: Shape = 'circle';
const BLUE_SHAPE: Shape = 'square';
const GREEN_SHAPE: Shape = 'triangle';

const EMPTY: Cell = { kind: 'empty' };

function straight(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'straight', rot } };
}

function curve(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'curve', rot } };
}

function y(rot: Rotation, arm: 0 | 1, next: 'toggle' | 'rotate' = 'toggle'): Cell {
  return { kind: 'piece', piece: { kind: 'y', rot, arm, next } };
}

function crossing(): Cell {
  return { kind: 'piece', piece: { kind: 'crossing', rot: 0 } };
}

function tunnel(exit: { col: number; row: number }): Cell {
  return { kind: 'fixed', fixed: { kind: 'tunnel', exit } };
}

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

const board: Board = {
  width: 7,
  height: 8,
  rows: [
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, station(RED, RED_SHAPE), EMPTY],
    [EMPTY, EMPTY, EMPTY, y(1, 0), straight(1), y(3, 0), EMPTY],
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, straight(0), EMPTY],
    [straight(1), curve(2), EMPTY, straight(0), EMPTY, station(BLUE, BLUE_SHAPE), curve(3)],
    [EMPTY, curve(0), straight(1), crossing(), station(GREEN, GREEN_SHAPE), EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), curve(0), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(0)],
  ],
};

export const R10_LEVEL: LevelLayout = {
  id: 'r10-a-combinacao-total',
  name: 'A combinação total',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 2, row: 7 },
    { col: 6, row: 6 },
    { col: 6, row: 4 },
    { col: 6, row: 3 },
    { col: 2, row: 4 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 3, row: 0 }, direction: 'south' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 0, row: 6 }, direction: 'east' },
    },
    {
      id: 'green',
      color: GREEN,
      shape: GREEN_SHAPE,
      entry: { cell: { col: 0, row: 3 }, direction: 'east' },
    },
  ],
};
