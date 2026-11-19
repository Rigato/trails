/**
 * Fase P3 «Densidade+» — a prova de carga do Q7 (E19, 4 trens).
 *
 * O MESMO tabuleiro de `p3.ts` com um quarto par (laranja/diamante,
 * `#c77d2b`) declarado no nível — `TUNING.palette.pairs` cobre só dois pares
 * default. O quarto trem entra em (3,5) norte, sobe para (3,4) e entrega em
 * (3,3) no passo 3. É deliberadamente um trem curto: o quarto par serve para
 * empurrar a contagem de 3 para 4 previsões/estações/entradas no MESMO
 * tabuleiro; o caos medido vem de 4 previsões simultâneas sobre o X, o túnel,
 * o laço do vermelho e os dois Ys.
 *
 * HIPÓTESE DO Q7 (o que se espera ler)
 *   A 3 trens a fase é legível: a previsão longa do vermelho (que nasce
 *   terminando na montanha) + duas curtas (azul/verde). Com 4, a quarta
 *   previsão curta nasce NO CENTRO (3,3), entre o X (2,2), a montanha (4,3),
 *   o Y vermelho (4,2) e o laço do vermelho — o jogador precisa separar a
 *   linha laranja das outras três no ponto mais congestionado do tabuleiro.
 *   A hipótese é que a quebra acontece na ATENÇÃO ÀS PREVISÕES no centro, não
 *   na contagem de peças: o quarto trem é fácil de entregar, mas lê-lo junto
 *   com os outros três é o custo. Se 4 não quebrar, o próximo passo é dar ao
 *   quarto uma rota longa compartilhando X/túnel, não mais um par curto.
 *
 * SOLUÇÃO 4/4 — 15 PASSOS (3 vidas, 3 moedas)
 *   A mesma do P3: 1. toggle (5,4) verde; 2–8 passar; 9. toggle (4,2)
 *   vermelho; 10–15 passar. O laranja é automático:
 *   (3,5) 1 → (3,4) 2 → @ (3,3) 3. O verde @6, o azul @6, o laranja @3, o
 *   vermelho @15; vitória 4/4, 3 vidas, moedas (2,2), (1,2), (3,2).
 *
 * SACRIFÍCIO / `lost`
 *   A vitória dinâmica permite sacrificar trens: o Y vermelho esquecido
 *   (montanha no 10) e o Y verde esquecido (vazio no 6) continuam 2/3. Com 4
 *   trens e 3 vidas, TRÊS perdas independentes zeram a run — o `lost` fica
 *   alcançável de verdade em conteúdo: azul noExit no 2 + verde sem toggle no
 *   6 + vermelho sem toggle no 10 → lives 0 → `lost` no 10; o laranja já
 *   entregou no 3. A fase é vencível 4/4; o caos é o dado.
 *
 * AS RECEITAS DE COLISÃO do P3 continuam encenáveis neste tabuleiro (X
 * simultâneo e swap dos portais), agora com um quarto trem na leitura. O
 * conteúdo não força colisão: a linha laranja é disjunta das outras três
 * (o teste do nível verifica que as rotas não compartilham célula). A carga
 * do Q7 é atencional, não uma colisão plantada.
 *
 * NOTAS
 *   - O tabuleiro base é exatamente o do P3; o laranja ocupa as células que
 *     estavam vazias em (3,3), (3,4) e (3,5): estação, reta e entrada.
 *   - 4 pares distintos: vermelho/círculo, azul/quadrado, verde/triângulo,
 *     laranja/diamante. Todos entram no passo 1; 3 vidas.
 *   - A fase é a última da cadeia (D10): vitória = «Jogar de novo».
 */

import type {
  Board,
  Cell,
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../core/types';
import { P3_LEVEL } from './p3';

const ORANGE: Color = '#c77d2b';
const ORANGE_SHAPE: Shape = 'diamond';

function straight(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'straight', rot } };
}

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

/**
 * Cópia do tabuleiro P3 com as três células do laranja:
 * (3,3) estação laranja/diamante, (3,4) reta N–S e (3,5) entrada reta N–S.
 */
const board: Board = {
  width: P3_LEVEL.board.width,
  height: P3_LEVEL.board.height,
  rows: P3_LEVEL.board.rows.map((row, rowIndex) => {
    if (rowIndex === 3) {
      const next = [...row];
      next[3] = station(ORANGE, ORANGE_SHAPE);
      return next;
    }
    if (rowIndex === 4) {
      const next = [...row];
      next[3] = straight(0);
      return next;
    }
    if (rowIndex === 5) {
      const next = [...row];
      next[3] = straight(0);
      return next;
    }
    return row;
  }),
};

export const P3_OVERLOAD: LevelLayout = {
  id: 'p3-densidade-plus',
  name: 'P3 — Densidade+',
  board,
  lives: 3,
  coins: P3_LEVEL.coins,
  trains: [
    ...P3_LEVEL.trains,
    {
      id: 'orange',
      color: ORANGE,
      shape: ORANGE_SHAPE,
      entry: { cell: { col: 3, row: 5 }, direction: 'north' },
    },
  ],
};
