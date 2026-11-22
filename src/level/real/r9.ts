/**
 * Fase real 9 — «A janela de um passo» (M9, faixa 3: entrada).
 *
 * 7×8, 3 trens, 3 estações, 3 vidas, fora do tutorial. A faixa 3 começa
 * apertando a janela que a faixa 2 deixou larga: o verde entra em (0,3) e faz
 * um cotovelo a mais, cruzando o X (3,4) no passo 5 — EXATAMENTE um passo
 * antes do azul perfeito (6). O X vira uma janela de um passo; o Y do desvio
 * (5,1) continua com a janela de 6 (vermelho 4, azul 11). A rota segura é o
 * X com dois consertos; a perfeita é o túnel com três.
 *
 * UMA IDEIA DOMINANTE: a janela do cruzamento é de um passo. O jogador vê o
 * verde e o azul chegando quase juntos e escolhe: enfrenta o X (segura, 2
 * moedas) ou desce ao túnel (perfeita, 6 moedas).
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   .  .  .  |  .  @r .
 *   1   .  .  .  C  -  G  .
 *   2   .  .  .  |  .  |  .
 *   3   -  t  .  |  .  @b u
 *   4   .  r  -  X  @g .  |
 *   5   .  .  s  r  .  .  |
 *   6   -  -  G  .  .  .  |
 *   7   .  .  r  T  .  T  r
 *
 *   O verde entra em (0,3) LESTE, vira ao sul em (1,3) (`t` rot 2), vira ao
 *   leste em (1,4) (`r` rot 0) e entra no X por (2,4). O resto é o tabuleiro
 *   da r6: C (3,1) fusão, G (5,1) desvio, G (2,6) bifurcação, X (3,4),
 *   túneis (3,7)↔(5,7). `r` (3,5) torto (CCW → `u`), `r` (6,7) torto
 *   (CCW → `u`), `u` (6,3) torto (CCW → `t`). Entradas: vermelho (3,0) SUL,
 *   azul (0,6) LESTE, verde (0,3) LESTE. Estações: @r (5,0), @b (5,3),
 *   @g (4,4).
 *
 * ROTAS
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r [5].
 *   verde: (0,3) → (1,3) → (1,4) → (2,4) → X (3,4) [5] → @g [6].
 *   azul seguro: (0,6) → (1,6) → G (2,6) [3] → N → (2,5) → (3,5) → X [6] →
 *     (3,3) → (3,2) → C (3,1) [9] → (4,1) → G (5,1) [11] → S → @b [13].
 *   azul perfeito: G (2,6) → S → (2,7) → T (3,7) → T (5,7) → (6,7) [7] →
 *     (6,6) → (6,5) → (6,4) → (6,3) [11] → @b [12].
 *
 * SOLUÇÃO SEGURA — 13 AÇÕES (3/3, 3 vidas, 2/6 moedas)
 *   1.    girar (3,5) CCW  curva torta → `u`; o azul sobe para o X.
 *   2–6.  passar
 *   7.    alternar (5,1)   Y do desvio N → S para o azul.
 *   8–13. passar           azul @b no 13; o verde coleta (2,4) e o X no 4/5.
 *   O X tem o verde no 5 e o azul no 6 — um passo de margem.
 *
 * SOLUÇÃO PERFEITA — 12 AÇÕES (3/3, 3 vidas, 6/6 moedas)
 *   1.    alternar (2,6)  bifurcação para o túnel.
 *   2.    girar (6,7) CCW  curva torta → `u`.
 *   3.    girar (6,3) CCW  curva torta → `t`.
 *   4–12. passar          azul coleta (2,7), (6,6), (6,4), (6,3), o X e
 *                         (2,4) (do verde) e entrega em @b no 12.
 *   A rota do túnel evita o X inteiro: a janela de um passo fica só para quem
 *   escolhe a rota segura.
 *
 * FALHAS / LOST
 *   - SEM O CCW (3,5): o azul morre em (3,5) no 6; verde/vermelho entregues;
 *     `won` 2/3 com 2 vidas e 2 moedas.
 *   - VERDE SEM O COTOVELO: se o jogador girar (1,3) ou (1,4), o verde morre
 *     em (1,4)/(1,5) no 3; `won` 2/3.
 *   - LOST: girar (1,4) (verde no 3), alternar (5,1) cedo (vermelho no 6) e
 *     deixar o azul no braço N sem o CCW (morre no 5/6) — três eventos solo.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (3,4), verde no 5 e azul no 6; o Y (5,1),
 *      vermelho no 4 e azul no 11. A janela do X é de um passo — a marca da
 *      faixa 3.
 *   2. JANELA LEGÍVEL: as duas previsões do X estão no primeiro quadro; o
 *      verde e o azul chegam quase juntos, mas a ordem é visível. O CCW (3,5)
 *      é anunciado pela curva torta com o azul a 2 células.
 *   3. DOIS ANDARES: segura 13/2; perfeita 12/6, com o túnel mais longo e três
 *      consertos.
 *   4. UMA IDEIA: a janela de um passo no X.
 *   5. MORTE COM ANTECEDÊNCIA: o verde tem uma previsão curta e separada; a
 *      curva torta e o X no primeiro quadro; o Y com 6 ações.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 vence; o `lost` exige três erros; a
 *      bifurcação permite escolher o andar.
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
    [EMPTY, EMPTY, curve(1), curve(0), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(0)],
  ],
};

export const R9_LEVEL: LevelLayout = {
  id: 'r9-a-janela-de-um-passo',
  name: 'A janela de um passo',
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
