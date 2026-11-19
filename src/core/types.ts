/**
 * Contrato de tipos do core do Trails.
 *
 * Este arquivo é a fronteira entre o motor puro (`src/core`) e a apresentação
 * (`render`, `input`, `feel`). Ele descreve apenas dados e utilidades puras:
 * nenhum DOM, nenhum acesso a tempo, nenhum estado global mutável. Parâmetros
 * ajustáveis entram como argumentos de função com default; nenhum arquivo de
 * config é importado aqui.
 *
 * Convenções de leitura:
 * - `CellPos` é uma coordenada; `Cell` é o conteúdo de uma célula.
 * - `col` cresce para leste (direita) e `row` cresce para sul (baixo); a
 *   origem `(0, 0)` é o canto superior esquerdo da grade.
 * - `Direction` é sempre a direção de deslocamento, nunca o lado de onde o
 *   trem veio.
 * - `Rotation` conta quartos de volta no sentido horário (CW) a partir da
 *   orientação canônica da peça.
 */

/** Cor em formato CSS. No P0, hex (`#d64545`). */
export type Color = string;

/**
 * Forma geométrica do par trem/estação.
 *
 * A cor é a regra de entrega; a forma é o segundo canal, obrigatório para
 * acessibilidade (GDD §5). Trem e estação da mesma cor usam a mesma forma.
 */
export type Shape = 'circle' | 'square' | 'triangle' | 'diamond';

/**
 * Direção de deslocamento na grade.
 *
 * `north` diminui `row`; `east` aumenta `col`; `south` aumenta `row`;
 * `west` diminui `col`.
 */
export type Direction = 'north' | 'east' | 'south' | 'west';

/**
 * Coordenada inteira de uma célula.
 *
 * `col` 0 é a coluna mais a oeste e `row` 0 é a linha mais ao norte.
 * Posições fora da grade são permitidas como valor (a previsão as usa para
 * detectar a saída pela borda); quem consome deve checar `inBounds`.
 */
export interface CellPos {
  readonly col: number;
  readonly row: number;
}

/** Quarto de volta no sentido horário (CW), a partir da orientação canônica. */
export type Rotation = 0 | 1 | 2 | 3;

/** Tipo de peça móvel. */
export type PieceKind = 'straight' | 'curve' | 'y';

/**
 * Reta: dois lados opostos.
 *
 * Orientação canônica (`rot: 0`): norte–sul. `rot` 1/3: leste–oeste;
 * `rot` 0/2: norte–sul.
 */
export interface StraightPiece {
  readonly kind: 'straight';
  readonly rot: Rotation;
}

/**
 * Curva: dois lados adjacentes.
 *
 * Orientação canônica (`rot: 0`): norte–leste. Girando 90° CW:
 * `rot` 1 = leste–sul; 2 = sul–oeste; 3 = oeste–norte.
 */
export interface CurvePiece {
  readonly kind: 'curve';
  readonly rot: Rotation;
}

/**
 * Y (desvio): talo + duas pontas; um lado fechado.
 *
 * Abreviações: N = norte, L = leste, S = sul, O = oeste.
 *
 * Orientação canônica (`rot: 0`): talo ao NORTE, ponta do braço 0 ao LESTE,
 * ponta do braço 1 ao OESTE e lado SUL fechado. `rot` gira o conjunto inteiro
 * 90° CW; `arm` é relativo à peça (viaja com a rotação):
 *
 * | rot | talo | braço 0 | braço 1 | fechado |
 * |---|---|---|---|---|
 * | 0 | N | L | O | S |
 * | 1 | L | S | N | O |
 * | 2 | S | O | L | N |
 * | 3 | O | N | S | L |
 *
 * Fluxo (GDD §3.2): trem que entra pelo talo sai pela ponta ATIVA; trem que
 * entra por QUALQUER ponta (ativa ou inativa) sai pelo talo; o lado fechado
 * não tem saída. Uma célula de Y comporta um trem por vez.
 *
 * Controle ABAB por peça (D8): `next` é a PRÓXIMA ação e começa `'toggle'`.
 * Todo toque inverte `next` — `'toggle'` troca `arm` e vira `'rotate'`;
 * `'rotate'` gira `rot` 90° CW e vira `'toggle'`. O primeiro toque de cada Y é
 * sempre trocar a ponta ativa. Dois Ys têm alternâncias independentes.
 *
 * Nota de leitura §3.10-Y: dois trens que entram pelo Y em pontas opostas no
 * mesmo passo chegam à célula do Y no mesmo passo; o compute-then-resolve
 * trata isso como colisão NA CÉLULA DO Y. «Saem pelo talo» descreve a
 * trajetória pretendida, não uma célula destino separada. Trocas através do Y
 * seguem a regra geral de swap.
 */
export interface YPiece {
  readonly kind: 'y';
  readonly rot: Rotation;
  /** Braço ativo relativo à peça: 0 = base leste, 1 = base oeste. */
  readonly arm: 0 | 1;
  /** Próxima ação do ABAB: `toggle` troca a ponta; `rotate` gira 90° CW. */
  readonly next: 'toggle' | 'rotate';
}

/**
 * Peça móvel de trilho.
 *
 * `rot` é o número de quartos de volta CW a partir da orientação canônica
 * documentada em cada variante. A tabela de movimento (`movement.ts`) é a
 * única autoridade sobre as conexões; a renderização deve usar a mesma
 * convenção.
 *
 * As conexões são lados da célula. Um trem que viaja na direção `D` entra
 * pelo lado `opposite(D)` e sai pelo outro lado conectado; a direção de saída
 * é o lado por onde ele sai. Exemplo: reta leste–oeste com trem viajando para
 * leste entra pelo lado oeste e sai para leste (não volta). Isso vale para
 * reta e curva; o Y tem três lados e fluxo próprio em `YPiece`.
 *
 * Y (P1) já é uma variante desta união. Cruzamento (P3) entra como nova
 * variante aditiva, com case novo em `movement.ts`/`actions.ts`.
 */
export type Piece = StraightPiece | CurvePiece | YPiece;

/**
 * Estação: elemento fixo que não gira.
 *
 * Aceita o trem por qualquer lado com trilho conectado (GDD §3.4). A entrega
 * compara `color` — `shape` é o canal redundante de acessibilidade e deve
 * acompanhar a cor. Estação da cor errada faz o trem descarrilar.
 */
export interface Station {
  readonly kind: 'station';
  readonly color: Color;
  readonly shape: Shape;
}

/**
 * Entrada de locomotiva: marcador de borda + primeira célula da grade.
 *
 * O GDD §3.4 sempre definiu a entrada como um **ponto marcado na borda**, não
 * como uma célula fixa. `cell` é a primeira célula DENTRO da grade — a que o
 * trem pisa no primeiro passo — e `direction` é o sentido de entrada,
 * perpendicular à borda e apontando para dentro. A célula deve conter uma peça
 * de trilho comum (reta, curva ou, futuramente, Y), que o jogador pode girar
 * enquanto o trem espera.
 *
 * O trem começa fora da grade (`waiting`), desenhado visualmente uma célula
 * atrás de `cell` no sentido oposto a `direction`; o passo 1 o coloca em
 * `cell` sem resolver a chegada, e o passo 2 resolve a peça dali. O marcador na
 * borda é derivado pelo render; não existe mais um tipo de célula `entry`.
 */
export interface EntryPoint {
  readonly cell: CellPos;
  readonly direction: Direction;
}

/**
 * Rio: célula de água de uma banda reta.
 *
 * Não recebe trilho. Um trem que chega a uma célula de rio descarrila com
 * `reason: 'water'`; a previsão para na água com `stop.kind: 'water'`, distinta
 * de `noExit`. A banda (linha ou coluna contígua) e sua única ponte são
 * validadas no setup.
 */
export interface River {
  readonly kind: 'river';
}

/**
 * Ponte: célula fixa de travessia dentro da banda de rio.
 *
 * `axis` é o eixo do trilho da ponte (a direção em que o trem atravessa) e é
 * **perpendicular** ao eixo do rio. Quem entra pela ponte viajando ao longo do
 * eixo atravessa; entrada de lado não conecta (`noExit`). A ponte não gira e
 * comporta um trem por vez (regra geral de colisão).
 */
export interface Bridge {
  readonly kind: 'bridge';
  readonly axis: 'east-west' | 'north-south';
}

/**
 * Elemento fixo de uma célula.
 *
 * Hoje: estação, rio e ponte. Futuros elementos (montanha etc.) entram como
 * novas variantes, com case novo em `movement.ts`/`step.ts` e no render.
 */
export type Fixed = Station | River | Bridge;

/** Célula vazia: nada transponível; trem que chega descarrila. */
export interface EmptyCell {
  readonly kind: 'empty';
}

/** Célula com peça móvel de trilho. */
export interface PieceCell {
  readonly kind: 'piece';
  readonly piece: Piece;
}

/** Célula com elemento fixo (estação, rio, ponte ou futuro fixo). */
export interface FixedCell {
  readonly kind: 'fixed';
  readonly fixed: Fixed;
}

/**
 * Conteúdo de uma célula da grade: peça móvel, elemento fixo ou vazio.
 *
 * A posição não vive aqui; ela é um `CellPos` separado e o `Board` indexa o
 * conteúdo por `rows[row][col]`. Trens são dinâmicos e não fazem parte da
 * célula: a ocupação é derivada de `GameState.trains`.
 */
export type Cell = EmptyCell | PieceCell | FixedCell;

/**
 * Grade retangular da fase.
 *
 * Invariantes (validadas no setup, não pelo tipo):
 * - `rows.length === height`;
 * - cada linha tem exatamente `width` células;
 * - `rows[row][col]` é a célula na coluna `col` e linha `row`.
 */
export interface Board {
  readonly width: number;
  readonly height: number;
  readonly rows: readonly (readonly Cell[])[];
}

/** Identificador estável de uma locomotiva dentro da fase. */
export type TrainId = string;

/**
 * Motivo de descarrilamento (GDD §3.6).
 *
 * - `offBoard`: saiu da grade por uma borda;
 * - `noExit`: chegou a uma célula sem saída (vazia ou peça sem conexão para a
 *   direção de entrada);
 * - `water`: entrou em uma célula de rio (água); a ponte acessada fora do
 *   eixo é `noExit` (a ponte só conecta ao longo do eixo);
 * - `wrongStation`: chegou a uma estação de cor diferente da sua;
 * - `collision`: colisão com outra locomotiva (mesma célula no mesmo passo ou
 *   troca de células no mesmo passo).
 */
export type DerailReason =
  | 'offBoard'
  | 'noExit'
  | 'water'
  | 'wrongStation'
  | 'collision';

/**
 * Estado de uma locomotiva.
 *
 * - `waiting`: ainda fora da grade, prestes a pisar em `cell` (a primeira
 *   célula de trilho) viajando na direção `direction` (GDD §3.5). Não ocupa
 *   `cell` para toque nem colisão até o primeiro passo.
 * - `running`: dentro da grade, ocupando `cell`. `incoming` é a direção de
 *   deslocamento com que o trem entrou na célula — a «direção de entrada» da
 *   tabela de movimento e da detecção de loop (§3.8). O lado da peça por onde
 *   ele entrou é `opposite(incoming)`.
 * - `delivered`: entregue; saiu do tabuleiro.
 * - `derailed`: descarrilado; saiu do tabuleiro e não retorna.
 */
export type TrainStatus =
  | {
      readonly kind: 'waiting';
      readonly cell: CellPos;
      readonly direction: Direction;
    }
  | {
      readonly kind: 'running';
      readonly cell: CellPos;
      readonly incoming: Direction;
    }
  | { readonly kind: 'delivered' }
  | { readonly kind: 'derailed'; readonly reason: DerailReason };

/**
 * Locomotiva.
 *
 * `color` + `shape` identificam o par trem/estação; a cor decide a entrega e
 * a forma é a redundância acessível (GDD §5). O estado dinâmico fica em
 * `status`; a configuração inicial vem de `TrainSetup`.
 */
export interface Train {
  readonly id: TrainId;
  readonly color: Color;
  readonly shape: Shape;
  readonly status: TrainStatus;
}

/**
 * Configuração de uma locomotiva no dado da fase.
 *
 * `entry.cell` deve ser uma célula de trilho (peça móvel) na borda;
 * `entry.direction` aponta para dentro, perpendicular àquela borda. Cada trem
 * usa uma primeira célula distinta. O trem começa `waiting` FORA da grade e o
 * primeiro passo o coloca em `entry.cell`; a peça só é resolvida no passo
 * seguinte.
 */
export interface TrainSetup {
  readonly id: TrainId;
  readonly color: Color;
  readonly shape: Shape;
  readonly entry: EntryPoint;
}

/**
 * Fase como dado puro.
 *
 * O motor não conhece nenhuma fase específica: `P0` é só um valor deste tipo
 * (`level/p0.ts`). Integridade (primeira célula de entrada na borda apontando
 * para dentro e contendo trilho, uma estação por cor, etc.) é validada no setup
 * do jogo; o dado é editável sem tocar no motor.
 *
 * `lives` ausente = fase sem vidas (D1 tutorial: a falha não existe como
 * estado/custo). Quando presente, deve ser um inteiro ≥ 1 — validado no
 * setup. O `GameState` inicial herda o valor (`null` quando ausente).
 *
 * `coins` é o overlay de moedas da fase: cada célula deve conter trilho
 * (peça móvel ou ponte fixa), nunca água/estação/vazio. A lista é validada e
 * pode ser omitida nas fases sem moedas (P0/P1).
 */
export interface LevelLayout {
  readonly id: string;
  readonly name: string;
  readonly board: Board;
  readonly trains: readonly TrainSetup[];
  readonly lives?: number;
  readonly coins?: readonly CellPos[];
}

/**
 * Ação bruta do jogador submetida ao motor.
 *
 * Um `tap` ainda não é uma «ação válida» no sentido do GDD §3.3: o motor o
 * classifica em `ActionOutcome`, e só `rotated`/`toggled`/`passed` avançam
 * exatamente um passo. `pass` é o botão «passar turno».
 *
 * O buffer de input (`buffer.ts`) guarda `Action` e a revalida no momento de
 * drenar (D4): um tap que virou célula ocupada não executa e não avança.
 */
export type Action =
  | { readonly kind: 'tap'; readonly cell: CellPos }
  | { readonly kind: 'pass' };

/**
 * Motivo de toque nulo — toque registrado, mas que não é ação (§3.3).
 *
 * - `empty`: célula vazia;
 * - `fixed`: elemento fixo (hoje a estação); não é ação;
 * - `outOfBounds`: coordenada fora da grade.
 */
export type NullTapReason = 'empty' | 'fixed' | 'outOfBounds';

/** Motivo de toque bloqueado: a célula está ocupada por um trem (§3.2). */
export type BlockedTapReason = 'train';

/**
 * Classificação de uma `Action`.
 *
 * - `rotated`: giro 90° CW de uma peça livre; ação válida, o passo avança;
 * - `toggled`: troca da ponta ativa de um Y (ABAB/D8); ação válida, o passo
 *   avança como `rotated` (§3.3);
 * - `passed`: passar turno; ação válida, o passo avança;
 * - `null`: toque sem ação; nada acontece;
 * - `blocked`: toque em célula ocupada por trem; nada acontece;
 * - `ignored`: o jogo já terminou (vitória, dead end ou lost); nada acontece.
 *
 * Apenas `rotated`, `toggled` e `passed` produzem `ApplyResult.advanced ===
 * true`.
 */
export type ActionOutcome =
  | {
      readonly kind: 'rotated';
      readonly cell: CellPos;
      readonly from: Piece;
      readonly to: Piece;
    }
  | {
      readonly kind: 'toggled';
      readonly cell: CellPos;
      readonly from: Piece;
      readonly to: Piece;
    }
  | { readonly kind: 'passed' }
  | { readonly kind: 'null'; readonly reason: NullTapReason }
  | { readonly kind: 'blocked'; readonly reason: BlockedTapReason }
  | { readonly kind: 'ignored'; readonly reason: 'finished' };

/**
 * Evento emitido por um passo resolvido.
 *
 * Ordem dentro de um passo, espelhando o GDD §3.6:
 * `pieceRotated`/`pieceToggled` (ação) → `trainMoved` (movimento calculado)
 * → `trainDelivered` (entregas) → `coinCollected` (coleta) →
 * `collision`/`trainDerailed` (colisões e descarrilamentos) → `lifeLost`
 * (consequência) → `victory`/`deadEnd` (fim de jogo).
 *
 * `trainMoved.from === null` significa entrada na grade: o primeiro passo
 * pisa na primeira célula de trilho definida em `TrainSetup.entry.cell`.
 * `trainMoved` só é emitido para destino dentro da grade; saída pela borda
 * gera `trainDerailed` com `reason: 'offBoard'` e a `direction` de saída.
 *
 * `collision` lista todos os trens e as células envolvidas (uma para colisão
 * no mesmo destino; duas para troca de células no mesmo passo). Cada
 * participante também recebe um `trainDerailed` com `reason: 'collision'`,
 * para que o consumidor trate toda saída de trem de forma uniforme.
 *
 * `coinCollected` sai no slot de coleta (depois de entregas, antes de
 * colisões/descarrilamentos). A moeda está na célula de CHEGADA do mover e
 * conta mesmo que o trem morra no mesmo passo (D16); cada célula é coletada no
 * máximo uma vez e o `GameState.coinsCollected` acompanha o evento.
 *
 * `lifeLost` é emitido uma vez por EVENTO que gasta vida — uma colisão,
 * independentemente do número de trens, ou um descarrilamento independente —,
 * não uma vez por trem. `step` é o passo resolvido (o `GameState.step`
 * posterior) e `remaining` é o saldo de vidas depois do evento. Fase sem vidas
 * (`GameState.lives === null`) não emite `lifeLost`. Em D11, o passo que zera
 * as vidas termina em `lost`, mesmo com entrega no mesmo passo.
 */
export type GameEvent =
  | {
      readonly kind: 'pieceRotated';
      readonly cell: CellPos;
      readonly from: Piece;
      readonly to: Piece;
    }
  | {
      readonly kind: 'pieceToggled';
      readonly cell: CellPos;
      readonly from: Piece;
      readonly to: Piece;
    }
  | {
      readonly kind: 'trainMoved';
      readonly trainId: TrainId;
      readonly from: CellPos | null;
      readonly to: CellPos;
    }
  | {
      readonly kind: 'trainDelivered';
      readonly trainId: TrainId;
      readonly station: CellPos;
    }
  | {
      readonly kind: 'coinCollected';
      readonly trainId: TrainId;
      /** Célula de CHEGADA do mover; a moeda já sai do tabuleiro. */
      readonly cell: CellPos;
    }
  | {
      readonly kind: 'trainDerailed';
      readonly trainId: TrainId;
      readonly at: CellPos;
      readonly direction: Direction;
      readonly reason: DerailReason;
    }
  | {
      readonly kind: 'collision';
      readonly trainIds: readonly TrainId[];
      readonly cells: readonly CellPos[];
    }
  | {
      readonly kind: 'lifeLost';
      /** Passo resolvido que gastou a vida (mesmo número do snapshot). */
      readonly step: number;
      /** Vidas restantes depois deste evento. */
      readonly remaining: number;
    }
  | { readonly kind: 'victory' }
  | { readonly kind: 'deadEnd' };

/**
 * Estado global da partida.
 *
 * - `ready`: nenhum passo resolvido; o jogador observa o tabuleiro (§3.5);
 * - `playing`: há ao menos um trem ativo (`waiting` ou `running`);
 * - `won`: nenhum trem ativo e ao menos uma entrega — vitória dinâmica
 *   (§3.7: trens perdidos saem do requisito);
 * - `deadEnd`: nenhum trem ativo e nenhuma entrega — o estado «sem trem ativo
 *   + entrega pendente» de D1; o core apenas expõe, a UI oferece recomeço;
 * - `lost`: as vidas chegaram a 0; a run termina em derrota (D7). Em D11,
 *   `lost` tem precedência sobre `won`/`deadEnd` no mesmo passo: orçamento
 *   esgotado encerra a run mesmo com entrega simultânea. Fase sem vidas
 *   (`GameState.lives === null`) nunca chega a `lost`.
 */
export type GameStatus = 'ready' | 'playing' | 'won' | 'deadEnd' | 'lost';

/**
 * Snapshot imutável do jogo.
 *
 * `step` é o número de passos resolvidos (ações válidas). Toque nulo, toque
 * bloqueado e ação ignorada não incrementam `step`. `board` é o estado atual
 * das peças (o giro altera uma peça entre passos); `trains` preserva a ordem
 * do layout.
 *
 * `lives` é o saldo da run: `null` = fase sem vidas (D1 tutorial), número =
 * vidas restantes (0 no estado `lost`). O valor inicial vem de
 * `LevelLayout.lives`; o passo que gasta a última vida leva a `lost`.
 *
 * `coinsCollected` são as moedas já coletadas nesta run, na ordem de coleta.
 * O array é único (cada célula aparece no máximo uma vez): o contador burro é
 * `coinsCollected.length`. Sem fórmula/persistência; reiniciar esvazia.
 */
export interface GameState {
  readonly levelId: string;
  readonly board: Board;
  readonly trains: readonly Train[];
  readonly lives: number | null;
  readonly coinsCollected: readonly CellPos[];
  readonly step: number;
  readonly status: GameStatus;
}

/**
 * Resultado de `Game.apply`.
 *
 * `state` é o snapshot posterior. Quando `advanced === false`, é o mesmo
 * snapshot de antes e `events` é vazio. Quando `advanced === true`, houve
 * exatamente um passo: `step` aumentou em 1 e `events` contém a resolução
 * completa na ordem documentada em `GameEvent`.
 */
export interface ApplyResult {
  readonly action: Action;
  readonly outcome: ActionOutcome;
  readonly advanced: boolean;
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

/**
 * Onde o trajeto previsto termina.
 *
 * - `station`: chegada à estação; `correct` compara a cor do trem com a da
 *   estação (falso sinaliza descarrilamento — o render muda a aparência);
 * - `border`: o trem sairia da grade a partir de `cell` na direção
 *   `direction`; `cell` é a última célula dentro da grade;
 * - `noExit`: o trem para/descarrila em `cell` (célula vazia ou peça sem
 *   conexão para a direção de entrada);
 * - `water`: o trem para/descarrila na água de `cell` (rio sem ponte); é um
 *   marcador distinto de `noExit` no render (E12);
 * - `loop`: revisita de (célula + direção de entrada) — ciclo fechado (D2);
 * - `limit`: o cap de segurança foi atingido antes de uma parada natural.
 */
export type PredictionStop =
  | {
      readonly kind: 'station';
      readonly cell: CellPos;
      readonly correct: boolean;
    }
  | {
      readonly kind: 'border';
      readonly cell: CellPos;
      readonly direction: Direction;
    }
  | { readonly kind: 'noExit'; readonly cell: CellPos }
  | { readonly kind: 'water'; readonly cell: CellPos }
  | { readonly kind: 'loop'; readonly cell: CellPos }
  | { readonly kind: 'limit'; readonly cell: CellPos };

/**
 * Previsão de trajeto de UMA locomotiva (GDD §3.8).
 *
 * Ignora os outros trens — caminhos são independentes; colisão é a única
 * incerteza permitida. `path` começa na posição atual (ou na primeira célula
 * de trilho da entrada, para um trem `waiting`) e termina em `stop.cell`,
 * inclusive. Para `loop`, a última célula repete uma anterior com a mesma
 * direção de entrada e `loop === true`; o render desenha o anel fechado com
 * marcador (D2). Um trem em loop continua ativo.
 *
 * O trajeto reflete o estado atual das peças (incluindo o braço ativo de cada
 * Y) e deve ser recalculado após qualquer giro, troca de ponta ou passo.
 * `trainId` identifica a previsão; trens entregues ou descarrilados não têm
 * previsão (o motor devolve `undefined`).
 */
export interface Prediction {
  readonly trainId: TrainId;
  readonly path: readonly CellPos[];
  readonly stop: PredictionStop;
  readonly loop: boolean;
}

/**
 * Fachada do motor.
 *
 * O estado é imutável por convenção: `apply` produz um novo `GameState`, e
 * `game.state` passa a apontar para ele. Um snapshot antigo continua válido
 * para diffs e animação — importante para o buffer e para o render.
 *
 * `prediction` devolve `undefined` para trem desconhecido, entregue ou
 * descarrilado. `maxSteps` é o cap de segurança da simulação (default 24),
 * invisível ao jogador (D2).
 *
 * `reset` restaura o estado inicial do layout e devolve o novo snapshot.
 * `setup(layout)` é a fábrica correspondente em `game.ts`.
 */
export interface Game {
  readonly state: GameState;
  apply(action: Action): ApplyResult;
  prediction(trainId: TrainId, maxSteps?: number): Prediction | undefined;
  reset(): GameState;
}

/**
 * Direções em ordem horária a partir do norte.
 *
 * Útil para render e para percorrer as quatro orientações sem depender de
 * ordem de `Object.keys`.
 */
export const DIRECTIONS: readonly Direction[] = ['north', 'east', 'south', 'west'];

/** Delta de coordenada de cada direção (uma célula). */
const DIRECTION_OFFSETS: Readonly<Record<Direction, CellPos>> = {
  north: { col: 0, row: -1 },
  east: { col: 1, row: 0 },
  south: { col: 0, row: 1 },
  west: { col: -1, row: 0 },
};

/** Delta `{ col, row }` de uma direção. O objeto retornado é compartilhado. */
export function directionOffset(direction: Direction): CellPos {
  return DIRECTION_OFFSETS[direction];
}

/** Célula vizinha na direção dada. Pode cair fora da grade; use `inBounds`. */
export function neighbor(pos: CellPos, direction: Direction): CellPos {
  const offset = directionOffset(direction);

  return { col: pos.col + offset.col, row: pos.row + offset.row };
}

/** Direção oposta (norte ↔ sul, leste ↔ oeste). */
export function opposite(direction: Direction): Direction {
  switch (direction) {
    case 'north':
      return 'south';
    case 'east':
      return 'west';
    case 'south':
      return 'north';
    case 'west':
      return 'east';
  }
}

/** Próxima direção girando 90° no sentido horário (norte → leste → sul → oeste). */
export function turnClockwise(direction: Direction): Direction {
  switch (direction) {
    case 'north':
      return 'east';
    case 'east':
      return 'south';
    case 'south':
      return 'west';
    case 'west':
      return 'north';
  }
}

/** Duas coordenadas são a mesma célula. */
export function cellsEqual(a: CellPos, b: CellPos): boolean {
  return a.col === b.col && a.row === b.row;
}

/**
 * Chave estável de uma coordenada para `Set`/`Map`.
 *
 * Formato `"col:row"`. Não use para exibição.
 */
export function cellKey(pos: CellPos): string {
  return `${pos.col}:${pos.row}`;
}

/** A coordenada está dentro dos limites da grade. */
export function inBounds(board: Board, pos: CellPos): boolean {
  return (
    pos.col >= 0 &&
    pos.col < board.width &&
    pos.row >= 0 &&
    pos.row < board.height
  );
}

/** Conteúdo da célula, ou `undefined` se a coordenada estiver fora da grade. */
export function cellAt(board: Board, pos: CellPos): Cell | undefined {
  if (!inBounds(board, pos)) {
    return undefined;
  }

  return board.rows[pos.row]?.[pos.col];
}
