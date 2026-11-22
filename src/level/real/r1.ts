/**
 * Fase real 1 — «O trilho da vez» (M7, faixa 1: a mais suave do jogo real).
 *
 * 6×7, 3 trens, 3 estações, 3 vidas, fora do tutorial (loja viva). UMA ideia
 * dominante: o trilho (3,4) é usado pelo azul (passo 5) e pelo vermelho
 * (passo 14) em janelas diferentes — o jogador gira o trilho entre as duas
 * passagens. O nome declara a disputa: o trilho é de quem é a vez.
 *
 * MAPA (colunas 0–5, linhas 0–6; linha 0 no topo)
 *
 *       0  1  2  3  4  5
 *   0   v  .  .  .  .  .
 *   1   c  -  -  -  -  c
 *   2   .  .  c  =  c  @g
 *   3   c  c  @r Y  c  .
 *   4   |  |  @b =  -  c
 *   5   |  |  .  c  c  |
 *   6   |  c  -  -  c  v
 *
 *   `v` entradas: verde (0,0) SUL, vermelho (0,6) NORTE, azul (5,6) NORTE.
 *   `@r` estação vermelha (2,3); `@b` azul (2,4); `@g` verde (5,2).
 *   `Y` desvio do vermelho (3,3) rot 2/arm 0; `=` o trilho disputado (3,4),
 *   reta E–O inicial (azul) que gira para N–S (vermelho). `c` curva; `-` reta
 *   E–O; `|` reta N–S. O `Y` (3,3) é o andar perfeito: braço 0 Oeste = estação
 *   segura; braço 1 Leste = laço de moedas que volta à estação pelo norte.
 *
 * ROTAS
 *   verde:  (0,0) → (0,1) → (1,1) → (2,1) → (3,1) → (4,1) → (5,1) → @g (5,2)
 *           [8]. Trem de referência: entrega cedo e não disputa nada.
 *   azul:   (5,6) → (5,5) → (5,4) → (4,4) → (3,4) → @b (2,4) [6]. Primeira
 *           janela do trilho (passo 5).
 *   vermelho (rota longa, contorno inferior):
 *           (0,6) → (0,5) → (0,4) → (0,3) → (1,3) → (1,4) → (1,5) → (1,6)
 *           → (2,6) → (3,6) → (4,6) → (4,5) → (3,5) → (3,4) → (3,3)
 *           [waist no 14, Y no 15]. Segura: braço 0 Oeste → @r (2,3) [16].
 *           Perfeita: braço 1 Leste → (4,3) → (4,2) → (3,2) → (2,2) → @r
 *           [20].
 *
 * SOLUÇÃO SEGURA — 16 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1–6.  passar       azul no trilho (3,4) no 5; entregue em @b no 6.
 *   7.    girar (3,4)  reta E–O → N–S. O azul já saiu; o vermelho ainda vem.
 *   8–16. passar       verde @g no 8; vermelho cruza (3,4) no 14, Y no 15 e
 *                      entrega em @r no 16. Vitória 3/3; a moeda do trilho é
 *                      do azul (5); o laço leste fica intocado.
 *   A janela do trilho é de 8 ações (7–14): o giro pode ser feito em qualquer
 *   uma delas. O erro clássico é girar antes (1–5): o azul chega ao trilho N–S
 *   e morre; o vermelho ainda entrega — vitória dinâmica 2/3 com 2 vidas.
 *
 * SOLUÇÃO PERFEITA — 20 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1.    alternar (3,3)  Y do vermelho arm 0 (O) → 1 (L) — o laço de moedas.
 *   2–6.  passar
 *   7.    girar (3,4)     a mesma janela segura.
 *   8–20. passar          o vermelho coleta (4,3), (4,2), (3,2), (2,2) e a
 *                         moeda do trilho (azul, passo 5); entrega no 20.
 *   A rota perfeita custa +4 ações e 4 moedas a mais que a segura; o Y é
 *   visível no primeiro quadro com o laço e a estação. Não há contragiro
 *   nesta fase (o lance é o Y; o CCW entra na r2/r3/r4 para o selo).
 *
 * FALHAS / LOST
 *   - AZUL MORTO (giro cedo): azul morre em (3,4) no 5; vermelho e verde
 *     entregam; `won` 2/3, 2 vidas, 1 moeda. A morte do azul é anunciada
 *     desde o primeiro quadro (a previsão azul termina em @b atravessando o
 *     trilho); girar enquanto ele ocupa o trilho é bloqueado (D3).
 *   - VERMELHO MORTO (sem giro): o vermelho chega ao trilho E–O no 14 e
 *     descarrila; azul/verde entregues; `won` 2/3, 2 vidas, 1 moeda.
 *   - LOST: três erros independentes — (1,1) do verde (3), (4,6) do vermelho
 *     (11) e o trilho cedo para o azul (5) — zeram as 3 vidas no 11.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o trilho (3,4), azul no 5 e vermelho no 14.
 *   2. JANELA LEGÍVEL: o trilho fica a 6 células do vermelho quando o giro
 *      entra na janela; a janela de correção é 7–14 (8 ações), com o azul já
 *      entregue. Exige planejar o giro + o Y (2 ações à frente).
 *   3. DOIS ANDARES: segura 16 ações/1 moeda; perfeita 20/5, com o laço
 *      leste visivelmente mais longo e a estação pelo outro lado.
 *   4. UMA IDEIA: o trilho compartilhado, cada trem na sua vez.
 *   5. MORTE COM ANTECEDÊNCIA: a rota do azul ao trilho é visível desde o
 *      primeiro quadro; o vermelho tem o trilho no horizonte a partir do
 *      passo 9 e a janela inteira (8 ações) para corrigir. Nada de emboscada.
 *   6. EXPERIMENTAR: 3 vidas toleram 2/3; restart grátis; `lost` alcançável
 *      só com três erros independentes (documentado acima).
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

function y(rot: Rotation, arm: 0 | 1, next: 'toggle' | 'rotate'): Cell {
  return { kind: 'piece', piece: { kind: 'y', rot, arm, next } };
}

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

const board: Board = {
  width: 6,
  height: 7,
  rows: [
    [straight(0), EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [curve(0), straight(1), straight(1), straight(1), straight(1), curve(2)],
    [EMPTY, EMPTY, curve(1), straight(1), curve(2), station(GREEN, GREEN_SHAPE)],
    [curve(1), curve(2), station(RED, RED_SHAPE), y(2, 0, 'toggle'), curve(3), EMPTY],
    [straight(0), straight(0), station(BLUE, BLUE_SHAPE), straight(1), straight(1), curve(2)],
    [straight(0), straight(0), EMPTY, curve(0), curve(2), straight(0)],
    [straight(0), curve(0), straight(1), straight(1), curve(3), straight(0)],
  ],
};

export const R1_LEVEL: LevelLayout = {
  id: 'r1-o-trilho-da-vez',
  name: 'O trilho da vez',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 4, row: 3 },
    { col: 4, row: 2 },
    { col: 3, row: 2 },
    { col: 2, row: 2 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 0, row: 6 }, direction: 'north' },
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
