/**
 * Fase real 6 — «O atalho do túnel» (M9, faixa 2: sobe em relação à r5).
 *
 * 7×8, 3 trens, 3 estações, 3 vidas, fora do tutorial. A r5 é INVERTIDA: agora
 * o cruzamento é a rota segura (2 toques, 1 moeda) e o túnel é a rota perfeita
 * (3 toques, 5 moedas). As mesmas DUAS disputas continuam vivas no mapa — o X
 * (3,4), verde no 4 e azul no 6, e o Y (5,1), vermelho no 4 e azul no 11 — mas
 * o túnel as evita por um preço: dois CCW de último instante no canto direito.
 *
 * UMA IDEIA DOMINANTE: o atalho do túnel paga mais e exige combinação; o
 * cruzamento é o caminho conhecido. Quem quer o selo desce ao túnel e vira
 * duas curvas no ponto; quem quer só vencer encara o X e o Y.
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   .  .  .  |  .  @r .
 *   1   .  .  .  C  -  G  .
 *   2   .  .  .  |  .  |  .
 *   3   .  .  .  |  .  |  u
 *   4   -  -  -  X  @g .  |
 *   5   .  .  s  r  .  .  |
 *   6   -  -  G  .  .  .  |
 *   7   .  .  r  T  .  T  r
 *
 *   `r` (3,5) torto (CCW → `u`), `r` (6,7) torto (CCW → `u`) e `u` (6,3)
 *   torto (CCW → `t`) são os três consertos; `r` (2,7) nasce certo. O resto
 *   do mapa é o da r5: C (3,1) fusão, G (5,1) desvio, G (2,6) bifurcação,
 *   X (3,4), túneis (3,7)↔(5,7), @r (5,0), @b (5,3), @g (4,4).
 *
 * ROTAS
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r [5].
 *   verde:    (0,4) → (1,4) → (2,4) → X (3,4) [4] → @g [5].
 *   azul seguro (X): (0,6) → (1,6) → G (2,6) [3] → N → (2,5) → (3,5) →
 *     X (3,4) [6] → (3,3) → (3,2) → C (3,1) [9] → (4,1) → G (5,1) [11] →
 *     S → @b (5,3) [13].
 *   azul perfeito (túnel): (0,6) → (1,6) → G (2,6) → S → (2,7) → T (3,7) →
 *     T (5,7) → (6,7) [7] → (6,6) [8] → (6,5) [9] → (6,4) [10] → (6,3) [11]
 *     → @b (5,3) [12].
 *
 * SOLUÇÃO SEGURA — 13 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1.    girar (3,5) CCW  curva rot 0 → 3; o azul sobe para o X.
 *   2–6.  passar
 *   7.    alternar (5,1)   Y do desvio N → S para o azul.
 *   8–13. passar           azul @b no 13; moeda do X pelo verde (4).
 *
 * SOLUÇÃO PERFEITA — 12 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1.    alternar (2,6)  bifurcação para o braço S (túnel).
 *   2.    girar (6,7) CCW  curva rot 0 → 3; vira ao norte no canto.
 *   3.    girar (6,3) CCW  curva rot 3 → 2; vira ao oeste para @b.
 *   4–12. passar          o azul coleta (2,7), (6,6), (6,4), (6,3), o X (do
 *                         verde) e entrega em @b no 12.
 *   O CCW (6,7) tem janela 1–7 (o azul entra em (6,7) no 7); o CCW (6,3) tem
 *   janela 1–10 (o azul entra em (6,3) no 11, resolve no 12). O túnel é mais
 *   CURTO que o X (12 contra 13): o preço é a combinação dos dois CCW, não o
 *   tempo.
 *
 * FALHAS / LOST
 *   - SEM O CCW (3,5): o azul morre em (3,5) no 5; vermelho/verde entregues;
 *     `won` 2/3, 2 vidas, 1 moeda.
 *   - TÚNEL SEM (6,7): o azul morre em (6,7) no 8; `won` 2/3, 2 vidas, 1 moeda.
 *   - TÚNEL SEM (6,3): o azul morre em (6,3) no 12 (a curva rot 3 não conecta
 *     a entrada norte); `won` 2/3, 2 vidas, 4 moedas.
 *   - LOST: girar (2,4) (verde no 3), alternar (5,1) cedo (vermelho no 6) e
 *     deixar o azul no braço N sem o CCW (morre no 5/6) — três eventos
 *     independentes zeram as vidas no 6.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (3,4), verde no 4 e azul no 6; o Y (5,1),
 *      vermelho no 4 e azul no 11. O túnel é a terceira disputa (só o azul),
 *      e a bifurcação decide quais delas o jogador enfrenta.
 *   2. JANELA LEGÍVEL: as duas rotas do azul estão no primeiro quadro; o CCW
 *      (6,7) é uma curva torta no canto com o azul a 3 células; o CCW (6,3) é
 *      a última curva antes da estação. Janelas de 7 e 10 ações.
 *   3. DOIS ANDARES: segura 13/1; perfeita 12/5, com a rota do túnel
 *      visivelmente mais longa no mapa e dois consertos.
 *   4. UMA IDEIA: o atalho do túnel compra moedas com combinação.
 *   5. MORTE COM ANTECEDÊNCIA: as curvas tortas e o X no primeiro quadro; a
 *      rota do túnel é anunciada inteira pelo laço direito.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 vence; `lost` exige três erros; a
 *      bifurcação é reversível com um toque.
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
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, station(BLUE, BLUE_SHAPE), curve(3)],
    [straight(1), straight(1), straight(1), crossing(), station(GREEN, GREEN_SHAPE), EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(1), curve(0), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(0)],
  ],
};

export const R6_LEVEL: LevelLayout = {
  id: 'r6-o-atalho-do-tunel',
  name: 'O atalho do túnel',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 2, row: 7 },
    { col: 6, row: 6 },
    { col: 6, row: 4 },
    { col: 6, row: 3 },
    { col: 3, row: 4 },
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
      entry: { cell: { col: 0, row: 4 }, direction: 'east' },
    },
  ],
};
