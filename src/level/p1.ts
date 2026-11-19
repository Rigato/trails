/**
 * Fase P1 «Sincronia» — RASCUNHO (o layout definitivo é do E9/SA4).
 *
 * 6×6, 2 trens (vermelho/círculo e azul/quadrado), 2 estações, 3 vidas e
 * 2 Ys. O dado é puro; editar o layout não toca no motor. O E9 expande para
 * 12–20 passos, decoys e colisão possível — este rascunho prova a janela de
 * sincronia e o rearme do Y.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   .  .  .  .  .  .
 *   1   .  @  Y  #  .  .
 *   2   .  .  |  .  c  <
 *   3   >  |  Y  |  c  .
 *   4   .  .  .  .  .  .
 *   5   .  .  .  .  .  .
 *
 *   `>` entrada vermelha leste em (0,3); `<` entrada azul oeste em (5,2).
 *   `@` estação vermelha/círculo em (1,1); `#` estação azul/quadrado em (3,1).
 *   `|` reta; `c` curva; `Y` desvio (merge em (2,3), split em (2,1)).
 *
 * OS DOIS Ys
 *   - Merge (2,3), `y(0, 0, 'toggle')`: talo N, pontas L/O, lado S fechado.
 *     Vermelho entra pela ponta O; azul entra pela ponta L; ambos saem pelo
 *     talo N. Ponta→talo não depende da agulha ativa: o merge é só o ponto de
 *     encontro dos dois ramos.
 *   - Split (2,1), `y(2, 0, 'toggle')`: talo S, ponta O (braço 0) / L (braço
 *     1), lado N fechado. Vermelho entra pelo talo e sai O para @; o toque no
 *     passo 7 troca a agulha para o braço 1, e o azul sai L para #. Primeiro
 *     toque de cada Y = trocar a ponta (ABAB/D8).
 *
 * JANELA DE SINCRONIA (o coração do P1)
 *   vermelho: merge no passo 3, corredor no 4, split no 5, @ no 6.
 *   azul:     merge no passo 5, corredor no 6, split no 7, # no 8.
 *
 *   O split fica ocupado pelo vermelho no passo 5. No início do passo 6 ele
 *   ainda está ocupado (o vermelho só sai durante a ação), então o primeiro
 *   toque livre no Y é o passo 7 — exatamente quando o azul chega. O toggle
 *   do passo 7 rearma a agulha de O para L e libera a entrega azul. Sem ele,
 *   o azul vai para a estação vermelha e descarrila (ver rotas de falha).
 *
 * SOLUÇÃO DOCUMENTADA (8 passos; 2 giros + 1 toggle + 5 passes)
 *   1. girar (1,3)   reta 0 (N–S) → 1 (L–O)
 *   2. girar (2,2)   reta 1 (L–O) → 2 (N–S)
 *   3. passar
 *   4. passar
 *   5. passar
 *   6. passar
 *   7. tocar o Y de (2,1): toggle arm0 (O) → arm1 (L)
 *   8. passar
 *
 *   O primeiro passo também coloca os dois trens nas entradas (§3.5: todos
 *   partem juntos).
 *
 * CAMINHOS
 *   vermelho: (0,3) → (1,3) → merge (2,3) → (2,2) → split (2,1) → @ (1,1)
 *             entregue no passo 6.
 *   azul:     (5,2) → (4,2) → (4,3) → (3,3) → merge (2,3) → (2,2) →
 *             split (2,1) → # (3,1), entregue no passo 8.
 *
 * ROTAS DE FALHA (o experimento Q3/Q4/Q8)
 *   - Sem o toggle do passo 7, o azul entra no split com a agulha O, vai para
 *     a estação vermelha e descarrila por cor. O vermelho já foi entregue →
 *     vitória dinâmica com 1 de 2 (rota sacrificial). O E9 decide se isso é o
 *     «chocha» esperado ou se a fase precisa de mais pressão.
 *   - Errar o giro de (1,3) ou (2,2) descarrila o trem correspondente. Com 2
 *     trens, 3 vidas e no máximo 2 eventos de perda, `lost` é inalcançável no
 *     conteúdo do P1 (plano §2.2); ele é testado no core com 3 trens
 *     fabricados.
 *   - Os dois trens perdidos → deadEnd; 1 entregue + 1 perdido → won.
 */

import type {
  Board,
  Cell,
  Color,
  Direction,
  LevelLayout,
  Rotation,
  Shape,
} from '../core/types';
import { TUNING } from '../config/tuning';

/** Par vermelho/círculo (default do tuning, pairs[0]). */
const RED: Color = TUNING.palette.pairs[0];

/** Par azul/quadrado (default do tuning, pairs[1]). */
const BLUE: Color = TUNING.palette.pairs[1];

const RED_SHAPE: Shape = 'circle';
const BLUE_SHAPE: Shape = 'square';

/** Célula vazia compartilhada — o core nunca muta o dado da fase. */
const EMPTY: Cell = { kind: 'empty' };

/** Célula com reta; `rot` é o quarto de volta CW a partir de norte–sul. */
function straight(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'straight', rot } };
}

/** Célula com curva; `rot` é o quarto de volta CW a partir de norte–leste. */
function curve(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'curve', rot } };
}

/** Célula com Y; `arm` é relativo à peça e `next` começa sempre `toggle`. */
function y(
  rot: Rotation,
  arm: 0 | 1,
  next: 'toggle' | 'rotate',
): Cell {
  return { kind: 'piece', piece: { kind: 'y', rot, arm, next } };
}

/** Estação de um par cor+forma. */
function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

/** Entrada de locomotiva na borda; `direction` aponta para dentro. */
function entry(direction: Direction): Cell {
  return { kind: 'fixed', fixed: { kind: 'entry', direction } };
}

/**
 * Grade 6×6; `rows[row][col]`.
 *
 * Orientações iniciais: (1,3) e (2,2) começam um quarto de volta atrás da
 * orientação correta (os dois giros da solução); (4,2), (4,3) e (3,3) já
 * estão corretas. O merge e o split usam a convenção canônica do Y.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // (1,1) @ vermelho; (2,1) split Y rot 2 / arm 0; (3,1) # azul.
    [
      EMPTY,
      station(RED, RED_SHAPE),
      y(2, 0, 'toggle'),
      station(BLUE, BLUE_SHAPE),
      EMPTY,
      EMPTY,
    ],
    // (2,2) corredor reta 1 (L–O) → 2 (N–S); (4,2) curva E–S correta;
    // (5,2) entrada azul.
    [EMPTY, EMPTY, straight(1), EMPTY, curve(1), entry('west')],
    // (1,3) reta 0 (N–S) → 1 (L–O); (2,3) merge Y rot 0 / arm 0;
    // (3,3) reta E–O; (4,3) curva W–N; (0,3) entrada vermelha.
    [entry('east'), straight(0), y(0, 0, 'toggle'), straight(1), curve(3), EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  ],
};

/**
 * Fase P1 como dado puro.
 *
 * As duas entradas são distintas e os dois trens entram no primeiro passo. A
 * fase tem 3 vidas (D7); a derrota por zerar as vidas é inalcançável com 2
 * trens, mas o estado `lost` existe no contrato e é testado no core.
 */
export const P1_LEVEL: LevelLayout = {
  id: 'p1-sincronia',
  name: 'P1 — Sincronia',
  board,
  lives: 3,
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { col: 0, row: 3 },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { col: 5, row: 2 },
    },
  ],
};
