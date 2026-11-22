/**
 * Fase real 4 — «O desvio da vez» (M7, faixa 1: o VALE).
 *
 * 6×7, 3 trens, 3 estações, 3 vidas, fora do tutorial. O vale revisita a ideia
 * da r1 (um trilho compartilhado, cada trem na sua vez) em contexto NOVO: o
 * recurso é o Y (3,2), não uma reta. O vermelho entra pela raiz e sai pelo
 * braço N (inicial); o azul entra pela mesma raiz oito passos depois e precisa
 * do braço S — um toque entre as duas janelas. O azul tem ainda o ramo de
 * moedas depois do Y (o andar perfeito), com um CCW no último instante.
 * A dificuldade NÃO sobe: a janela é de 3 ações e o erro clássico é o Y cedo.
 *
 * MAPA (colunas 0–5, linhas 0–6; linha 0 no topo)
 *
 *       0  1  2  3  4  5
 *   0   v  .  v  @r .  .
 *   1   |  .  |  |  .  .
 *   2   |  .  Y  Y  .  .
 *   3   |  c  X  Y  -  c
 *   4   @g |  |  .  .  @b
 *   5   .  c  X  -  -  c
 *   6   v  -  c  .  .  .
 *
 *   `v` entradas: verde (0,0) SUL, vermelho (2,0) SUL, azul (0,6) LESTE.
 *   `@r` vermelha (3,0); `@b` azul (5,4); `@g` verde (0,4). `Y` (2,2) merge
 *   passivo; `Y` (3,2) o desvio da vez (rot 3, arm 0 N inicial); `Y` (3,3) o
 *   ramo pós-Y do azul (rot 0, arm E direto). `X` (2,3)/(1,3)/(2,5).
 *
 * ROTAS
 *   verde:  (0,0) → (0,1) → (0,2) → (0,3) → @g (0,4) [5]. Referência.
 *   vermelho: (2,0) → (2,1) → (2,2) → Y (3,2) → braço N (3,1) → @r [6].
 *   azul (aproximação): (0,6) → (1,6) → (2,6) → (2,5) → (2,4) → (2,3) →
 *     (2,2) → Y (3,2) [8]. Direto: braço S → (3,3) → arm E → (4,3) →
 *     (5,3) → @b [12]. Ramo de moedas: (3,3) arm W → (2,3) → (1,3) →
 *     (1,4) → (1,5) → (2,5) → (3,5) → (4,5) → (5,5) → @b [18].
 *
 * SOLUÇÃO SEGURA — 12 AÇÕES (3/3, 3 vidas, 3/9 moedas)
 *   1–5.  passar       vermelho cruza o Y no 4 e entrega em @r no 6; verde
 *                      @g no 5.
 *   6.    alternar (3,2)  Y arm 0 (N) → 1 (S). O vermelho já saiu (passo 5);
 *                      o azul só entra no Y no 8.
 *   7–12. passar       azul no Y no 8, arm S; (3,3) no 9, ramo E, @b no 12.
 *   A janela é 6–8 (3 ações). O Y fica bloqueado enquanto o vermelho o ocupa
 *   (passo 4; o toque no 5 é bloqueado); o azul ocupa no 8. Trocar no 1–4
 *   manda o vermelho ao braço S e ele morre na estação do azul (wrongStation
 *   no 8); trocar depois do 8 já é tarde (o azul sai N e morre em @r).
 *
 * SOLUÇÃO PERFEITA — 18 AÇÕES (3/3, 3 vidas, 9/9 moedas)
 *   1–5.  passar
 *   6.    alternar (3,2)  o mesmo Y para o azul.
 *   7.    alternar (3,3)  Y do azul arm 0 (E, direto) → 1 (O, moedas).
 *   8–12. passar
 *   13.   girar (1,5) CCW  curva rot 1 → 0; o azul entra no ramo de moedas.
 *   14–18. passar       o azul coleta (2,3), (1,3), (1,4), (1,5), (2,5),
 *                       (3,5), (4,5), (5,5) e a moeda do Y; @b no 18.
 *   O CCW é o último instante: o azul chega a (1,5) no 13; o CCW no 13 custa
 *   1 toque. O CW (1→2) vira a curva para S–O, que não conecta a entrada
 *   norte — o azul morreria; o CCW é o lance do selo.
 *
 * FALHAS / LOST
 *   - Y CEDO (1–4): o vermelho sai pelo braço S, segue o ramo E do azul e
 *     morre na estação azul (5,4) no 8 — `wrongStation`, 1 vida; azul e verde
 *     entregam; `won` 2/3, 2 vidas.
 *   - Y TARDE (depois do 8): o azul sai pelo braço N e morre em @r no 12
 *     (wrongStation); vermelho/verde vencedores; `won` 2/3.
 *   - AZUL SEM O RAMO: a rota segura; 3/3 com 3/9 moedas (sem selo).
 *   - LOST: verde na entrada (2), vermelho na entrada (2) e azul no braço N
 *     (10) — três mortes independentes, 3 vidas zeradas.
 *
 * CHECKLIST DOS 6 PONTOS
 *   1. RECURSO DISPUTADO: o Y (3,2), vermelho no 4 e azul no 8.
 *   2. JANELA LEGÍVEL: o Y está no horizonte do vermelho desde o primeiro
 *      quadro; a janela de troca é 6–8 (3 ações), com o vermelho saindo no 5.
 *      O CCW do ramo é anunciado no primeiro quadro (o braço O e as moedas)
 *      e o azul chega a (1,5) no 13 — decisão de 2–3 ações à frente.
 *   3. DOIS ANDARES: segura 12 ações/3 moedas; perfeita 18/9, com o ramo
 *      visivelmente mais longo e o CCW.
 *   4. UMA IDEIA: o mesmo desvio serve dois trens em turnos; o vale revisita
 *      a r1 no Y, não na reta.
 *   5. MORTE COM ANTECEDÊNCIA: o primeiro quadro já mostra o azul terminando
 *      na estação do vermelho (cor errada); a curva (1,5) errada e o braço N
 *      são visíveis; as mortes entram na janela, não há emboscada.
 *   6. EXPERIMENTAR: 3 vidas; 2/3 vence; `lost` só com três erros; restart
 *      grátis. O vale não pune mais que a r1: a janela é generosa.
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
    [straight(0), EMPTY, straight(0), station(RED, RED_SHAPE), EMPTY, EMPTY],
    [straight(0), EMPTY, straight(0), straight(0), EMPTY, EMPTY],
    [straight(0), EMPTY, y(1, 1, 'toggle'), y(3, 0, 'toggle'), EMPTY, EMPTY],
    [straight(0), curve(1), crossing(), y(0, 0, 'toggle'), straight(1), curve(2)],
    [station(GREEN, GREEN_SHAPE), straight(0), straight(0), EMPTY, EMPTY, station(BLUE, BLUE_SHAPE)],
    [EMPTY, curve(1), crossing(), straight(1), straight(1), curve(3)],
    [straight(1), straight(1), curve(3), EMPTY, EMPTY, EMPTY],
  ],
};

export const R4_LEVEL: LevelLayout = {
  id: 'r4-o-desvio-da-vez',
  name: 'O desvio da vez',
  tutorial: false,
  board,
  lives: 3,
  coins: [
    { col: 3, row: 2 },
    { col: 2, row: 3 },
    { col: 1, row: 3 },
    { col: 1, row: 4 },
    { col: 1, row: 5 },
    { col: 2, row: 5 },
    { col: 3, row: 5 },
    { col: 4, row: 5 },
    { col: 5, row: 5 },
  ],
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 2, row: 0 }, direction: 'south' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 0, row: 6 }, direction: 'east' },
    },
    {
      id: 'green',
      color: GREEN,
      shape: GREEN_SHAPE,
      entry: { cell: { col: 0, row: 0 }, direction: 'south' },
    },
  ],
};
