/**
 * Fase real 2 — «O cruzamento» (M7, faixa 1: sobe em relação à r1).
 *
 * 6×7, 3 trens, 3 estações, 3 vidas, fora do tutorial. UMA ideia dominante:
 * o X (3,3) é o recurso disputado — o vermelho cruza no 9 (rápido) ou no 11
 * (rota perfeita) e o azul no 10. O azul nasce com a reta (3,1) atravessada;
 * o primeiro conserto é um giro CW. A rota perfeita inverte a ordem (azul
 * primeiro) e leva o vermelho ao laço de moedas com um CCW na curva (1,2): é o
 * primeiro contragiro-lance da faixa.
 *
 * MAPA (colunas 0–5, linhas 0–6; linha 0 no topo)
 *
 *       0  1  2  3  4  5
 *   0   v  .  .  c  c  v
 *   1   |  c  c  =  |  |
 *   2   c  c  |  |  c  c
 *   3   .  |  Y  X  -  @r
 *   4   .  |  |  |  .  @g
 *   5   .  c  c  |  .  |
 *   6   .  .  .  @b  .  v
 *
 *   `v` entradas: vermelho (0,0) SUL, azul (5,0) SUL, verde (5,6) NORTE.
 *   `@r` vermelha (5,3); `@b` azul (3,6); `@g` verde (5,4). `X` cruzamento
 *   (3,3); `Y` (2,3) merge passivo do vermelho (O–N/O–S) e `=` a reta azul
 *   (3,1) que nasce E–O (morta) e vira N–S no conserto. A curva (1,2) do
 *   vermelho: rot 3 (O–N) = rápido ao X (9); rot 2 (S–O) = laço de moedas (11).
 *
 * ROTAS
 *   verde:  (5,6) → (5,5) → @g (5,4) [3]. Referência.
 *   azul:   (5,0) → (5,1) → (5,2) → (4,2) → (4,1) → (4,0) → (3,0) → (3,1)
 *           → (3,2) → X (3,3) → (3,4) → (3,5) → @b [13]. Com a reta (3,1)
 *           consertada, cruza o X no 10.
 *   vermelho rápido: (0,0) → (0,1) → (0,2) → (1,2) → (1,1) → (2,1) →
 *           (2,2) → (2,3) → X (3,3) [9] → (4,3) → @r [11]. Com o Y no braço
 *           0 (N). É a rota segura: cruza o X no 9, um passo antes do azul.
 *   vermelho lento: (1,2) → braço 1 (S) → (1,3) → (1,4) → (1,5) → (2,5) →
 *           (2,4) → (2,3) → X (3,3) [11] → (4,3) → @r [13]. É a rota
 *           perfeita: o azul cruza no 10 e o vermelho no 11; coleta o laço.
 *
 * SOLUÇÃO SEGURA — 13 AÇÕES (3/3, 3 vidas, 1/5 moedas)
 *   1.    girar (3,1) CW  reta E–O → N–S; o azul deixa de morrer no 8.
 *   2–13. passar          vermelho cruza o X no 9 e entrega em @r no 11;
 *                         azul cruza no 10 e entrega em @b no 13. A moeda
 *                         do X (3,3) é do vermelho no 9.
 *   O azul morre em (3,1) no 8 se o jogador não consertar; o vermelho e o
 *   verde ainda entregam (`won` 2/3, 2 vidas, 1 moeda).
 *
 * SOLUÇÃO PERFEITA — 13 AÇÕES (3/3, 3 vidas, 5/5 moedas)
 *   1.    girar (3,1) CW  o mesmo conserto.
 *   2.    passar
 *   3.    girar (1,2) CCW  curva do vermelho rot 3 → 2 (O–N → S–O): o laço.
 *   4–13. passar          o vermelho coleta (1,4), (1,5), (2,5), (2,4) e a
 *                         moeda do X (do azul, passo 10); entrega em @r no
 *                         13. O CCW é o LANCE: o vermelho entra no Y no 4;
 *                         o CCW no 3 custa 1 toque, enquanto o CW custaria 3
 *                         (3→0→1→2) e chegaria depois — o vermelho entra no
 *                         Y com rot 0/1 e morre. O CCW no último instante
 *                         (ação 3) é o que o selo exige; consertar o Y cedo
 *                         com CW também venceria, mas o caminho documentado
 *                         é o lance de 1 toque.
 *   A ordem inverte: azul no X no 10, vermelho no 11. O X é o mesmo, as
 *   janelas são diferentes — e o laço paga mais.
 *
 * FALHAS / LOST
 *   - AZUL SEM CONSERTO: morre em (3,1) no 8; vermelho @r 11, verde @g 3;
 *     `won` 2/3, 2 vidas.
 *   - CW NA CURVA NO ÚLTIMO INSTANTE: o vermelho entra na curva (1,2) no 4 com rot
 *     0/1 (o CW ainda não terminou) e descarrila; azul e verde entregam.
 *   - LOST: três erros independentes — verde na entrada (2), vermelho no Y
 *     (4) e azul sem conserto (8) — zeram as 3 vidas no 8.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o X (3,3), vermelho no 9/11 e azul no 10.
 *   2. JANELA LEGÍVEL: a reta azul é a 8ª célula da rota; o conserto é
 *      anunciado pelo próprio trajeto e pode ser feito em 1–8. O CCW do Y
 *      é anunciado no primeiro quadro (o laço e o braço) com o vermelho a
 *      4 passos; a decisão é de 2–3 ações à frente.
 *   3. DOIS ANDARES: segura 13 ações/1 moeda; perfeita 13/5 com o laço e o
 *      CCW — o mapa mostra o laço mais longo e a estação pelo outro lado.
 *   4. UMA IDEIA: as janelas do cruzamento (quem cruza primeiro).
 *   5. MORTE COM ANTECEDÊNCIA: o azul morto é visível na previsão (a reta
 *      atravessada) com a janela de conserto; o vermelho no Y idem. Nada de
 *      emboscada: o X e as duas rotas estão no primeiro quadro.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 ainda vence; `lost` exige três erros.
 */


import type {
  Board,
  Cell,
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

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

const board: Board = {
  width: 6,
  height: 7,
  rows: [
    [straight(0), EMPTY, EMPTY, curve(1), curve(2), straight(0)],
    [straight(0), curve(1), curve(2), straight(1), straight(0), straight(0)],
    [curve(0), curve(3), straight(0), straight(0), curve(0), curve(3)],
    [EMPTY, straight(0), y(1, 1, 'toggle'), crossing(), straight(1), station(RED, RED_SHAPE)],
    [EMPTY, straight(0), straight(0), straight(0), EMPTY, station(GREEN, GREEN_SHAPE)],
    [EMPTY, curve(0), curve(3), straight(0), EMPTY, straight(0)],
    [EMPTY, EMPTY, EMPTY, station(BLUE, BLUE_SHAPE), EMPTY, straight(0)],
  ],
};

export const R2_LEVEL: LevelLayout = {
  id: 'r2-o-cruzamento',
  name: 'O cruzamento',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 3 },
    { col: 1, row: 4 },
    { col: 1, row: 5 },
    { col: 2, row: 5 },
    { col: 2, row: 4 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 0, row: 0 }, direction: 'south' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 5, row: 0 }, direction: 'south' },
    },
    {
      id: 'green',
      color: GREEN,
      shape: GREEN_SHAPE,
      entry: { cell: { col: 5, row: 6 }, direction: 'north' },
    },
  ],
};
