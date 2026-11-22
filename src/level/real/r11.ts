/**
 * Fase real 11 — «A mesa cheia» (M9, faixa 3: o PICO do jogo — Q7, 4 trens).
 *
 * 7×8, 4 trens, 4 estações, 3 vidas, fora do tutorial. É a prova do Q7 como
 * CONTEÚDO: quatro previsões no mesmo tabuleiro, com a gramática da faixa 2.
 * A quarta linha é o laranja/diamante, curto e separado na borda esquerda —
 * entra em (0,0), desce dois trilhos e entrega em (0,3) no passo 4. A herança
 * do `p3-overload` é essa: o quarto trem é curto e legível; o custo é
 * atencional, não uma colisão plantada. As três rotas principais são as da
 * r5/r8: o X (3,4), o Y do desvio (5,1) e o túnel (3,7)↔(5,7).
 *
 * LEGÍVEL POR CONSTRUÇÃO (E19):
 *   - entradas separadas: vermelho (3,0) SUL, azul (0,6) LESTE, verde (0,4)
 *     LESTE, laranja (0,0) SUL;
 *   - janelas espaçadas: verde no X no 4, azul no 6; vermelho no Y no 4, azul
 *     no 11; laranja entrega no 4, sem disputa;
 *   - os Ys não nascem em braço fatal: o Y (5,1) nasce no braço do vermelho
 *     (N, estação correta); o da bifurcação (2,6) nasce no braço do X, que é
 *     viável com o toggle do Y; nenhum default é morte forçada.
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   |  .  .  |  .  @r .
 *   1   |  .  .  C  -  G  .
 *   2   |  .  .  |  .  |  .
 *   3   @l .  .  |  .  @b t
 *   4   -  -  -  X  @g .  |
 *   5   .  .  s  u  .  .  |
 *   6   -  -  G  .  .  .  |
 *   7   .  .  r  T  .  T  u
 *
 *   `@l` é a estação laranja (0,3); a linha laranja é (0,0) → (0,1) → (0,2)
 *   → @l. O resto é o tabuleiro da r8: C (3,1) fusão, G (5,1) desvio,
 *   G (2,6) bifurcação, X (3,4), túneis (3,7)↔(5,7), @r (5,0), @b (5,3),
 *   @g (4,4). Peças todas na orientação certa: a fase não tem conserto
 *   obrigatório; o custo é ler quatro linhas e escolher o andar.
 *
 * ROTAS
 *   laranja: (0,0) → (0,1) → (0,2) → @l (0,3) [4].
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r [5].
 *   verde: (0,4) → (1,4) → (2,4) → X (3,4) [4] → @g [5].
 *   azul seguro: (0,6) → (1,6) → G (2,6) → S → (2,7) → T (3,7) → T (5,7) →
 *     (6,7) [7] → (6,6) → (6,5) → (6,4) → (6,3) [11] → @b [12].
 *   azul perfeito: G (2,6) → N → (2,5) → (3,5) → X [6] → (3,3) → (3,2) →
 *     C (3,1) [9] → (4,1) → G (5,1) [11] → S → @b [13].
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (4/4, 3 vidas, 3/7 moedas)
 *   1.    alternar (2,6)  bifurcação para o túnel.
 *   2–12. passar          laranja @l no 4; vermelho/verde no 5; azul no 12.
 *
 * SOLUÇÃO PERFEITA — 13 AÇÕES (4/4, 3 vidas, 7/7 moedas)
 *   1–5.  passar
 *   6.    alternar (5,1)  Y do desvio N → S para o azul (janela 6–11).
 *   7–13. passar          azul coleta (2,5), (3,5), X, (3,3), (3,2); o laranja
 *                         já coletou (0,1) e (0,2); entrega em @b no 13.
 *   As 7 moedas: 2 na linha laranja (automáticas), 2 na aproximação do X,
 *   o X (verde) e 2 na saída do Y.
 *
 * FALHAS / LOST
 *   - SEM O TOGGLE (default): o azul sai N para @r e morre `wrongStation` no
 *     12; laranja/vermelho/verde entregues; `won` 3/4, 2 vidas, 7 moedas.
 *   - TÚNEL SEM O Y? O túnel não usa o Y; o azul entrega. O erro clássico é o
 *     Y, não o túnel.
 *   - LOST: girar (2,4) (verde no 3), alternar (5,1) cedo (vermelho no 6) e
 *     girar (2,5) (azul no 4) — três eventos solo zeram as vidas no 6, mesmo
 *     com o laranja já entregue (D11).
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (verde 4 / azul 6) e o Y (vermelho 4 / azul 11)
 *      — duas disputas espaçadas; o laranja é uma linha separada.
 *   2. JANELA LEGÍVEL: quatro previsões no primeiro quadro; a do laranja é
 *      curta e isolada na borda; o X e o Y têm 2 e 6 ações de janela.
 *   3. DOIS ANDARES: segura 12/3; perfeita 13/7, com o X/D e as duas moedas
 *      da saída do Y.
 *   4. UMA IDEIA: a mesa cheia — quatro linhas lidas em camadas.
 *   5. MORTE COM ANTECEDÊNCIA: o braço N do Y leva a @r (cor/forma erradas),
 *      visível desde o primeiro quadro; nenhum default é morte forçada.
 *   6. EXPERIMENTAR: 3 vidas; 3/4 ainda vence (o laranja e os outros dois);
 *      `lost` exige três erros; o Q7 é vencível 4/4 com um toque.
 */

import type { Board, Cell, Color, LevelLayout, Rotation, Shape } from '../../core/types';
import { TUNING } from '../../config/tuning';

const RED: Color = TUNING.palette.pairs[0];
const BLUE: Color = TUNING.palette.pairs[1];
const GREEN: Color = '#3f8f5f';
const ORANGE: Color = '#c77d2b';

const RED_SHAPE: Shape = 'circle';
const BLUE_SHAPE: Shape = 'square';
const GREEN_SHAPE: Shape = 'triangle';
const ORANGE_SHAPE: Shape = 'diamond';

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
    [straight(0), EMPTY, EMPTY, straight(0), EMPTY, station(RED, RED_SHAPE), EMPTY],
    [straight(0), EMPTY, EMPTY, y(1, 0), straight(1), y(3, 0), EMPTY],
    [straight(0), EMPTY, EMPTY, straight(0), EMPTY, straight(0), EMPTY],
    [station(ORANGE, ORANGE_SHAPE), EMPTY, EMPTY, straight(0), EMPTY, station(BLUE, BLUE_SHAPE), curve(2)],
    [straight(1), straight(1), straight(1), crossing(), station(GREEN, GREEN_SHAPE), EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(1), curve(3), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(3)],
  ],
};

export const R11_LEVEL: LevelLayout = {
  id: 'r11-a-mesa-cheia',
  name: 'A mesa cheia',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 2, row: 5 },
    { col: 3, row: 5 },
    { col: 3, row: 3 },
    { col: 3, row: 2 },
    { col: 0, row: 1 },
    { col: 0, row: 2 },
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
    {
      id: 'orange',
      color: ORANGE,
      shape: ORANGE_SHAPE,
      entry: { cell: { col: 0, row: 0 }, direction: 'south' },
    },
  ],
};
