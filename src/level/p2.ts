/**
 * Fase P2 «Obstáculos» — RASCUNHO (E11).
 *
 * ATENÇÃO: este layout é RASCUNHO para validar rio/ponte/moedas no motor e
 * destravar o render (E12). O layout definitivo é do E14/SA4 e pode mudar
 * peças, coordenadas e solução sem tocar no core.
 *
 * 6×6, 2 trens (vermelho/círculo e azul/quadrado), 3 vidas. A fase introduz o
 * primeiro elemento que PUNE: um rio vertical na coluna 3, com uma única
 * ponte fixa em (3,2). Quem chega à água descarrila com `reason: 'water'`; a
 * previsão para na água com marcador próprio (E12).
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   .  .  c  ~  .  .
 *   1   >  o  c  ~  .  @
 *   2   .  .  Y  =  -  Y
 *   3   .  c  c  ~  .  #
 *   4   .  o  c  ~  .  .
 *   5   .  c  Y  ~  .  .
 *             ^
 *
 *   `>` marcador vermelho na borda oeste de (0,1); a célula é reta E–O.
 *   `^` marcador azul na borda sul de (2,5); a célula é um Y de entrada.
 *   `@` estação vermelha/círculo em (5,1); `#` azul/quadrado em (5,3).
 *   `o` moeda sobre trilho (reta E–O em (1,1), reta N–S em (1,4)).
 *   `~` rio; `=` ponte fixa E–O em (3,2); `-` reta E–O; `c` curva; `Y` Y.
 *
 * ENTRADAS (modelo off-board)
 *   Vermelho: `{ cell: (0,1), direction: 'east' }`, reta alinhada.
 *   Azul: `{ cell: (2,5), direction: 'north' }`, Y. O trem espera FORA da
 *   grade, abaixo de (2,5), e o primeiro toque pode girar/trocar a peça de
 *   entrada. Aqui a peça de entrada é o próprio risco: com `arm 1` o Y manda
 *   o trem para leste, direto na água em (3,5). O primeiro toque (toggle)
 *   troca para `arm 0` e o azul segue para oeste. A previsão do primeiro
 *   quadro já mostra a água — é o aviso do Pilar 3.
 *
 * RIO E PONTE
 *   Banda vertical: (3,0)..(3,5), única ponte (3,2) com eixo E–O (perpendicular
 *   à banda). A ponte não gira e comporta um trem por vez; o vermelho atravessa
 *   no passo 5 e o azul no 7, sem disputa. A validação do setup aceita esta
 *   banda: componente 4-conexo reto, ≥1 rio, exatamente 1 ponte, eixo
 *   perpendicular.
 *
 * MOEDAS (overlay; contador burro)
 *   (1,1) no corredor vermelho, (1,4) no corredor azul e (3,2) NA PONTE —
 *   «perto do risco». A moeda da ponte é coletada pelo primeiro trem que
 *   atravessa (o vermelho, no passo 5); quando o azul passa no 7 ela já saiu,
 *   então o contador termina em 3, não 4. Sem fórmula, sem sink (D16).
 *
 * SOLUÇÃO DOCUMENTADA — 10 PASSOS (2/2, 3 vidas, 3 moedas)
 *   1. toggle (2,5)   arm 1→0 (E→O); os dois trens entram nas entradas.
 *   2. rotate (2,1)   curva vermelha rot 1→2 (L→S), a tempo do passo 3.
 *   3. rotate (1,3)   curva azul rot 0→1 (S→L), a tempo do passo 4.
 *   4. rotate (4,2)   reta compartilhada rot 0→1 (N–S→E–O).
 *   5. rotate (2,3)   curva azul rot 2→3 (L→N), a tempo do passo 5.
 *   6. passar
 *   7. passar
 *   8. passar         vermelho entrega em @ (5,1).
 *   9. toggle (5,2)   split arm 0→1 (N→S); o azul está em (4,2), célula livre.
 *  10. passar         azul entrega em # (5,3); vitória 2/2.
 *
 *   Fim de cada passo (posições dos trens; o orquestrador lê isto):
 *   passo 0: vermelho waiting (0,1)/L; azul waiting (2,5)/N.
 *            previsão vermelha: sem saída em (2,1); azul: ÁGUA em (3,5).
 *   passo 1: vermelho (0,1); azul (2,5) [Y já em arm 0].
 *   passo 2: vermelho (1,1) [moeda]; azul (1,5).
 *   passo 3: vermelho (2,1); azul (1,4) [moeda].
 *   passo 4: vermelho (2,2) merge; azul (1,3).
 *   passo 5: vermelho (3,2) ponte [moeda]; azul (2,3).
 *   passo 6: vermelho (4,2); azul (2,2) merge.
 *   passo 7: vermelho (5,2) split; azul (3,2) ponte.
 *   passo 8: vermelho @ ENTREGUE; azul (4,2).
 *   passo 9: azul (5,2) split [arm 1].
 *   passo 10: azul # ENTREGUE; vitória 2/2, vidas 3, moedas 3.
 *
 * ROTAS DE FALHA (o que o E12 pode encenar)
 *   - ÁGUA (azul, natural): não fazer o toggle da entrada. O azul entra em
 *     (2,5) com arm 1 e no passo 2 sai para (3,5) — `water`, uma vida. A
 *     previsão do passo 0 já termina na água. Com 3 vidas a run continua e o
 *     vermelho ainda entrega; a vitória é dinâmica (1/2).
 *   - ÁGUA (azul, desvio ignorado): não girar (2,3) de rot 2→3. O azul chega
 *     em (2,3) vindo de oeste, a curva rot 2 manda para o sul (2,4); a rampa
 *     (2,4) rot 0 (N→L) joga o trem em (3,4) — `water`.
 *   - ÁGUA (vermelho, excesso de giro): girar (2,1) DUAS vezes (rot 1→2→3)
 *     antes do passo 3. A rot 3 (L→N) sobe para (2,0); a rampa (2,0) rot 1
 *     (S→L) joga o trem em (3,0) — `water`.
 *   - SEM SAÍDA (vermelho, giro esquecido): (2,1) fica rot 1 (L–S, não aceita
 *     entrada pelo oeste); o trem para em (2,1) com `noExit` no passo 3.
 *   - SEM SAÍDA (azul, giro esquecido): (1,3) fica rot 0 (N–L, não aceita
 *     entrada pelo sul); o trem para em (1,3) com `noExit`.
 *   - ESTAÇÃO ERRADA (split esquecido): sem o toggle do passo 9, o azul sai
 *     do split para o norte e chega em @ (5,1) — `wrongStation`, uma vida;
 *     vermelho já entregue, então a vitória dinâmica ainda fecha 1/2 com 2
 *     vidas. É a rota sacrificial documentada.
 *
 * NOTAS
 *   - As rampas (2,0) e (2,4) são decoys de FALHA, não decoração: só são
 *     alcançadas por giro errado/excessivo e existem para produzir `water`
 *     de forma concreta (E12). Fora dessas rotas, a previsão nunca as toca.
 *   - 3 vidas (D7). Com 2 trens o máximo é 2 eventos de dano, então `lost` é
 *     inalcançável nesta fase; o contrato de `lost` continua testado no core
 *     com 3 trens fabricados. `won`, `deadEnd` e a vitória dinâmica são os
 *     fins reais.
 *   - O tabuleiro tem 13 peças móveis (11 em rotas + 2 rampas de falha), 5
 *     células de rio, 1 ponte e 2 estações.
 */

import type {
  Board,
  Cell,
  Color,
  LevelLayout,
  Rotation,
  Shape,
} from '../core/types';

/** Par vermelho do P0/P1. */
const RED: Color = '#d64545';

/** Par azul do P1. */
const BLUE: Color = '#2f6fb0';

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

/** Célula de água da banda de rio. */
function river(): Cell {
  return { kind: 'fixed', fixed: { kind: 'river' } };
}

/** Célula de ponte fixa; `axis` é o sentido da travessia. */
function bridge(axis: 'east-west' | 'north-south'): Cell {
  return { kind: 'fixed', fixed: { kind: 'bridge', axis } };
}

/**
 * Grade 6×6; `rows[row][col]`.
 *
 * Orientações iniciais = correta menos um quarto de volta CW nas quatro peças
 * que a solução gira; as demais já nascem alinhadas. O Y azul de entrada nasce
 * no braço errado (arm 1 = leste, água); o split nasce no braço do vermelho.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    // (2,0) rampa de falha do vermelho: S→L, deságua em (3,0).
    [EMPTY, EMPTY, curve(1), river(), EMPTY, EMPTY],
    // Vermelho: (0,1) reta E–O de entrada, (1,1) reta E–O com moeda,
    // (2,1) curva inicial rot 1 (L–S) → correta rot 2 (S–O); @ em (5,1).
    [straight(1), straight(1), curve(1), river(), EMPTY, station(RED, RED_SHAPE)],
    // Merge (2,2) talo L / braços N–S; ponte (3,2) E–O; reta (4,2) inicial
    // rot 0 (N–S) → correta rot 1 (E–O); split (5,2) talo O / braços N–S.
    [EMPTY, EMPTY, y(1, 0, 'toggle'), bridge('east-west'), straight(0), y(3, 0, 'toggle')],
    // Azul: (1,3) curva inicial rot 0 (N–L) → correta rot 1 (S–L);
    // (2,3) curva inicial rot 2 (S–O) → correta rot 3 (O–N); # em (5,3).
    [EMPTY, curve(0), curve(2), river(), EMPTY, station(BLUE, BLUE_SHAPE)],
    // Azul: (1,4) reta N–S com moeda; (2,4) rampa de falha N→L, água em (3,4).
    [EMPTY, straight(0), curve(0), river(), EMPTY, EMPTY],
    // Azul: (1,5) curva E→N; (2,5) Y de entrada rot 2 (talo S, braços L/O),
    // inicial arm 1 (LESTE = água) → o primeiro toggle escolhe OESTE.
    [EMPTY, curve(0), y(2, 1, 'toggle'), river(), EMPTY, EMPTY],
  ],
};

/**
 * Fase P2 «Obstáculos» como dado puro (RASCUNHO).
 *
 * O vermelho entra pela borda oeste em (0,1) indo leste; o azul entra pela
 * borda sul em (2,5) subindo. As duas rotas se encontram no merge (2,2),
 * atravessam a única ponte (3,2) e se separam no split (5,2). As entradas são
 * células de trilho comuns (reta e Y), não elementos fixos.
 */
export const P2_DRAFT: LevelLayout = {
  id: 'p2-obstaculos-rascunho',
  name: 'P2 — Obstáculos (rascunho)',
  board,
  lives: 3,
  coins: [
    { col: 1, row: 1 },
    { col: 1, row: 4 },
    { col: 3, row: 2 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 0, row: 1 }, direction: 'east' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 2, row: 5 }, direction: 'north' },
    },
  ],
};
