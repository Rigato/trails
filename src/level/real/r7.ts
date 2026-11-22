/**
 * Fase real 7 — «O preço da pressa» (M9, faixa 2: o PICO).
 *
 * 6×7, 3 trens, 3 estações, 3 vidas, fora do tutorial. O PICO da faixa 2 é um
 * REMIX do pico da faixa 1 («A janela tripla»): o X (3,4) continua com três
 * janelas, mas o vermelho NASCE no braço rápido da entrada (1,6) e o azul no
 * X no 5. O primeiro quadro é uma colisão anunciada: sem o primeiro toque, os
 * dois morrem juntos no 5 (1 vida) e o verde (no laço de moedas) morre sozinho
 * no 13 — `deadEnd` com 1 vida, o prompt do Resgate do M4. A ideia dominante é
 * o PREÇO DA PRESSA: acelerar o vermelho é o erro que o tabuleiro cobra; o
 * primeiro toque o desacelera.
 *
 * MAPA (colunas 0–5, linhas 0–6; linha 0 no topo)
 *
 *       0  1  2  3  4  5
 *   0   |  s  t  s  -  u
 *   1   |  |  r  G  u  |
 *   2   r  u  .  r  -  @g
 *   3   .  .  @r t  .  .
 *   4   .  .  @b X  -  t
 *   5   .  .  .  |  .  |
 *   6   T  F  -  A  T  |
 *
 *   `|` reta N–S; `-` reta E–O; `s`/`r`/`t`/`u` curvas rot 1/0/2/3.
 *   `F` é o Y da entrada do vermelho (1,6) rot 2 / arm 1 (LESTE, rápido) — o
 *   default novo; `E` seria o arm 0 (OESTE, túnel). `G` é o Y do verde (3,1)
 *   rot 3 / arm 0 (N, laço de moedas); `A` é o Y do vermelho na saída (3,6)
 *   rot 0 / arm 0 (L, direto). `X` cruzamento (3,4); `T` túneis (0,6)↔(4,6).
 *   Entradas: verde (0,0) SUL, vermelho (1,6) NORTE, azul (5,6) NORTE.
 *   Estações: @r (2,3), @b (2,4), @g (5,2). A curva (5,0) do verde nasce
 *   rot 3 (morte ao norte) e é o CCW do selo (rot 2, desce para @g).
 *
 * ROTAS
 *   vermelho lento (após o 1º toque): (1,6) → braço O → T (0,6) → T (4,6) →
 *     (3,6) → (3,5) → X (3,4) [6] → (3,3) → @r [8].
 *   vermelho rápido (default): (1,6) → braço L → (2,6) → (3,6) → (3,5) →
 *     X (3,4) [5] → (3,3) → @r [7] — mesmo passo do azul no X: colisão.
 *   azul: (5,6) → (5,5) → (5,4) → (4,4) → X (3,4) [5] → @b (2,4) [6].
 *   verde (laço de moedas): (0,0) → (0,1) → (0,2) → (1,2) → (1,1) → (1,0) →
 *     (2,0) → (2,1) → (3,1) → (3,0) → (4,0) → (5,0) → (5,1) → @g (5,2)
 *     [14]. O braço N do Y (3,1) é o inicial; o braço S é o direto.
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1.    alternar (1,6)  Y do vermelho arm 1 (L, rápido) → 0 (O, túnel).
 *   2.    alternar (3,1)  Y do verde arm 0 (N, moedas) → 1 (S, direto).
 *   3–12. passar          azul @b no 6; vermelho @r no 8; verde @g no 12.
 *                         A moeda do X é do azul (5).
 *
 * SOLUÇÃO PERFEITA — 14 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1.    alternar (1,6)  o mesmo freio de mão.
 *   2–11. passar          o verde fica no braço N (laço) e chega a (5,0) no 12.
 *   12.   girar (5,0) CCW curva rot 3 → 2; o verde vira ao sul para @g.
 *   13–14. passar         verde coleta (3,0), (4,0), (5,0), (5,1) e o X (do
 *                         azul) e entrega em @g no 14.
 *   O CCW é o último instante: o verde entra em (5,0) no 12; o CCW no 12 custa
 *   1 toque. O CW (3→0→1→2) precisaria de 3 ações e chegaria tarde — o verde
 *   entraria na curva rot 0/1 e morreria.
 *
 * COLISÃO DUPLA REAL (REQUISITO DO M4) — O DEFAULT
 *   1–4.  passar          vermelho rápido e azul descem; o X é o encontro
 *                         marcado no primeiro quadro.
 *   5.    passar          um único evento de colisão leva os dois (1 vida);
 *                         o verde segue no laço.
 *   6–12. passar          o verde chega a (5,0) no 12.
 *   13.   passar          a curva rot 3 o joga fora do tabuleiro (morte solo,
 *                         1 vida). NENHUMA entrega; `deadEnd` com 1 vida.
 *   O resgate do verde devolve o trem `waiting` na entrada (0,0); a vida NÃO
 *   volta. É o prompt «Resgatar · 8 vs Desistir» do M4 no jogo real.
 *
 * FALHAS / LOST
 *   - SÓ O FREIO (verde esquecido): vermelho/azul entregues; o verde morre em
 *     (5,0) no 13; `won` 2/3, 2 vidas, 4 moedas.
 *   - FREIO TARDE: o vermelho já entrou no Y rápido no passo 2; a colisão do
 *     default acontece (o toque em (1,6) no 2 é bloqueado pela ocupação).
 *   - LOST: freio no 1, girar (4,4) (azul morre no 4), girar (3,5) (vermelho
 *     lento morre no 5) e verde no laço errado no 13 — três eventos solo.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: DUAS disputas — o X (3,4), vermelho no 5 (rápido) ou
 *      6 (lento) e azul no 5; o Y (3,1) do verde, moedas vs direto.
 *   2. JANELA LEGÍVEL: a colisão do default é visível no primeiro quadro (as
 *      duas previsões terminam no X no 5); o freio é a primeira célula do
 *      vermelho. O CCW (5,0) tem a janela 1–12 e é anunciado pela curva torta
 *      no laço de moedas.
 *   3. DOIS ANDARES: segura 12/1; perfeita 14/5, com o laço de moedas
 *      visivelmente mais longo e o CCW.
 *   4. UMA IDEIA: a pressa cobra o preço; o primeiro toque freia.
 *   5. MORTE COM ANTECEDÊNCIA: a colisão do default é anunciada 5 ações antes
 *      (o X está no primeiro quadro); o verde no laço tem a queda na borda
 *      visível (marcador norte em (5,0)) e o CCW a janela toda.
 *   6. EXPERIMENTAR: 3 vidas; o `deadEnd` de 1 vida é o resgate; o `lost` é
 *      uma segunda rota de erro; restart grátis.
 */

import type { Board, Cell, CellPos, Color, LevelLayout, Rotation, Shape } from '../../core/types';
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

function tunnel(exit: CellPos): Cell {
  return { kind: 'fixed', fixed: { kind: 'tunnel', exit } };
}

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

const board: Board = {
  width: 6,
  height: 7,
  rows: [
    [straight(0), curve(1), curve(2), curve(1), straight(1), curve(3)],
    [straight(0), straight(0), curve(0), y(3, 0), EMPTY, straight(0)],
    [curve(0), curve(3), EMPTY, curve(0), straight(1), station(GREEN, GREEN_SHAPE)],
    [EMPTY, EMPTY, station(RED, RED_SHAPE), curve(2), EMPTY, EMPTY],
    [EMPTY, EMPTY, station(BLUE, BLUE_SHAPE), crossing(), straight(1), curve(2)],
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, straight(0)],
    [tunnel({ col: 4, row: 6 }), y(2, 1), straight(1), y(0, 0), tunnel({ col: 0, row: 6 }), straight(0)],
  ],
};

export const R7_LEVEL: LevelLayout = {
  id: 'r7-o-preco-da-pressa',
  name: 'O preço da pressa',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 3, row: 0 },
    { col: 4, row: 0 },
    { col: 5, row: 0 },
    { col: 5, row: 1 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 1, row: 6 }, direction: 'north' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 5, row: 6 }, direction: 'north' },
    },
    {
      id: 'green',
      color: GREEN,
      shape: GREEN_SHAPE,
      entry: { cell: { col: 0, row: 0 }, direction: 'south' },
    },
  ],
};
