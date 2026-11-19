/**
 * Fase P3 «Densidade» — layout DEFINITIVO (E19, 3 trens).
 *
 * 6×6, 3 trens, 3 estações, 3 vidas. A sopa mecânica completa: 2 Ys, um par de
 * túneis, um cruzamento, uma montanha e moedas (uma NO cruzamento). O terceiro
 * par (verde/triângulo) é declarado no nível — `TUNING.palette.pairs` tem só os
 * dois pares default. O vermelho/azul usam os pares do tuning.
 *
 * A fase é LEGÍVEL POR CONSTRUÇÃO: um trem tem a rota longa (o vermelho, um
 * laço de 15 passos pelo topo/esquerda) e os outros dois são curtos e
 * separados (azul 6, verde 6). As janelas são reais e espaçadas: o azul cruza
 * o X no passo 3, o vermelho no 7 (4 passos); o verde usa o túnel nos passos
 * 3–4 e o Y verde no 5; o vermelho usa o Y vermelho no 9. O primeiro quadro
 * mostra DUAS previsões terminando em perigo (montanha no vermelho, vazio no
 * verde): são os dois Ys para corrigir. O Y vermelho é a lição da montanha; o
 * Y verde é a lição do braço errado.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   v  .  v  c  -  c
 *   1   |  .  |  c  c  @
 *   2   |  c  X  =  Y  .
 *   3   c  c  |  .  M  #
 *   4   c  T  |  .  T  Y
 *   5   v  .  #  .  .  .
 *
 *   `v` entradas: vermelha em (0,0) SUL, azul em (2,0) SUL, verde em (0,5)
 *   NORTE. `@` vermelha/círculo (5,1); `#` azul/quadrado (2,5); `#` verde/
 *   triângulo (5,3). `X` cruzamento (2,2); `T` túneis (1,4)↔(4,4); `M` montanha
 *   (4,3); `Y` desvios: vermelho em (4,2) rot 3 / arm 1 (S), verde em (5,4)
 *   rot 3 / arm 1 (S). `|` reta N–S; `-` reta E–O; `=` reta E–O; `c` curva.
 *
 * O VERMELHO — laço longo e Y no meio da rota
 *   (0,0) → (0,1) → (0,2) → (0,3) → (1,3) → (1,2) → X (2,2) → (3,2) →
 *   Y (4,2) → (4,1) → (3,1) → (3,0) → (4,0) → (5,0) → @ (5,1) [15].
 *   O Y vermelho é OBRIGATÓRIO: o braço 0 (N) leva a (4,1) e o laço; o braço 1
 *   (S) cai na montanha (4,3). O Y nasce no braço 1 — a primeira previsão do
 *   vermelho termina na montanha. O toque no Y (passo 9 ou antes) conserta.
 *
 * O AZUL
 *   (2,0) → (2,1) → X (2,2) → (2,3) → (2,4) → @ (2,5) [6]. Cruza o X no 3.
 *
 * O VERDE — túnel e Y de estação
 *   (0,5) → (0,4) → T (1,4) → T (4,4) → Y (5,4) → @ (5,3) [6]. O Y verde nasce
 *   arm 1 (S) e o braço S cai em (5,5) vazio; o toque troca para arm 0 (N) e o
 *   verde entrega. O túnel custa a travessia do passo 3→4 (justTunneled).
 *
 * SOLUÇÃO DOCUMENTADA — 15 PASSOS (3/3, 3 vidas, 3 moedas)
 *   1. toggle (5,4)  Y verde arm 1 (S) → 0 (N); os três entram.
 *   2. passar        vermelho (0,1); azul (2,1); verde (0,4).
 *   3. passar        vermelho (0,2); azul NO X (2,2) [moeda]; verde no portal
 *                    (1,4).
 *   4. passar        vermelho (0,3); azul (2,3); verde atravessa → (4,4).
 *   5. passar        vermelho (1,3); azul (2,4); verde no Y (5,4).
 *   6. passar        vermelho (1,2) [moeda]; azul em @ (2,5), ENTREGUE;
 *                    verde em @ (5,3), ENTREGUE.
 *   7. passar        vermelho NO X (2,2).
 *   8. passar        vermelho (3,2) [moeda].
 *   9. toggle (4,2)  Y vermelho arm 1 (S) → 0 (N); o vermelho entra no Y.
 *  10. passar        vermelho (4,1).
 *  11. passar        vermelho (3,1).
 *  12. passar        vermelho (3,0).
 *  13. passar        vermelho (4,0).
 *  14. passar        vermelho (5,0).
 *  15. passar        vermelho em @ (5,1); vitória 3/3.
 *
 *   Janelas: Y verde 1–5 (o verde entra no Y no 5); Y vermelho 1–9 (o vermelho
 *   entra no 9); X azul 3 / vermelho 7 (4 passos); túnel verde 3–4; entregas
 *   em 6/6/15. O vermelho é o único laço longo; a leitura de 3 trens fica
 *   confortável (duas previsões curtas e uma longa).
 *
 *   Por que o toggle vermelho no 9: o Y nasce no braço fatal e o vermelho só
 *   chega nele no 9. O jogador pode consertar antes (o braço fica); a solução
 *   oficial demonstra a janela encadeada — verde cedo, vermelho na boca do Y.
 *   O primeiro quadro já pinta a montanha; corrigir os dois Ys é a leitura.
 *
 * SACRIFÍCIO / FALHAS
 *   - MONTANHA (vermelho, Y esquecido): sem o toggle (4,2), o vermelho entra no
 *     Y com arm 1 (S) no passo 9 e descarrila em (4,3) por `mountain` no passo
 *     10. Azul e verde já entregaram no 6 → `won` dinâmico 2/3 com 2 vidas e as
 *     3 moedas (o vermelho coletou as duas do laço antes de morrer; o azul
 *     coletou a do X). É a rota sacrificial documentada.
 *   - Y VERDE ESQUECIDO: sem o toggle (5,4), o verde sai pelo braço S para
 *     (5,5) vazio no passo 6 → `noExit`, uma vida; o vermelho entrega no 15 e
 *     azul no 6 → `won` 2/3 com 2 vidas e 3 moedas.
 *   - CRUZAMENTO SIMULTÂNEO: receita do §3.10 com o X real da fase — dois trens
 *     na mesma célula do X no mesmo passo → colisão (1 vida, ambos perdem).
 *     A receita fabricada usa o X (2,2) e as cores dos trens da fase.
 *   - TÚNEL EM SENTIDOS OPOSTOS: receita do §3.10 com os portais reais — swap
 *     (1,4)↔(4,4) no mesmo passo → colisão (1 vida, ambos perdem).
 *   - `lost`: com 3 trens e 3 vidas, três perdas independentes zeram a run —
 *     possível em conteúdo (azul noExit no 2 + verde sem toggle no 6 + vermelho
 *     sem toggle no 10 → lives 0 → `lost` no 10). Na Densidade+ o laranja já
 *     entregue não interfere; é o quarto trem que torna o `lost` mais fácil de
 *     encenar.
 *
 * MOEDAS
 *   (1,2) na curva vermelha, (2,2) NO cruzamento (lição Pipe Mania) e (3,2) na
 *   reta antes do Y/montanha — «perto do risco». O azul coleta a do X no 3; o
 *   vermelho as outras no 6 e no 8. Contador burro (D16).
 *
 * NOTAS
 *   - 2 Ys (ambos usados, ambos com braço fatal), 1 X, 1 par de túneis, 1
 *     montanha, 3 estações e 3 moedas. 6×6; todos entram no passo 1; 3 vidas;
 *     sem hint novo (o primeiro quadro termina em estação/montanha/vazio;
 *     `firstHintTarget` é null porque nenhuma previsão para em peça).
 *   - A montanha é alcançável de propósito: só o braço S do Y vermelho leva a
 *     ela. Sem essa rota o fixo seria decoração — a falha da montanha é a
 *     lição de que o Y tem um braço que mata.
 */

import type {
  Board,
  Cell,
  CellPos,
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../core/types';
import { TUNING } from '../config/tuning';

/** Pares default do tuning: vermelho/círculo e azul/quadrado. */
const RED: Color = TUNING.palette.pairs[0];
const BLUE: Color = TUNING.palette.pairs[1];
/** Terceiro par declarado no nível (o tuning só tem dois pares default). */
const GREEN: Color = '#3f8f5f';

const RED_SHAPE: Shape = 'circle';
const BLUE_SHAPE: Shape = 'square';
const GREEN_SHAPE: Shape = 'triangle';

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

/** Cruzamento de dois canais retos (N–S e E–O); peça sem ação. */
function crossing(): Cell {
  return { kind: 'piece', piece: { kind: 'crossing', rot: 0 } };
}

/** Estação de um par cor+forma. */
function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

/** Portal de túnel apontando para o parceiro. */
function tunnel(exit: CellPos): Cell {
  return { kind: 'fixed', fixed: { kind: 'tunnel', exit } };
}

/** Montanha intransponível. */
function mountain(): Cell {
  return { kind: 'fixed', fixed: { kind: 'mountain' } };
}

/**
 * Grade 6×6; `rows[row][col]`.
 *
 * O vermelho nasce com o laço correto, mas com o Y no braço fatal (S); o verde
 * nasce com o Y no braço errado (S); o azul nasce alinhado.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    // Vermelho: (0,0) entrada reta N–S; (3,0) curva S–E do laço;
    // (4,0) reta E–O; (5,0) curva L–S. Azul: (2,0) entrada reta N–S.
    [straight(0), EMPTY, straight(0), curve(1), straight(1), curve(2)],
    // Vermelho: (0,1) reta N–S; (3,1) curva L–N; (4,1) curva S–L; @ (5,1).
    // Azul: (2,1) reta N–S.
    [straight(0), EMPTY, straight(0), curve(0), curve(2), station(RED, RED_SHAPE)],
    // Vermelho: (0,2) reta N–S; (1,2) curva S–L; X (2,2); (3,2) reta E–O;
    // Y vermelho (4,2) rot 3 / arm 1 (S) — arm 0 (N) é a rota, arm 1 = montanha.
    [straight(0), curve(1), crossing(), straight(1), y(3, 1, 'toggle'), EMPTY],
    // Vermelho: (0,3) curva S–L, (1,3) curva L–N; azul (2,3) reta N–S;
    // montanha (4,3); @ verde/triângulo (5,3).
    [curve(0), curve(3), straight(0), EMPTY, mountain(), station(GREEN, GREEN_SHAPE)],
    // Verde: (0,4) curva S–L; T (1,4)↔(4,4); azul (2,4) reta; Y verde (5,4)
    // rot 3 / arm 1 (S) inicial; arm 0 (N) leva a @ (5,3).
    [curve(1), tunnel({ col: 4, row: 4 }), straight(0), EMPTY, tunnel({ col: 1, row: 4 }), y(3, 1, 'toggle')],
    // Verde: (0,5) entrada reta N–S; @ azul (2,5); o braço S do Y verde cai
    // em (5,5) vazio (falha noExit).
    [straight(0), EMPTY, station(BLUE, BLUE_SHAPE), EMPTY, EMPTY, EMPTY],
  ],
};

export const P3_LEVEL: LevelLayout = {
  id: 'p3-densidade',
  name: 'P3 — Densidade',
  board,
  lives: 3,
  coins: [
    { col: 1, row: 2 },
    { col: 2, row: 2 },
    { col: 3, row: 2 },
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
      entry: { cell: { col: 2, row: 0 }, direction: 'south' },
    },
    {
      id: 'green',
      color: GREEN,
      shape: GREEN_SHAPE,
      entry: { cell: { col: 0, row: 5 }, direction: 'north' },
    },
  ],
};

/**
 * Alias de compatibilidade para o teste de feel do E18 (`test/feel/p3-fx.test.ts`),
 * que ainda importa o nome do rascunho. O tabuleiro é o definitivo e os dois
 * portais do túnel continuam em (1,4)↔(4,4); o alias pode ser removido quando o
 * orquestrador atualizar aquele teste para `P3_LEVEL`.
 */
export const P3_DRAFT = P3_LEVEL;
