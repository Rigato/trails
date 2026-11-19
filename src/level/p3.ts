/**
 * Fase P3 «Densidade» — RASCUNHO (E16).
 *
 * ATENÇÃO: layout RASCUNHO para validar túnel/cruzamento/montanha no motor e
 * destravar o render (E17). O layout definitivo é do E19/SA4 e pode mudar
 * peças, coordenadas e solução sem tocar no core.
 *
 * 6×6, 3 trens, 3 vidas. O terceiro par é declarado no nível (verde/triângulo,
 * `#3f8f5f`) porque `TUNING.palette.pairs` tem só os dois pares default; o
 * vermelho e o azul usam os pares do tuning.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   >  c  v  .  .  .
 *   1   .  |  |  .  @  .
 *   2   .  c  X  -  Y  .
 *   3   .  .  |  .  M  #
 *   4   >  T  |  .  T  Y
 *   5   .  .  #  .  .  .
 *
 *   `>` entradas vermelha em (0,0) L e verde em (0,4) L; `v` entrada azul em
 *   (2,0) S. `@` estação vermelha/círculo em (4,1); `#` azul/quadrado em
 *   (2,5); `#` verde/triângulo em (5,3). `X` cruzamento em (2,2); `T` portais
 *   do túnel (1,4)↔(4,4); `M` montanha em (4,3); `Y` desvios em (4,2) e
 *   (5,4); `|` reta N–S; `-` reta E–O; `c` curva.
 *
 * TÚNEL
 *   Par horizontal alinhado (1,4)↔(4,4). O verde entra em (1,4) no passo 2,
 *   fica no portal, atravessa para (4,4) no passo 3 preservando a direção
 *   leste e sai para (5,4) no passo 4. A travessia custa um passo; o portal
 *   não é estação nem zona segura.
 *
 * CRUZAMENTO
 *   (2,2), canais N–S (azul) e E–O (vermelho), sem ação. O azul cruza no
 *   passo 3; o vermelho no passo 5. A janela de 2 passos é folgada no rascunho
 *   (E19 aperta/expõe a colisão simultânea).
 *
 * MONTANHA
 *   (4,3), logo ao sul do Y vermelho (4,2). É o atalho tentador: com o braço
 *   sul ativo, o vermelho sai do Y direto na montanha no passo 8 e descarrila
 *   com `reason:'mountain'`; o braço norte leva a @ (4,1).
 *
 * MOEDAS
 *   (1,2) na curva vermelha e (2,2) NO CRUZAMENTO — «perto do risco». O azul
 *   coleta a do cruzamento no passo 3; o vermelho coleta a da curva no 4.
 *   Contador burro, sem fórmula (D16).
 *
 * SOLUÇÃO DOCUMENTADA — 8 PASSOS (3/3, 3 vidas, 2 moedas)
 *   1. toggle (5,4)  Y verde arm 1→0 (S→N); os três trens entram.
 *   2. toggle (4,2)  Y vermelho arm 1→0 (S→N).
 *   3. passar        vermelho (1,1); azul no cruzamento (2,2) [moeda];
 *                    verde atravessa (1,4)→(4,4).
 *   4. passar        vermelho (1,2) [moeda]; azul (2,3); verde em (5,4).
 *   5. passar        vermelho no cruzamento (2,2); azul (2,4);
 *                    verde em @verde (5,3), ENTREGUE.
 *   6. passar        vermelho (3,2); azul em @azul (2,5), ENTREGUE.
 *   7. passar        vermelho no Y (4,2).
 *   8. passar        vermelho em @vermelho (4,1), ENTREGUE; vitória 3/3.
 *
 *   Caminhos:
 *   vermelho: (0,0) → (1,0) → (1,1) → (1,2) → X (2,2) [5] → (3,2) →
 *             Y (4,2) [7] → @ (4,1) [8].
 *   azul:     (2,0) → (2,1) → X (2,2) [3] → (2,3) → (2,4) → @ (2,5) [6].
 *   verde:    (0,4) → T (1,4) [2] → T (4,4) [3] → Y (5,4) [4] → @ (5,3) [5].
 *
 * ROTAS DE FALHA
 *   - MONTANHA (jogável): não fazer o toggle do Y vermelho (ou deixá-lo no
 *     braço S). No passo 7 o vermelho entra no Y com arm S; no 8 sai para
 *     (4,3) e descarrila `mountain` (1 vida). Azul/verde já entregues →
 *     vitória dinâmica 2/3 com 2 vidas.
 *   - CRUZAMENTO (simultâneo): o caso §3.10 é coberto no core com um
 *     cruzamento real (dois trens na mesma célula no mesmo passo → colisão
 *     geral, 1 vida). Para o E17 encenar no render: estado fabricado com um
 *     trem em (1,2) vindo do norte (indo S; a curva sai para L) e outro em
 *     (2,1) indo S, ambos com destino (2,2) no mesmo passo. No rascunho a
 *     janela é folgada; o E19 aperta a rota.
 *   - TÚNEL (sentidos opostos): o caso §3.10 é coberto no core com o par real
 *     (dois trens em portais opostos trocam A↔B no mesmo passo → swap →
 *     colisão). Para o E17: trem A no portal (1,4) indo L e B no portal
 *     (4,4) indo O, ambos atravessando no mesmo passo. O rascunho usa o túnel
 *     só no sentido verde; o E19 pode criar a segunda entrada.
 *   - Y VERDE ESQUECIDO: sem o toggle (5,4), o verde sai do Y para o sul
 *     (5,5), célula vazia, e descarrila `noExit` no passo 5.
 *
 * NOTAS
 *   - O rascunho exercita o fluxo completo dos três elementos: o verde
 *     atravessa o túnel, o azul e o vermelho cruzam em X em passos diferentes
 *     e o vermelho tem a montanha como atalho fatal. As colisões de túnel e
 *     cruzamento ficam no core (E16) até o E19 desenhar as janelas da fase
 *     definitiva.
 *   - 3 vidas (D7). O E16 prova `lost` com 3 trens/3 perdas fabricadas; o E19
 *     desenha a fase que torna o estado possível em conteúdo, sem torná-lo
 *     provável.
 *   - O tabuleiro tem 13 peças móveis (2 Ys, 1 cruzamento, 8 retas e 2
 *     curvas), 2 portais de túnel, 1 montanha, 3 estações e 2 moedas.
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
 * Os dois Ys nascem com o braço S (arm 1) e a solução troca para N no primeiro
 * e no segundo passo. As demais peças já nascem alinhadas: o rascunho foca na
 * leitura dos três elementos novos, não em acumular giros.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    // Vermelho: (0,0) reta E–O de entrada, (1,0) curva L→S.
    // Azul: (2,0) reta N–S de entrada.
    [straight(1), curve(2), straight(0), EMPTY, EMPTY, EMPTY],
    // Vermelho: (1,1) reta N–S. Azul: (2,1) reta N–S. @ vermelho (4,1).
    [EMPTY, straight(0), straight(0), EMPTY, station(RED, RED_SHAPE), EMPTY],
    // Vermelho: (1,2) curva S→L com moeda; X cruzamento (2,2) com moeda;
    // (3,2) reta E–O; (4,2) Y vermelho rot 3 / arm 1 (S) inicial.
    [EMPTY, curve(0), crossing(), straight(1), y(3, 1, 'toggle'), EMPTY],
    // Azul: (2,3) reta N–S. Montanha (4,3). @ verde/triângulo (5,3).
    [EMPTY, EMPTY, straight(0), EMPTY, mountain(), station(GREEN, GREEN_SHAPE)],
    // Verde: (0,4) reta E–O de entrada; T (1,4)↔(4,4); azul (2,4) reta;
    // (5,4) Y verde rot 3 / arm 1 (S) inicial.
    [straight(1), tunnel({ col: 4, row: 4 }), straight(0), EMPTY, tunnel({ col: 1, row: 4 }), y(3, 1, 'toggle')],
    // Azul: @ (2,5). O braço S do Y verde cai em (5,5), vazio (falha noExit).
    [EMPTY, EMPTY, station(BLUE, BLUE_SHAPE), EMPTY, EMPTY, EMPTY],
  ],
};

/**
 * Fase P3 «Densidade» como dado puro (RASCUNHO).
 *
 * Entradas: vermelho (0,0)/L, azul (2,0)/S, verde (0,4)/L. O túnel liga os
 * dois lados da linha 4; o cruzamento é o encontro das rotas vermelha (E–O) e
 * azul (N–S); a montanha bloqueia o braço sul do Y vermelho.
 */
export const P3_DRAFT: LevelLayout = {
  id: 'p3-densidade-rascunho',
  name: 'P3 — Densidade (rascunho)',
  board,
  lives: 3,
  coins: [
    { col: 1, row: 2 },
    { col: 2, row: 2 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 0, row: 0 }, direction: 'east' },
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
      entry: { cell: { col: 0, row: 4 }, direction: 'east' },
    },
  ],
};
