/**
 * Fase real 5 — «O túnel e o cruzamento» (M9, faixa 2: entrada).
 *
 * 7×8, 3 trens, 3 estações, 3 vidas, fora do tutorial. DUAS disputas
 * entrelaçadas: o X (3,4), onde o verde cruza no 4 e o azul no 6, e o Y (5,1),
 * onde o vermelho sai no 4 e o azul no 11 — a mesma escolha de rota do azul
 * (bifurcação Y (2,6)) decide se ele enfrenta as duas ou passa pelo túnel.
 *
 * UMA IDEIA DOMINANTE: o túnel é a rota segura (1 moeda, 2 toques) e o
 * cruzamento é a rota perfeita (5 moedas, 2 toques) — a bifurcação vende
 * moedas por janela apertada. O nome declara as duas metades: o túnel e o
 * cruzamento.
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   .  .  .  |  .  @r .
 *   1   .  .  .  C  -  G  .
 *   2   .  .  .  |  .  |  .
 *   3   .  .  .  |  .  |  t
 *   4   -  -  -  X  @g .  |
 *   5   .  .  s  r  .  .  |
 *   6   -  -  G  .  .  .  |
 *   7   .  .  r  T  .  T  r
 *
 *   `-` reta E–O; `|` reta N–S; `s`/`r`/`t`/`u` curvas rot 1/0/2/3; `C` Y (3,1)
 *   rot 1 / arm 0 (S) = fusão do vermelho e do azul; `G` Y (5,1) rot 3 /
 *   arm 0 (N) = o desvio disputado; `G` (2,6) é a bifurcação do azul, rot 3 /
 *   arm 0 (N); `X` cruzamento (3,4); `T` túneis (3,7)↔(5,7). Entradas:
 *   vermelho (3,0) SUL, azul (0,6) LESTE, verde (0,4) LESTE. Estações:
 *   @r (5,0), @b (5,3), @g (4,4). `t` (6,3) e `r` (2,7) nascem corretos; `r`
 *   (3,5) e `r` (6,7) nascem tortos (os dois CCW da fase).
 *
 * ROTAS
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r (5,0) [5].
 *   verde:    (0,4) → (1,4) → (2,4) → X (3,4) [4] → @g (4,4) [5].
 *   azul perfeito: (0,6) → (1,6) → G (2,6) [3] → braço N → (2,5) → (3,5) →
 *     X (3,4) [6] → (3,3) → (3,2) → C (3,1) [9] → (4,1) → G (5,1) [11] →
 *     braço S → (5,2) → @b (5,3) [13].
 *   azul seguro: (0,6) → (1,6) → G (2,6) → braço S → (2,7) → T (3,7) →
 *     T (5,7) → (6,7) → (6,6) → (6,5) → (6,4) → (6,3) → @b (5,3) [12].
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1.    alternar (2,6)  bifurcação para o braço S (túnel).
 *   2.    girar (6,7) CCW curva rot 0 → 3; o azul vira ao norte no canto.
 *   3–12. passar          vermelho @r no 5; verde @g no 5; azul @b no 12.
 *   A moeda do X é do verde (4). O azul nunca chega ao X nem ao Y (5,1).
 *
 * SOLUÇÃO PERFEITA — 13 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1.    girar (3,5) CCW  curva rot 0 → 3; o azul sobe para o X.
 *   2–6.  passar
 *   7.    alternar (5,1)   Y do desvio: arm 0 (N, vermelho) → 1 (S, azul).
 *                         O vermelho saiu no 5; o azul entra no Y no 11.
 *   8–13. passar           o azul coleta (2,5), (3,5), X, (3,3), (3,2) e
 *                          entrega em @b no 13.
 *   O CCW de (3,5) tem janela 1–5 (o azul entra na célula no 5); o toggle do
 *   Y tem janela 6–11 (o vermelho ocupa o Y no 4 e sai no 5). O azul cruza o
 *   X no 6, um passo depois do verde (4): a janela do X é o segundo andar.
 *
 * FALHAS / LOST
 *   - SEM O CCW (3,5): o azul morre no 5; vermelho/verde entregues; `won`
 *     2/3 com 2 vidas e 3 moedas (as duas da aproximação contam na morte,
 *     D16, mais a do X).
 *   - Y CEDO (toggle em 1–3): o vermelho sai pelo braço S, chega a @b (5,3)
 *     e morre `wrongStation` no 5/6; o azul entrega; `won` 2/3.
 *   - SEM O TOGGLE (Y em N): o azul sai pelo braço N para @r e morre
 *     `wrongStation` no 12; `won` 2/3 com 2 vidas e 5 moedas (sem selo).
 *   - LOST: girar (2,4) (o verde morre no 3), alternar (5,1) cedo (o vermelho
 *     morre no 6) e deixar o azul no braço N sem o CCW (morre no 5) — três
 *     eventos independentes zeram as vidas no 6.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: DUAS disputas — o X (3,4), verde no 4 e azul no 6,
 *      e o Y (5,1), vermelho no 4 e azul no 11. A bifurcação (2,6) liga as
 *      duas: a rota que enfrenta o X é a mesma que enfrenta o Y.
 *   2. JANELA LEGÍVEL: o X fica a 2–3 células do azul no primeiro quadro; o
 *      Y tem 6 ações de janela (6–11) na rota perfeita e é visível desde o
 *      início. O CCW de (3,5) é anunciado pela curva torta com o azul a 2
 *      células.
 *   3. DOIS ANDARES: segura 12 ações/1 moeda; perfeita 13/5, com o X e o Y
 *      visivelmente no caminho e o túnel mais longo no mapa.
 *   4. UMA IDEIA: o túnel seguro contra o cruzamento premiado.
 *   5. MORTE COM ANTECEDÊNCIA: as duas rotas do azul e o X estão no primeiro
 *      quadro; a curva torta (3,5) e o Y (5,1) são visíveis; a morte do
 *      vermelho por Y cedo é uma estação de cor errada anunciada.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 ainda vence; `lost` exige três erros;
 *      reiniciar é grátis. A bifurcação permite experimentar as duas rotas.
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
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, station(BLUE, BLUE_SHAPE), curve(2)],
    [straight(1), straight(1), straight(1), crossing(), station(GREEN, GREEN_SHAPE), EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(1), curve(0), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(0)],
  ],
};

export const R5_LEVEL: LevelLayout = {
  id: 'r5-o-tunel-e-o-cruzamento',
  name: 'O túnel e o cruzamento',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 2, row: 5 },
    { col: 3, row: 5 },
    { col: 3, row: 3 },
    { col: 3, row: 2 },
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
