/**
 * Fase P0 «Contrato» — RASCUNHO EDITÁVEL.
 *
 * Este é o único dado da fase; o motor não tem nenhum caso especial para ela.
 * O layout definitivo é do E4: editar este arquivo (peças, rotações, entrada,
 * estação, trens) não toca em `src/core`. A única exigência do motor é que
 * `trains[].entry` aponte para a célula `fixed` do tipo `entry` correspondente.
 *
 * Grade 6×6, 1 trem e 1 estação vermelhos (`#d64545`, forma círculo — cor +
 * forma redundantes), peças móveis apenas retas e curvas, resto vazio.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   .  .  .  .  .  .
 *   1   .  .  .  .  @  .
 *   2   .  .  c  |  c  .
 *   3   .  .  |  .  .  .
 *   4   >  |  c  .  .  .
 *   5   .  .  .  .  .  .
 *
 *   `>` entrada leste em (0,4); `@` estação em (4,1); `|` reta; `c` curva.
 *
 * Rascunho jogável: cada peça do caminho começa um quarto de volta atrás da
 * orientação correta. Sequência que entrega (um toque CW em cada, na ordem):
 * (1,4), (2,4), (2,3), (2,2), (3,2), (4,2); depois passar turno duas vezes.
 * O primeiro toque também faz o trem entrar na grade pela entrada (0,4).
 *
 * Caminho: (0,4) → (1,4) → (2,4) → (2,3) → (2,2) → (3,2) → (4,2) → (4,1).
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

/** Cor do par trem/estação do P0 (paleta de protótipo do plano §6). */
const RED: Color = '#d64545';

/** Forma redundante do par trem/estação (acessibilidade, GDD §5). */
const PAIR_SHAPE: Shape = 'circle';

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

/** Estação do par vermelho/círculo. */
function station(): Cell {
  return {
    kind: 'fixed',
    fixed: { kind: 'station', color: RED, shape: PAIR_SHAPE },
  };
}

/** Entrada de locomotiva na borda; `direction` aponta para dentro da grade. */
function entry(direction: Direction): Cell {
  return { kind: 'fixed', fixed: { kind: 'entry', direction } };
}

/** Grade 6×6 do rascunho; `rows[row][col]`. */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, station(), EMPTY],
    [EMPTY, EMPTY, curve(0), straight(0), curve(2), EMPTY],
    [EMPTY, EMPTY, straight(1), EMPTY, EMPTY, EMPTY],
    [entry('east'), straight(0), curve(2), EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
  ],
};

/**
 * Fase P0 como dado puro.
 *
 * O trem começa fora da grade e entra por (0,4) no primeiro passo. A estação
 * (4,1) é interna e aceita o trem pelo lado sul, que é o lado conectado pelo
 * caminho do rascunho.
 */
export const P0_LEVEL: LevelLayout = {
  id: 'p0-contrato',
  name: 'P0 — Contrato',
  board,
  trains: [
    {
      id: 'red',
      color: RED,
      shape: PAIR_SHAPE,
      entry: { col: 0, row: 4 },
    },
  ],
};
