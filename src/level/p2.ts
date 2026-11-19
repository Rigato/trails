/**
 * Fase P2 «Obstáculos» — layout DEFINITIVO (E14).
 *
 * 6×6, 2 trens (vermelho/círculo e azul/quadrado), 2 estações, 3 vidas e
 * moedas como contador burro (D16). O rascunho do SA1 provava rio/ponte/moedas
 * no motor, mas o rio col. 3 atravessava a grade inteira: os dois trens eram
 * forçados ao mesmo corredor e a fase virava um corredor único. Aqui o rio
 * continua cruzando as rotas, mas termina antes das bordas: a ponte é o
 * desvio central e as pontas do rio são a rota alternativa. As duas entradas
 * ficam em bordas com folga (topo e fundo), então os trens esperando fora da
 * grade são visíveis no primeiro quadro.
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   v  c  c  .  .  .
 *   1   c  c  |  ~  .  @
 *   2   c  c  Y  =  -  Y
 *   3   |  c  c  ~  c  #
 *   4   c  c  c  ~  c  c
 *   5   .  c  Y  -  -  c
 *
 *   `v` entrada vermelha SUL na primeira célula (0,0), reta N–S.
 *   `^` entrada azul NORTE na primeira célula (2,5), Y (D13: a entrada é peça).
 *   `@` estação vermelha/círculo em (5,1); `#` azul/quadrado em (5,3).
 *   `~` água; `=` ponte E–O em (3,2); `|` reta N–S; `-` reta E–O; `c` curva;
 *   `Y` desvio. O topo do rio (3,0) é vazio; o fundo (3,5) é trilho E–O.
 *
 * RIO E PONTE
 *   Banda vertical (3,1),(3,2),(3,3),(3,4): três águas e a ponte (3,2), eixo
 *   E–O (perpendicular à banda). A banda NÃO chega às bordas: (3,0) é vazio e
 *   (3,5) é trilho. A ponte é o cruzamento central; a ponta de baixo é a rota
 *   alternativa (azul leste).
 *
 * AS DUAS ROTAS DO AZUL (a escolha real da fase)
 *   - OESTE/PONTE (oficial): o Y de entrada em (2,5) fica arm 0 (O); o azul
 *     faz o laço Oeste (1,5)→(1,4)→(0,4)→(0,3)→(0,2)→(1,2)→(1,3)→(2,3),
 *     entra no merge (2,2), atravessa a ponte (3,2), segue (4,2) e chega ao
 *     split (5,2) no passo 13. O split precisa de arm 1 (S) para # (5,3) — a
 *     janela do P1, agora cobrada depois da ponte. Custo: 14 passos; coleta 5
 *     moedas (1,1), (3,2), (1,4), (0,4), (1,2).
 *   - LESTE/PONTA (atalho): o primeiro toque no Y de entrada troca para arm 1
 *     (L); o azul contorna a ponta de baixo do rio por (3,5)→(4,5)→(5,5)→
 *     (5,4)→(4,4)→(4,3) e entra em # direto, sem merge/ponte/split. Custo: o
 *     vermelho entrega no passo 11; o azul no 8; a fase fecha em 11 passos e
 *     coleta 3 moedas (1,1), (3,2), (4,4). Menos 3 passos, menos 2 moedas.
 *
 * ROTA OESTE — SOLUÇÃO DOCUMENTADA (14 passos, 2/2, 3 vidas, 5 moedas)
 *   1. rotate (2,3)  curva rot 2 (S–O) → 3 (O–N); conserta a água do azul.
 *                     vermelho em (0,0); azul em (2,5) (os dois entram).
 *   2. passar        vermelho em (0,1); azul em (1,5).
 *   3. passar        vermelho em (1,1) [moeda]; azul em (1,4) [moeda].
 *   4. passar        vermelho em (1,0); azul em (0,4) [moeda].
 *   5. passar        vermelho em (2,0); azul em (0,3).
 *   6. passar        vermelho em (2,1); azul em (0,2).
 *   7. passar        vermelho no merge (2,2); azul em (1,2) [moeda].
 *   8. passar        vermelho na ponte (3,2) [moeda]; azul em (1,3).
 *   9. passar        vermelho em (4,2); azul em (2,3).
 *  10. passar        vermelho no split (5,2); azul no merge (2,2).
 *  11. passar        vermelho em @ (5,1), ENTREGUE; azul na ponte (3,2).
 *  12. passar        azul em (4,2).
 *  13. toggle (5,2)  split arm 0 (N) → 1 (S): rearma para o azul.
 *  14. passar        azul em # (5,3), ENTREGUE; vitória 2/2.
 *
 *   O vermelho é o trilho de referência: a rota dele nasce CORRETA (a primeira
 *   previsão já termina em @, sem hint D6). A dificuldade é do azul. O split é
 *   ocupado pelo vermelho no passo 10; ele só sai no 11; o primeiro toque
 *   livre é depois disso, e o azul chega no 13. A janela de S é de 3 passos
 *   (vermelho 10, azul 13) e a da ponte também (vermelho 8, azul 11).
 *   Um toggle cedo no split (para "ajudar" o azul) manda o vermelho para # no
 *   passo 11 — wrongStation e o vermelho morre; o azul ainda entrega no 14 e
 *   a vitória dinâmica fecha 1/2 com 2 vidas. Esperar é o movimento correto
 *   (Q5): a fase paga a paciência.
 *
 *   Caminhos:
 *   vermelho: (0,0) → (0,1) → (1,1) → (1,0) → (2,0) → (2,1) → merge (2,2)
 *             [7] → ponte (3,2) [8] → (4,2) [9] → split (5,2) [10] →
 *             @ (5,1) [11].
 *   azul:     (2,5) → (1,5) → (1,4) → (0,4) → (0,3) → (0,2) → (1,2) →
 *             (1,3) → (2,3) → merge (2,2) [10] → ponte (3,2) [11] →
 *             (4,2) [12] → split [13] → # (5,3) [14].
 *
 *   ATENÇÃO: os números de passo da tabela são o passo RESOLVIDO (o snapshot
 *   depois da ação). O vermelho entra em (0,0) no passo 1 e chega em @ no 11;
 *   a solução oficial tem 14 ações porque o azul chega ao split no 13 e a #
 *   no 14. O primeiro toque é a rotação (2,3); o resto é espera.
 *
 *   Custos comparados (a escolha):
 *   rota oeste/ponte: 14 ações, 5 moedas, exige a rotação (2,3) + o rearme do
 *   split; a ponte é o cruzamento central e a moeda da ponte é do vermelho.
 *   rota leste/ponta: 11 ações, 3 moedas, exige só o toggle da entrada; o azul
 *   contorna a água pela ponta de baixo (3,5), sem merge/ponte/split.
 *
 * FALHAS E SACRIFÍCIO
 *   - ÁGUA (azul, ignorar o desvio): sem a rotação (2,3), o azul entra em
 *     (2,3) rot 2, desce para (2,4) e a rampa N–L o joga em (3,4) — `water`,
 *     uma vida, no passo 11. A previsão do primeiro quadro já termina na água.
 *     O vermelho entrega no mesmo passo → vitória dinâmica 1/2 com 2 vidas e
 *     as 5 moedas já coletadas (a moeda do azul conta mesmo morrendo, D16).
 *   - ESTAÇÃO ERRADA (azul, ignorar a janela): com a rotação (2,3) mas sem o
 *     toggle do passo 13, o azul entra no split com arm 0 (N), sai para @
 *     (5,1) e descarrila por cor no passo 14 — `won` 1/2, 2 vidas, 5 moedas.
 *     É a rota sacrificial: o vermelho já entregou; o azul morre na estação
 *     errada; a vitória dinâmica (§3.7) ainda fecha.
 *   - TOGGLE CEDO (Q5): tocar o split no passo 1 (ou antes do vermelho sair)
 *     manda o VERMELHO para # no passo 11 — wrongStation; o azul usa o split
 *     já em S e entrega no 14; 1/2 com 2 vidas. A ânsia de "resolver o azul
 *     logo" mata o vermelho; esperar é a jogada certa. É a provocação de Q5.
 *   - ROTA LESTE SEM TOGGLE: sem o toggle da entrada, o azul fica no laço
 *     oeste e o primeiro quadro já termina na água; a rota leste só existe
 *     depois do toggle. O jogador precisa escolher uma das rotas.
 *
 *   Não há colisão no conteúdo: a ponte é usada pelo vermelho (passo 8) e pelo
 *   azul oeste (passo 11), com 3 passos de diferença; o split repete a janela
 *   (vermelho 10, azul 13). A falha da janela é `wrongStation`, não colisão; a
 *   colisão com 2 trens fica fora do conteúdo e o estado `lost` continua
 *   inalcançável (máximo 2 eventos de perda), como o plano §2.2 registra.
 *   `deadEnd` e `won` dinâmico são os fins reais. Com 3 trens o `lost` seria
 *   alcançável, mas a densidade da grade de 6×6 com rio + ponte + duas rotas +
 *   6 moedas não paga: 3 trens aqui viraria o teste de densidade do P3, não o
 *   experimento Q2/Q5.
 *
 *   DECOYS: nenhuma peça fora de rota. As 6 moedas estão em trilho/bridge;
 *   (1,1) é a moeda fácil do vermelho (exceção), (3,2) é a moeda da ponte,
 *   (1,4)/(0,4)/(1,2) pagam o laço oeste e (4,4) paga o atalho leste.
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

const RED: Color = TUNING.palette.pairs[0];
const BLUE: Color = TUNING.palette.pairs[1];

const RED_SHAPE: Shape = 'circle';
const BLUE_SHAPE: Shape = 'square';

const EMPTY: Cell = { kind: 'empty' };

function straight(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'straight', rot } };
}

function curve(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'curve', rot } };
}

function y(
  rot: Rotation,
  arm: 0 | 1,
  next: 'toggle' | 'rotate',
): Cell {
  return { kind: 'piece', piece: { kind: 'y', rot, arm, next } };
}

function station(color: Color, shape: Shape): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

function river(): Cell {
  return { kind: 'fixed', fixed: { kind: 'river' } };
}

function bridge(axis: 'east-west' | 'north-south'): Cell {
  return { kind: 'fixed', fixed: { kind: 'bridge', axis } };
}

/** Entrada off-board (D13): a primeira célula é uma peça comum. */
function entry(cell: { col: number; row: number }, direction: Direction) {
  return { cell, direction };
}

const board: Board = {
  width: 6,
  height: 6,
  rows: [
    // Entrada vermelha no topo; laço superior do vermelho. Topo do rio vazio.
    [straight(0), curve(1), curve(2), EMPTY, EMPTY, EMPTY],
    // Vermelho: (0,1) curva S–L; (1,1) curva O–N; (2,1) reta N–S; @ (5,1).
    [curve(0), curve(3), straight(0), river(), EMPTY, station(RED, RED_SHAPE)],
    // Azul oeste: (0,2) curva S–L, (1,2) curva S–O; merge (2,2);
    // ponte (3,2); (4,2) reta E–O; split (5,2).
    [curve(1), curve(2), y(1, 0, 'toggle'), bridge('east-west'), straight(1), y(3, 0, 'toggle')],
    // Azul oeste: (0,3) reta N–S, (1,3) curva N–L, (2,3) curva O–N inicial
    // rot 2; atalho leste: (4,3) curva S–L; # (5,3).
    [straight(0), curve(0), curve(2), river(), curve(1), station(BLUE, BLUE_SHAPE)],
    // Azul oeste: (0,4) curva L–N, (1,4) curva S–O; rampa (2,4) N–L;
    // atalho leste: (4,4) curva L–N, (5,4) curva S–O.
    [curve(0), curve(2), curve(0), river(), curve(0), curve(2)],
    // Azul oeste: (1,5) curva O–N; Y de entrada (2,5) talo S / braços O–L;
    // atalho leste: (3,5) e (4,5) retas E–O; (5,5) curva O–N.
    [EMPTY, curve(0), y(2, 0, 'toggle'), straight(1), straight(1), curve(3)],
  ],
};

export const P2_LEVEL: LevelLayout = {
  id: 'p2-obstaculos',
  name: 'P2 — Obstáculos',
  board,
  lives: 3,
  coins: [
    { col: 1, row: 1 },
    { col: 3, row: 2 },
    { col: 1, row: 4 },
    { col: 0, row: 4 },
    { col: 1, row: 2 },
    { col: 4, row: 4 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: entry({ col: 0, row: 0 }, 'south'),
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: entry({ col: 2, row: 5 }, 'north'),
    },
  ],
};
