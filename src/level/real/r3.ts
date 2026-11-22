/**
 * Fase real 3 — «A janela tripla» (M7, faixa 1: o PICO).
 *
 * 6×7, 3 trens, 3 estações, 3 vidas, fora do tutorial. UMA ideia dominante: o
 * X (3,4) tem três janelas — o azul no 5, o vermelho lento (túnel, INICIAL) no
 * 6 e o verde no 13. O jogador escolhe QUEM cede: o vermelho fica no túnel
 * (rota segura, 1 moeda) ou o verde fica no ramo de moedas e paga o CCW
 * (rota perfeita, 5 moedas). O desvio da entrada do vermelho (arm L = rápido)
 * é o ERRO que arma a colisão dupla: o rápido chega ao X no 5, junto do azul.
 *
 * MAPA (colunas 0–5, linhas 0–6; linha 0 no topo)
 *
 *       0  1  2  3  4  5
 *   0   v  c  c  c  -  c
 *   1   |  |  c  Y  .  |
 *   2   c  c  .  c  -  @g
 *   3   .  .  @r c  .  .
 *   4   .  .  @b X  -  c
 *   5   .  .  .  |  .  |
 *   6   T  Y  -  Y  T  v
 *
 *   `v` entradas: verde (0,0) SUL, vermelho (1,6) NORTE, azul (5,6) NORTE.
 *   `@r` vermelha (2,3); `@b` azul (2,4); `@g` verde (5,2). `X` cruzamento
 *   (3,4); `T` túnel (0,6)↔(4,6); `Y` (3,6) merge do vermelho, (3,1) do
 *   verde e (1,6) a entrada-desvio do vermelho (arm O = túnel inicial;
 *   arm L = rápido, o erro). A curva (5,0) do verde nasce rot 3 (morte ao
 *   norte) e é o CCW do selo (rot 2, desce para @g).
 *
 * ROTAS
 *   verde (aproximação longa): (0,0) → (0,1) → (0,2) → (1,2) → (1,1) →
 *     (1,0) → (2,0) → (2,1) → (3,1). No Y (3,1): braço S = direto
 *     (3,2) → (4,2) → @g [12]; braço N = moedas (3,0) → (4,0) → (5,0) →
 *     (5,1) → @g [14]. O braço N é o inicial (errado: a curva (5,0) mata);
 *     o seguro alterna para S; o perfeito deixa N e faz o CCW em (5,0).
 *   vermelho lento (INICIAL, arm O): (1,6) → (0,6) T → (4,6) → (3,6) →
 *     (3,5) → X (3,4) [6] → (3,3) → @r [8].
 *   vermelho rápido (arm L, o erro): (1,6) → (2,6) → (3,6) → (3,5) →
 *     X (3,4) [5] → (3,3) → @r [7] — mesmo passo do azul: colisão.
 *   azul: (5,6) → (5,5) → (5,4) → (4,4) → X (3,4) [5] → @b [6].
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1.    alternar (3,1)  Y do verde arm 0 (N, moedas) → 1 (S, direto).
 *   2–12. passar          azul no X no 5; vermelho lento no 6; verde @g no
 *                         12. A moeda do X é do azul (5).
 *   O vermelho já nasce no túnel (a rota segura padrão). A janela do Y verde
 *   é 1–9 (o verde entra no Y no 9) — 9 ações, generosa; a morte do verde no
 *   ramo errado é anunciada desde o primeiro quadro. O Y do vermelho é a
 *   armadilha: trocá-lo cedo (arm L) é a colisão dupla da seção abaixo.
 *
 * SOLUÇÃO PERFEITA — 14 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1–10. passar          o vermelho fica no túnel; o verde segue no ramo de
 *                         moedas (arm N inicial).
 *   11.   girar (5,0) CCW  curva rot 3 → 2; o verde entra no ramo de moedas.
 *   12–14. passar          verde coleta (3,0), (4,0), (5,0), (5,1), o X (do
 *                         azul) e entrega em @g no 14.
 *   O CCW é o último instante: o verde chega a (5,0) no 12; o CCW no 11 custa
 *   1 toque. O CW (3→0→1→2) precisaria de 3 ações e o verde entraria em
 *   (5,0) com rot 0/1 — morte no norte. O selo exige esse lance.
 *
 * COLISÃO DUPLA REAL (REQUISITO DO M4) — A CHOREOGRAFIA
 *   Sequência de erro: o jogador "acelera" o vermelho no primeiro toque
 *   (arm L) e não conserta o verde. É a leitura de quem acha o túnel lento.
 *   1.    alternar (1,6)  Y do vermelho arm O (lento) → L (rápido). A escolha
 *                        é no primeiro toque: o Y da entrada é a primeira
 *                        célula do trem.
 *   2–5.  passar          vermelho rápido e azul entram no X (3,4) no MESMO
 *                        passo 5: um único evento de colisão, 1 vida (D7).
 *                        Os dois saem do tabuleiro; o verde (só) segue ativo.
 *   6–13. passar          o verde segue no braço N (inicial) e chega a (5,0)
 *                        no 12; a curva rot 3 o joga para fora do tabuleiro
 *                        no 13: uma morte solo, 1 vida.
 *   Resultado: vidas 3 → 2 (colisão) → 1 (verde), NENHUMA entrega,
 *   `deadEnd` com 1 vida no passo 13. É o único estado em que o shell abre o
 *   prompt «Resgatar · 8 vs Desistir» (M4): no P3+ isso era impossível porque
 *   o `lost` disparava antes. O resgate do verde devolve o trem `waiting` na
 *   entrada; a vida NÃO volta (continua 1).
 *
 * FALHAS / LOST
 *   - VERDE NO RAMO ERRADO: morre em (5,0) no 13; o vermelho lento e o azul
 *     entregam; `won` 2/3, 2 vidas, 1 moeda.
 *   - VERMELHO RÁPIDO: colisão com o azul no 5 (1 vida); o verde pode
 *     entregar ou morrer; a vitória dinâmica fecha em 2/3 ou 1/3.
 *   - LOST: azul em (4,4) no 4, vermelho lento em (3,5) no 5 (duas mortes
 *     independentes, 2 vidas) e verde no ramo errado no 13 (a terceira).
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (3,4), azul no 5, vermelho no 6 (ou no 5 no
 *      erro); as janelas diferentes são a disputa.
 *   2. JANELA LEGÍVEL: o X está a 4–5 células dos dois trens no primeiro
 *      quadro; a solução segura tem o Y do verde no 9 (janela 1–9) e o CCW
 *      do ramo no 11–12. Exige planejar 2–3 ações à frente.
 *   3. DOIS ANDARES: segura 12 ações/1 moeda; perfeita 14/5 com o ramo de
 *      moedas e o CCW; a estação do verde é a mesma, o caminho é visivelmente
 *      mais longo.
 *   4. UMA IDEIA: a janela tripla do X (quem cede e quando).
 *   5. MORTE COM ANTECEDÊNCIA: as duas rotas ao X e o X no primeiro quadro;
 *      a morte do verde é uma borda anunciada (marcador norte em (5,0)) — o
 *      jogador vê a curva errada e o ramo; o CCW tem a janela toda.
 *   6. EXPERIMENTAR: 3 vidas; a colisão dupla + morte solo produzem `deadEnd`
 *      com 1 vida (o prompt do resgate) em vez de `lost`; restart grátis.
 */


import type {
  Board,
  Cell,
  CellPos,
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../../core/types';
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
    [straight(0), straight(0), curve(0), y(3, 0, 'toggle'), EMPTY, straight(0)],
    [curve(0), curve(3), EMPTY, curve(0), straight(1), station(GREEN, GREEN_SHAPE)],
    [EMPTY, EMPTY, station(RED, RED_SHAPE), curve(2), EMPTY, EMPTY],
    [EMPTY, EMPTY, station(BLUE, BLUE_SHAPE), crossing(), straight(1), curve(2)],
    [EMPTY, EMPTY, EMPTY, straight(0), EMPTY, straight(0)],
    [tunnel({ col: 4, row: 6 }), y(2, 0, 'toggle'), straight(1), y(0, 0, 'toggle'), tunnel({ col: 0, row: 6 }), straight(0)],
  ],
};

export const R3_LEVEL: LevelLayout = {
  id: 'r3-a-janela-tripla',
  name: 'A janela tripla',
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
