/**
 * Fase P0 «Contrato» — layout DEFINITIVO (E4).
 *
 * Este é o único dado da fase; o motor não tem nenhum caso especial para ela.
 * Editar este arquivo (peças, rotações, entrada, estação, trens) não toca em
 * `src/core`. A única exigência do motor é que `trains[].entry` aponte para a
 * célula `fixed` do tipo `entry` correspondente.
 *
 * GRADE 6×6 — 1 trem, 1 estação, 1 entrada, 10 peças móveis (8 na solução,
 * 2 decorativas isoladas), resto vazio. Trem e estação vermelhos (`#d64545`,
 * forma círculo — cor + forma redundantes). Peças móveis apenas retas e curvas.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   .  .  .  .  .  .
 *   1   >  |  c  .  c  @
 *   2   .  .  |  .  |  .
 *   3   .  .  c  |  c  .
 *   4   .  .  .  .  .  .
 *   5   .  |  .  c  .  .
 *
 *   `>` entrada leste em (0,1); `@` estação em (5,1); `|` reta; `c` curva.
 *
 * LEITURA DO PRIMEIRO QUADRO (wingdings/D6, sem texto)
 *   O trem espera na entrada (0,1) apontando para leste. A previsão pontilhada
 *   anda uma célula e MORRE DENTRO da reta (1,1), que começa vertical (N–S):
 *   é exatamente essa peça que pede o primeiro giro. O halo do D6 pulsa nela
 *   até a primeira ação válida do jogador.
 *
 * TUTORIAL DISTRIBUIDO — a solução é 1 giro CW por peça, na ordem em que o
 * trem chega. Cada giro revela o próximo problema pela previsão (o traço muda
 * de destino imediatamente); nada é dado pronto no primeiro olhar. As curvas
 * também começam um quarto de volta atrás: duas delas mandam a previsão para o
 * lado errado (oeste em (2,3), sul em (4,3)) antes do giro — o jogador aprende
 * que o trilho escolhe a rota, não só que ele a bloqueia.
 *
 * SEQUÊNCIA QUE ENTREGA (10 passos; 8 giros CW + 2 «passar turno»):
 *   1. (1,1)   2. (2,1)   3. (2,2)   4. (2,3)   5. (3,3)
 *   6. (4,3)   7. (4,2)   8. (4,1)   9. passar  10. passar
 *
 *   O primeiro toque também faz o trem entrar na grade pela entrada (0,1).
 *   Rota: (0,1) → (1,1) → (2,1) → (2,2) → (2,3) → (3,3) → (4,3) → (4,2) →
 *   (4,1) → estação (5,1).
 *
 *   Fim de cada passo (o que a previsão aponta — instrumento do orquestrador):
 *   passo 0: sem saída em (1,1)      passo 5: sem saída em (4,4) [rota errada]
 *   passo 1: sem saída em (2,1)      passo 6: sem saída em (4,2)
 *   passo 2: sem saída em (2,2)      passo 7: sem saída em (4,1)
 *   passo 3: sem saída em (1,3) [rota errada]   passo 8: estação (5,1)
 *   passo 4: sem saída em (3,3)      passo 9: estação (5,1)
 *                                    passo 10: entregue
 *
 * D1 — A FALHA NÃO EXISTE COMO ESTADO/CUSTO
 *   Ignorar a previsão por dois passos seguidos (ex.: «passar turno» duas
 *   vezes) leva o trem à reta (1,1) ainda vertical: ele descarrila, sai do
 *   tabuleiro e o HUD troca para um botão de largura total («Recomeçar»).
 *   Sem vidas, sem derrota, sem penalidade: um toque restaura este layout.
 *
 * DECOYS
 *   (1,5) reta horizontal e (3,5) curva ficam isoladas, fora de qualquer rota
 *   possível. A previsão nunca as toca: elas ensinam «qual peça importa agora»
 *   por contraste, sem criar bifurcação falsa nem caminho alternativo.
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

/**
 * Cor do par trem/estação do P0 — default vivo do tuning (§6, `pairs[0]`).
 * A fase continua sendo o dado; fases futuras declaram as cores dos seus pares.
 */
const RED: Color = TUNING.palette.pairs[0];

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

/**
 * Grade 6×6 definitiva; `rows[row][col]`.
 *
 * As orientações iniciais são a orientação correta MENOS um quarto de volta
 * CW, exceto as duas decoys (que não têm orientação correta). Assim cada peça
 * da solução pede exatamente um toque.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // (1,1) reta vertical  → correta E–O (rot 1). (2,1) curva E–S → W–S (rot 2).
    // (4,1) curva N–E      → S–E (rot 1). (5,1) estação.
    [entry('east'), straight(0), curve(1), EMPTY, curve(0), station()],
    // (2,2) reta E–O       → N–S (rot 0). (4,2) reta E–O → N–S (rot 0).
    [EMPTY, EMPTY, straight(3), EMPTY, straight(3), EMPTY],
    // (2,3) curva O–N      → N–E (rot 0). (3,3) reta vertical → E–O (rot 1).
    // (4,3) curva S–O      → W–N (rot 3).
    [EMPTY, EMPTY, curve(3), straight(0), curve(2), EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // Decoys isolados: reta horizontal em (1,5) e curva em (3,5).
    [EMPTY, straight(1), EMPTY, curve(2), EMPTY, EMPTY],
  ],
};

/**
 * Fase P0 como dado puro.
 *
 * O trem começa fora da grade e entra por (0,1) no primeiro passo. A estação
 * (5,1) é de borda e aceita o trem pelo lado oeste, que é o lado conectado
 * pela curva (4,1) já girada.
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
      entry: { col: 0, row: 1 },
    },
  ],
};
