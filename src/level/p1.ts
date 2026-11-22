/**
 * Fase P1 «Sincronia» — layout DEFINITIVO (E9).
 *
 * 6×6, 2 trens (vermelho/círculo e azul/quadrado), 2 estações, 3 vidas
 * (D7) e 4 Ys. O dado é puro; editar o layout não toca no motor. O rascunho
 * do SA1 entregava em 8 passos e não produzia colisão (os trens andavam em
 * lockstep com gap constante). Este layout existe para o experimento
 * Q3/Q4/Q8: ABAB sob pressão, janela de sincronia e sacrifício.
 *
 * CONTRATO DE SAÍDA (§1 da proposta) — esta fase garante:
 *   1. tocar move o tempo e todos os trens;
 *   2. previsão e horizonte (a morte local é anunciada pela previsão);
 *   3. Y por ABAB e leitura por conexão (o split S e o switch E);
 *   4. seletor de sentido — pulso D24 no botão-ferramenta depois do primeiro
 *      Y e até o primeiro uso; a solução usa UM contragiro;
 *   6. perda tolerada (3 vidas — o sacrifício vence 1/2);
 *   7. reiniciar é grátis (recomeço de 1 toque, sem custo).
 *   (5 — moedas opcionais — fica no P2/P3; esta fase não tem moedas.)
 *
 * Mapa (colunas 0–5, linhas 0–5; linha 0 no topo):
 *
 *       0  1  2  3  4  5
 *   0   .  .  .  .  .  .
 *   1   .  @  Y  #  .  .
 *   2   .  .  |  c  c  .
 *   3   c  c  |  |  |  .
 *   4   |  c  Y  Y  Y  <
 *   5   ^  .  .  c  c  .
 *
 *   `^` marcador de entrada vermelha na borda norte de (0,5); a célula (0,5)
 *   é uma reta N–S alinhada. `<` marcador azul na borda leste de (5,4); a
 *   célula (5,4) é uma reta E–O alinhada. O trem espera FORA da grade e pisa
 *   na primeira célula no passo 1.
 *   `@` estação vermelha/círculo em (1,1); `#` estação azul/quadrado em
 *   (3,1); `|` reta; `c` curva; `Y` desvio.
 *
 * ENTRADA: QUAIS TRILHOS SÃO POSSÍVEIS?
 *   Qualquer peça móvel — reta, curva e Y. O modelo novo aceita qualquer uma;
 *   o desenho da fase decide. As duas entradas usam reta alinhada para
 *   preservar o timeline/window aprovados.
 *
 * OS QUATRO Ys
 *   - S = (2,1), split: rot 1 / arm 1 / next toggle (inicial).
 *     Correto: rot 2 (talo S, braços O/L, lado N fechado). O primeiro toque
 *     troca a ponta (arm 1→0), o segundo gira (rot 1→2) — ABAB. O vermelho
 *     passa no passo 9 com arm 0 (O → @); o azul passa no 11 e precisa de
 *     arm 1 (L → #). Este é O Y DA JANELA: a agulha é rearmada no passo 11.
 *   - M = (2,4), merge vermelho/azul: rot 0 (talo N, braços L/O). O vermelho
 *     entra pelo braço O, o azul pelo braço L; ambos saem pelo talo N. A
 *     agulha de M é indiferente (entrada por braço sempre sai pelo talo).
 *   - m = (3,4), merge dos dois braços do azul: rot 3 (talo O, braços N/S).
 *     O braço longo do azul chega pelo N; o curto pelo S; ambos saem O para M.
 *     Também é indiferente à agulha.
 *   - E = (4,4), switch de comprimento do azul: rot 1 (talo L, braços N/S),
 *     arm 0 (S = atalho) inicial. Um toque (arm 0→1) escolhe o braço N, o
 *     caminho LONGO até M; deixar arm 0 escolhe o atalho e produz a colisão.
 *   - (4,2), curva do caminho longo do azul: nasce rot 3 (O–N), UM QUARTO
 *     depois da correta rot 2 (S–O). É a peça do CONTRAGIRO: o azul chega nela
 *     no passo 4; o CW exigiria três toques (3→0→1→2), o CCW resolve em um
 *     (3→2). O primeiro toque CW no passo 4 deixaria a peça em rot 0 e o azul
 *     descarrilaria (noExit). O pulso D24 do seletor nasce no primeiro Y
 *     (passo 1) e para no primeiro uso do seletor (passo 4).
 *
 * SOLUÇÃO DOCUMENTADA — 12 PASSOS (2/2, 3 vidas)
 *   1. toggle S (2,1)   arm 1→0; os dois trens entram nas entradas (§3.5).
 *   2. toggle E (4,4)   arm 0→1: o azul pega o braço longo; M no passo 8.
 *   3. rotate S (2,1)   rot 1→2, arm 0: talo S; @ vermelho à vista.
 *   4. rotate (4,2) CCW  contragiro: rot 3→2 (S–O); o azul entra na peça já
 *                       corrigida no fim do passo. [único CCW da solução]
 *   5. passar           vermelho em (1,4); azul em (3,2).
 *   6. passar           vermelho em M (2,4); azul em (3,3).
 *   7. passar           vermelho em (2,3); azul em m (3,4).
 *   8. passar           vermelho em (2,2); azul em M (2,4).
 *   9. passar           vermelho em S (2,1); azul em (2,3). [janela abre]
 *  10. passar           vermelho em @ (1,1), ENTREGUE; azul em (2,2).
 *  11. toggle S (2,1)   arm 0→1: rearma para o azul. [janela fecha]
 *  12. passar           azul em # (3,1), ENTREGUE; vitória 2/2.
 *
 *   ATENÇÃO: a substituição do antigo «passar» pelo CCW no passo 4 mantém o
 *   timeline: todas as posições por passo são as mesmas da solução de 12
 *   ações; o que muda é a peça (4,2), que passa a aceitar o azul. O total
 *   continua 12 porque o CCW OCUPA o passo 4, não o acrescenta.
 *
 *   Janela da sincronia: S é atravessado no passo 9 (vermelho) e no passo 11
 *   (azul) — 2 passos. O vermelho deixa S no passo 10; o primeiro toque livre
 *   é o passo 11, e é exatamente a chegada do azul. A agulha de S é rearmada
 *   nesse passo. Sem esse toggle, NÃO há 2/2 (ver sacrifício).
 *
 *   A janela de M também é de 2 passos (vermelho no 6, azul no 8), mas M é um
 *   merge: os dois entram por braços, então a agulha não decide nada. O
 *   caminho longo do azul até M é a aritmética de comprimento que cria o
 *   vetor de colisão: M no 8; o atalho chega no 6, o mesmo passo do vermelho.
 *
 * TUTORIAL DISTRIBUÍDO / ABAB SOB PRESSÃO
 *   Primeiro quadro: a previsão do vermelho termina em # (estação azul) com
 *   X de cor errada; a do azul termina em # correta. As duas passam por S.
 *   O primeiro toque em S (toggle) move só a agulha — as duas entradas em S
 *   são por braço, então a rota não muda; o segundo toque (rotate) é o que
 *   conserta a orientação. Entre os dois, o jogador precisa tocar E até o
 *   passo 2 — a ação resolve antes do movimento, então o passo 2 é o último
 *   instante antes de o azul entrar em E. A alternância entre os DOIS Ys é o
 *   contrato do P1, não só a alternância dentro de um Y.
 *
 * O CONTRAGIRO / APRESENTAÇÃO DO SELETOR (D22/D24)
 *   A curva (4,2) do caminho longo do azul nasce rot 3 (O–N), um quarto
 *   depois da correta rot 2 (S–O). O azul chega nela no passo 4; o CW pediria
 *   TRÊS toques (3→0→1→2), o CCW resolve em UM (3→2). É o único contragiro
 *   da solução e o momento em que o seletor deixa de ser decoração. O pulso
 *   D24 do botão-ferramenta nasce no primeiro Y (passo 1) e para no primeiro
 *   uso do seletor (passo 4); a seta grande no HUD mostra o sentido ativo.
 *   Quem toca CW no passo 4 deixa a peça em rot 0 e o azul morre em noExit —
 *   a lição custa uma vida, não a fase.
 *
 * SACRIFÍCIO (Q8) — 1/2, 2 vidas
 *   Passos 1–10 da solução; no 11 passar em vez de tocar S; no 12 passar.
 *   O vermelho entrega no 10; o azul entra em S com arm 0, sai O no 12 e
 *   descarrila na estação vermelha (wrongStation). A vitória é dinâmica
 *   (§3.7): 1 de 2 ainda vence. A vida cai de 3 para 2. É a escolha real do
 *   experimento: pular o rearme e aceitar a perda do azul.
 *
 * COLISÃO (a sequência de erro razoável) — 2 trens, 1 vida, deadEnd
 *   O jogador vê o X do vermelho e toca S duas vezes seguidas (toggle no 1,
 *   rotate no 2), esquecendo E até o passo 2 — quando o azul chega em E.
 *   Com E em arm 0, o azul pega o atalho: M no passo 6, o MESMO passo do
 *   vermelho. Os dois entram na célula de M no passo 6: colisão em M (2,4),
 *   os dois descarrilam (reason collision), uma vida (3→2), deadEnd. A
 *   previsão de cada trem mostra o caminho até M; ela não mostra o encontro
 *   (Pilar 3/D2: caminhos independentes), então a colisão é o drama.
 *
 *   Sequência exata: 1 toggle S, 2 rotate S, 3 passar, 4 passar, 5 passar,
 *   6 passar → colisão. (O passo 6 também pode ser qualquer ação válida; o
 *   movimento é o que resolve.)
 *
 * CONTAGEM DE PASSOS / COMPRIMENTOS
 *   vermelho: (0,5) → (0,4) → (0,3) → (1,3) → (1,4) → M(2,4) [passo 6] →
 *             (2,3) 7 → (2,2) 8 → S(2,1) 9 → @(1,1) 10.
 *   azul:     (5,4) → E(4,4) → (4,3) → (4,2) → (3,2) → (3,3) → m(3,4) →
 *             M(2,4) [passo 8] → (2,3) 9 → (2,2) 10 → S(2,1) 11 →
 *             #(3,1) 12.
 *   atalho do azul (braço S de E): (5,4) → E → (4,5) → (3,5) → m → M
 *             [passo 6] → colisão com o vermelho.
 *
 *   O tabuleiro tem 18 peças (16 da rota + 2 primeiras células de entrada),
 *   todas em pelo menos uma rota (vermelha, azul longa, azul curta ou corredor
 *   compartilhado): zero decoys. O braço curto do azul não é decoy — é a rota
 *   errada do experimento.
 *
 * VIDAS / DERROTA
 *   3 vidas (D7). Colisão custa 1 independentemente dos dois trens; um
 *   descarrilamento independente custa 1. Com 2 trens o máximo é 2 eventos,
 *   então `lost` é inalcançável neste conteúdo (plano §2.2); ele é testado no
 *   core com 3 trens fabricados. deadEnd e won são os fins reais da fase.
 */

import type {
  Board,
  Cell,
  Color,
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

/**
 * Grade 6×6; `rows[row][col]`.
 *
 * As orientações das peças de reta/curva são as da solução desde o início; a
 * dificuldade está nos Ys. S nasce one-toggle-behind (rot 1, arm 1) e E nasce
 * no braço curto (arm 0); M e m são passivos.
 */
const board: Board = {
  width: 6,
  height: 6,
  rows: [
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    // @ vermelho (1,1); S split (2,1) rot 1 / arm 1; # azul (3,1).
    [EMPTY, station(RED, RED_SHAPE), y(1, 1, 'toggle'), station(BLUE, BLUE_SHAPE), EMPTY, EMPTY],
    // Corredor (2,2) reta N-S; braço longo do azul: (3,2) curva E-S,
    // (4,2) curva O-N inicial (o contragiro: correta S-O, rot 2).
    [EMPTY, EMPTY, straight(0), curve(1), curve(3), EMPTY],
    // Vermelho: (0,3) curva S-L, (1,3) curva S-O; corredor (2,3);
    // azul longo: (3,3) reta N-S, (4,3) reta N-S.
    [curve(1), curve(2), straight(0), straight(0), straight(0), EMPTY],
    // Vermelho: (0,4) reta N-S, (1,4) curva N-L; M em (2,4);
    // m em (3,4) rot 3; E em (4,4) rot 1 / arm 0; primeira célula azul (5,4)
    // é reta E–O alinhada (o marcador fica na borda leste).
    [straight(0), curve(0), y(0, 0, 'toggle'), y(3, 0, 'toggle'), y(1, 0, 'toggle'), straight(1)],
    // Primeira célula vermelha (0,5): reta N–S alinhada (marcador na borda
    // norte); atalho do azul: (3,5) curva L-N, (4,5) curva N-O.
    [straight(0), EMPTY, EMPTY, curve(0), curve(3), EMPTY],
  ],
};

/**
 * Fase P1 como dado puro.
 *
 * As duas primeiras células de entrada são distintas e contêm retas alinhadas;
 * os dois trens entram no primeiro passo (§3.5). A fase tem 3 vidas (D7);
 * `lost` é inalcançável com 2 trens, mas o contrato existe e é testado no core.
 * As estações ficam internas, uma de cada lado do split, para o rearme do passo
 * 11 decidir o destino do azul.
 */
export const P1_LEVEL: LevelLayout = {
  id: 'p1-sincronia',
  name: 'P1 — Sincronia',
  tutorial: true,
  selectorHint: true,
  board,
  lives: 3,
  trains: [
    {
      id: 'red',
      color: RED,
      shape: RED_SHAPE,
      entry: { cell: { col: 0, row: 5 }, direction: 'north' },
    },
    {
      id: 'blue',
      color: BLUE,
      shape: BLUE_SHAPE,
      entry: { cell: { col: 5, row: 4 }, direction: 'west' },
    },
  ],
};
