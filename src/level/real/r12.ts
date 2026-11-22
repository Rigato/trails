/**
 * Fase real 12 — «A última moeda» (M9, faixa 3: o VALE final).
 *
 * 7×8, 3 trens, 3 estações, 3 vidas, fora do tutorial. A ÚLTIMA fase do plano
 * não é a mais difícil: é a mais NOVA (lição Cut the Rope). Depois do pico de
 * quatro trens, o jogo termina com uma ESCOLHA limpa — o mesmo tabuleiro da r8,
 * todas as peças certas, e uma única moeda que só o cruzamento paga.
 *
 * UMA IDEIA DOMINANTE: a última moeda. O túnel (bifurcação S) entrega em 12
 * ações com 4/5; o cruzamento (bifurcação N + o Y do desvio) entrega em 13 com
 * 5/5. A única moeda que separa os dois andares está em (5,2), na saída sul do
 * Y — o jogador decide se ela vale o cruzamento. É o thesis do jogo (dois
 * andares de sucesso) entregue como despedida, não como prova.
 *
 * MAPA (colunas 0–6, linhas 0–7; linha 0 no topo)
 *
 *       0  1  2  3  4  5  6
 *   0   .  .  .  |  .  @r .
 *   1   .  .  .  C  -  G  .
 *   2   .  .  .  |  .  |  .
 *   3   .  .  .  |  .  |  t
 *   4   -  -  -  X  @g .  |
 *   5   .  .  s  u  .  .  |
 *   6   *  *  G  .  .  .  |
 *   7   .  .  r  T  .  T  u
 *
 *   `*` são as moedas (0,6), (1,6) e (2,6) na entrada/fusão do azul; a quarta
 *   está no X (3,4) e a quinta em (5,2). C (3,1) fusão; G (5,1) desvio
 *   (arm 0 N = vermelho); G (2,6) bifurcação; X (3,4); túneis (3,7)↔(5,7).
 *   Entradas: vermelho (3,0) SUL, azul (0,6) LESTE, verde (0,4) LESTE.
 *   Estações: @r (5,0), @b (5,3), @g (4,4). Nenhuma peça torta.
 *
 * ROTAS
 *   vermelho: (3,0) → C (3,1) → (4,1) → G (5,1) → @r [5].
 *   verde: (0,4) → (1,4) → (2,4) → X (3,4) [4] → @g [5].
 *   azul seguro (túnel): (0,6) → (1,6) → G (2,6) → S → (2,7) → T (3,7) →
 *     T (5,7) → (6,7) [7] → (6,6) → (6,5) → (6,4) → (6,3) [11] → @b [12].
 *   azul perfeito (X): G (2,6) → N → (2,5) → (3,5) → X [6] → (3,3) →
 *     (3,2) → C (3,1) [9] → (4,1) → G (5,1) [11] → S → (5,2) [12] → @b [13].
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (3/3, 3 vidas, 4/5 moedas)
 *   1.    alternar (2,6)  bifurcação para o túnel.
 *   2–12. passar          azul @b no 12. Coleta (0,6), (1,6), (2,6) e o X
 *                         (do verde); a moeda (5,2) fica no tabuleiro.
 *
 * SOLUÇÃO PERFEITA — 13 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1–5.  passar
 *   6.    alternar (5,1)  Y do desvio N → S para o azul (janela 6–11).
 *   7–13. passar          azul coleta (5,2) no 12 e entrega em @b no 13.
 *   A quinta moeda é a única diferença entre os andares; o selo exige o
 *   cruzamento e o toque do Y no tempo.
 *
 * FALHAS / LOST
 *   - SEM O TOGGLE (default): o azul sai N para @r e morre `wrongStation` no
 *     12; `won` 2/3, 2 vidas, 4/5 (a moeda (5,2) não é coletada).
 *   - Y CEDO: o vermelho morre em @b no 6; o azul entrega; `won` 2/3.
 *   - LOST: girar (2,4) (verde no 3), alternar (5,1) cedo (vermelho no 6) e
 *     alternar (5,1) de volta depois do vermelho (o azul sai N e morre no 12)
 *     — três eventos solo zeram as vidas no 12.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (verde 4 / azul 6) e o Y (vermelho 4 / azul 11)
 *      — as duas disputas da faixa, aqui com janelas largas.
 *   2. JANELA LEGÍVEL: o Y tem 6 ações; o X está a 2 passos; tudo no primeiro
 *      quadro; a moeda (5,2) é visível na saída do Y.
 *   3. DOIS ANDARES: segura 12/4; perfeita 13/5 — a diferença é UMA moeda, e
 *      a rota é visivelmente a do cruzamento.
 *   4. UMA IDEIA: a última moeda (a escolha final do jogador).
 *   5. MORTE COM ANTECEDÊNCIA: o braço N do Y leva a @r (cor/forma erradas),
 *      visível desde o início; o X e o Y no primeiro quadro.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 vence; `lost` exige três erros; restart
 *      grátis. O vale final não pune a escolha do túnel.
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
    [EMPTY, EMPTY, curve(1), curve(3), EMPTY, EMPTY, straight(0)],
    [straight(1), straight(1), y(3, 0), EMPTY, EMPTY, EMPTY, straight(0)],
    [EMPTY, EMPTY, curve(0), tunnel({ col: 5, row: 7 }), EMPTY, tunnel({ col: 3, row: 7 }), curve(3)],
  ],
};

export const R12_LEVEL: LevelLayout = {
  id: 'r12-a-ultima-moeda',
  name: 'A última moeda',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 4 },
    { col: 0, row: 6 },
    { col: 1, row: 6 },
    { col: 2, row: 6 },
    { col: 5, row: 2 },
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
