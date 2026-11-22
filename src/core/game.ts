/**
 * Orquestração do motor: setup(layout) → apply(action) → estado.
 *
 * O layout é validado uma vez no setup. O estado é imutável por convenção:
 * cada ação válida produz um novo `GameState`; a fachada só guarda o snapshot
 * atual. `reset()` recria o estado inicial a partir do mesmo layout.
 */

import type {
  Action,
  ApplyResult,
  Board,
  Bridge,
  CellPos,
  Direction,
  EntryPoint,
  Fixed,
  Game,
  GameEvent,
  GameState,
  LevelLayout,
  Train,
  TrainId,
} from './types';
import { cellAt, cellKey, cellsEqual, inBounds, neighbor } from './types';
import {
  classifyAction,
  isAdvancing,
  withRotatedPiece,
} from './actions';
import { predictPath } from './prediction';
import { resolveStep, type TrainMove } from './step';

/**
 * A entrada está na borda e aponta para dentro?
 *
 * Exige uma direção perpendicular a uma borda em que a célula encosta e um
 * vizinho dentro da grade. Uma entrada de canto aceita as duas perpendiculares
 * internas (ex.: canto noroeste aceita `east` ou `south`).
 */
function pointsInward(
  board: Board,
  cell: CellPos,
  direction: Direction,
): boolean {
  const next = neighbor(cell, direction);

  if (!inBounds(board, next)) {
    return false;
  }

  if (cell.col === 0 && direction === 'east') {
    return true;
  }

  if (cell.col === board.width - 1 && direction === 'west') {
    return true;
  }

  if (cell.row === 0 && direction === 'south') {
    return true;
  }

  if (cell.row === board.height - 1 && direction === 'north') {
    return true;
  }

  return false;
}

/**
 * Valida as bandas de rio e a única ponte de cada uma.
 *
 * Uma banda é o componente 4-conexo de células `river` + `bridge`; ela precisa
 * ser reta (toda na mesma linha ou coluna), conter ao menos uma água e
 * exatamente uma ponte. O eixo da ponte é perpendicular ao eixo da banda:
 * rio horizontal → ponte `north-south`; rio vertical → ponte `east-west`.
 */
function validateRiversAndBridges(board: Board): void {
  const cells: { readonly pos: CellPos; readonly fixed: Fixed }[] = [];

  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const content = cellAt(board, { col, row });

      if (
        content?.kind === 'fixed' &&
        (content.fixed.kind === 'river' || content.fixed.kind === 'bridge')
      ) {
        cells.push({ pos: { col, row }, fixed: content.fixed });
      }
    }
  }

  const byKey = new Map<string, Fixed>();

  for (const cell of cells) {
    byKey.set(cellKey(cell.pos), cell.fixed);
  }

  const visited = new Set<string>();

  for (const start of cells) {
    const startKey = cellKey(start.pos);

    if (visited.has(startKey)) {
      continue;
    }

    const component: { readonly pos: CellPos; readonly fixed: Fixed }[] = [];
    const queue: CellPos[] = [start.pos];
    visited.add(startKey);

    for (let index = 0; index < queue.length; index += 1) {
      const pos = queue[index];

      if (pos === undefined) {
        continue;
      }

      const fixed = byKey.get(cellKey(pos));

      if (fixed === undefined) {
        continue;
      }

      component.push({ pos, fixed });

      for (const direction of ['north', 'east', 'south', 'west'] as const) {
        const next = neighbor(pos, direction);

        if (!inBounds(board, next)) {
          continue;
        }

        const nextKey = cellKey(next);

        if (visited.has(nextKey) || !byKey.has(nextKey)) {
          continue;
        }

        visited.add(nextKey);
        queue.push(next);
      }
    }

    let riverCount = 0;
    let bridge: Bridge | undefined;

    for (const cell of component) {
      if (cell.fixed.kind === 'river') {
        riverCount += 1;
      } else if (cell.fixed.kind === 'bridge') {
        if (bridge !== undefined) {
          throw new Error(
            'Layout inválido: cada rio precisa de exatamente uma ponte.',
          );
        }

        bridge = cell.fixed;
      }
    }

    if (riverCount === 0) {
      throw new Error(
        'Layout inválido: a ponte precisa estar dentro da banda de um rio.',
      );
    }

    if (bridge === undefined) {
      throw new Error(
        'Layout inválido: cada rio precisa de exatamente uma ponte.',
      );
    }

    const first = component[0];

    if (first === undefined) {
      continue;
    }

    const sameRow = component.every((cell) => cell.pos.row === first.pos.row);
    const sameColumn = component.every(
      (cell) => cell.pos.col === first.pos.col,
    );

    if (!sameRow && !sameColumn) {
      throw new Error(
        'Layout inválido: o rio precisa ser uma banda reta e contígua (linha ou coluna).',
      );
    }

    const bridgeAxis = sameRow ? 'north-south' : 'east-west';

    if (bridge.axis !== bridgeAxis) {
      throw new Error(
        'Layout inválido: o eixo da ponte precisa ser perpendicular ao rio.',
      );
    }
  }
}

/**
 * Valida o overlay de moedas: dentro da grade, sem duplicar célula e sempre
 * sobre trilho (peça móvel, inclusive cruzamento, ou ponte fixa). Rio,
 * montanha, túnel, estação e vazio não recebem moeda; a ponte recebe (é
 * trilho de travessia e o rascunho P2 usa uma ali).
 */
function validateCoins(layout: LevelLayout): void {
  if (layout.coins === undefined) {
    return;
  }

  const seen = new Set<string>();

  for (const coin of layout.coins) {
    if (!inBounds(layout.board, coin)) {
      throw new Error('Layout inválido: moeda fora da grade.');
    }

    const key = cellKey(coin);

    if (seen.has(key)) {
      throw new Error(
        `Layout inválido: moeda duplicada em (${coin.col},${coin.row}).`,
      );
    }

    const content = cellAt(layout.board, coin);
    const isTrack =
      content?.kind === 'piece' ||
      (content?.kind === 'fixed' && content.fixed.kind === 'bridge');

    if (!isTrack) {
      throw new Error(
        `Layout inválido: a moeda em (${coin.col},${coin.row}) precisa estar sobre trilho (peça ou ponte).`,
      );
    }

    seen.add(key);
  }
}

/**
 * Valida pares de portais de túnel.
 *
 * Cada portal declara `exit`; o parceiro precisa ser outro portal, dentro da
 * grade, distinto e simétrico (`A.exit === B` e `B.exit === A`). O destino não
 * pode ser estação, rio, ponte, montanha nem vazio. A direção preservada não
 * exige alinhamento: o portal parceiro pode estar em qualquer célula; o que
 * importa é a direção de deslocamento do trem.
 */
function validateTunnels(board: Board): void {
  for (let row = 0; row < board.height; row += 1) {
    for (let col = 0; col < board.width; col += 1) {
      const content = cellAt(board, { col, row });

      if (
        content?.kind !== 'fixed' ||
        content.fixed.kind !== 'tunnel'
      ) {
        continue;
      }

      const from = { col, row };
      const exit = content.fixed.exit;

      if (!inBounds(board, exit)) {
        throw new Error(
          `Layout inválido: o parceiro do túnel em (${col},${row}) está fora da grade.`,
        );
      }

      if (cellsEqual(from, exit)) {
        throw new Error(
          `Layout inválido: o túnel em (${col},${row}) precisa apontar para outro portal.`,
        );
      }

      const partner = cellAt(board, exit);

      if (
        partner?.kind !== 'fixed' ||
        partner.fixed.kind !== 'tunnel'
      ) {
        throw new Error(
          `Layout inválido: o túnel em (${col},${row}) precisa apontar para outro portal.`,
        );
      }

      if (!cellsEqual(partner.fixed.exit, from)) {
        throw new Error(
          `Layout inválido: os portais do túnel em (${col},${row}) e (${exit.col},${exit.row}) precisam apontar um para o outro.`,
        );
      }
    }
  }
}

/**
 * Valida as invariantes do dado da fase.
 *
 * Cobre o que o motor assume: linhas do tamanho certo, ao menos um trem,
 * IDs únicos, primeira célula de entrada dentro da grade, na borda, apontando
 * para dentro e contendo uma peça de trilho, uma célula de entrada distinta
 * por trem, pares de túnel simétricos e moedas sobre trilho. Regras de design
 * (uma estação por cor, etc.) ficam com o layout, não com o motor.
 */
export function validateLayout(layout: LevelLayout): void {
  const { board } = layout;

  if (
    !Number.isInteger(board.width) ||
    board.width <= 0 ||
    !Number.isInteger(board.height) ||
    board.height <= 0
  ) {
    throw new Error(
      'Layout inválido: width/height do board devem ser inteiros positivos.',
    );
  }

  if (board.rows.length !== board.height) {
    throw new Error(
      `Layout inválido: esperado ${board.height} linhas, recebido ${board.rows.length}.`,
    );
  }

  for (let row = 0; row < board.rows.length; row += 1) {
    const cells = board.rows[row];

    if (cells === undefined || cells.length !== board.width) {
      throw new Error(
        `Layout inválido: linha ${row} deve ter ${board.width} células.`,
      );
    }
  }

  if (
    layout.lives !== undefined &&
    (!Number.isInteger(layout.lives) || layout.lives < 1)
  ) {
    throw new Error(
      'Layout inválido: lives deve ser um inteiro ≥ 1 quando presente.',
    );
  }

  validateRiversAndBridges(board);
  validateTunnels(board);
  validateCoins(layout);

  if (layout.trains.length === 0) {
    throw new Error('Layout inválido: a fase precisa de ao menos um trem.');
  }

  const ids = new Set<string>();
  const entries = new Set<string>();

  for (const trainSetup of layout.trains) {
    if (ids.has(trainSetup.id)) {
      throw new Error(
        `Layout inválido: id de trem duplicado "${trainSetup.id}".`,
      );
    }

    ids.add(trainSetup.id);

    if (!inBounds(board, trainSetup.entry.cell)) {
      throw new Error(
        `Layout inválido: entrada do trem "${trainSetup.id}" está fora da grade.`,
      );
    }

    const entryCell = cellAt(board, trainSetup.entry.cell);

    if (entryCell === undefined || entryCell.kind !== 'piece') {
      throw new Error(
        `Layout inválido: a primeira célula da entrada do trem "${trainSetup.id}" precisa conter uma peça de trilho.`,
      );
    }

    if (
      !pointsInward(
        board,
        trainSetup.entry.cell,
        trainSetup.entry.direction,
      )
    ) {
      throw new Error(
        `Layout inválido: a entrada do trem "${trainSetup.id}" precisa estar na borda e apontar para dentro.`,
      );
    }

    const key = cellKey(trainSetup.entry.cell);

    if (entries.has(key)) {
      throw new Error(
        `Layout inválido: dois trens usam a mesma entrada (${trainSetup.entry.cell.col},${trainSetup.entry.cell.row}).`,
      );
    }

    entries.add(key);
  }
}

/** Cria o snapshot inicial: todos os trens `waiting`, fora da grade. */
function makeInitialState(layout: LevelLayout): GameState {
  const trains = layout.trains.map((trainSetup): Train => ({
    id: trainSetup.id,
    color: trainSetup.color,
    shape: trainSetup.shape,
    status: {
      kind: 'waiting',
      cell: trainSetup.entry.cell,
      direction: trainSetup.entry.direction,
    },
  }));

  return {
    levelId: layout.id,
    board: layout.board,
    trains,
    lives: layout.lives ?? null,
    coinsCollected: [],
    step: 0,
    status: 'ready',
  };
}

/**
 * Slot de coleta (§3.6): moedas na célula de CHEGADA de cada mover.
 *
 * Roda no `StepOptions.collect` do passo, depois das entregas e antes das
 * colisões. Uma moeda já coletada não volta; duas chegadas na mesma célula
 * geram um único evento (o primeiro mover na ordem dos trens). A moeda conta
 * mesmo que o trem morra no mesmo passo (D16), porque o slot roda antes.
 */
function collectCoins(
  state: GameState,
  moves: readonly TrainMove[],
  coinCells: readonly CellPos[],
): readonly GameEvent[] {
  if (coinCells.length === 0) {
    return [];
  }

  const coinKeys = new Set(coinCells.map(cellKey));
  const collectedKeys = new Set(state.coinsCollected.map(cellKey));
  const emitted = new Set<string>();
  const events: GameEvent[] = [];

  for (const move of moves) {
    const key = cellKey(move.to);

    if (
      !coinKeys.has(key) ||
      collectedKeys.has(key) ||
      emitted.has(key)
    ) {
      continue;
    }

    emitted.add(key);
    events.push({
      kind: 'coinCollected',
      trainId: move.trainId,
      cell: move.to,
    });
  }

  return events;
}

/** Aplica uma ação a um snapshot, produzindo o snapshot posterior. */
function applyToState(
  state: GameState,
  action: Action,
  coinCells: readonly CellPos[],
): ApplyResult {
  const outcome = classifyAction(state, action);

  if (!isAdvancing(outcome)) {
    return {
      action,
      outcome,
      advanced: false,
      state,
      events: [],
    };
  }

  const events: GameEvent[] = [];
  let board = state.board;

  if (outcome.kind === 'rotated' || outcome.kind === 'toggled') {
    board = withRotatedPiece(board, outcome.cell, outcome.to);

    if (outcome.kind === 'toggled') {
      events.push({
        kind: 'pieceToggled',
        cell: outcome.cell,
        from: outcome.from,
        to: outcome.to,
      });
    } else {
      events.push({
        kind: 'pieceRotated',
        cell: outcome.cell,
        from: outcome.from,
        to: outcome.to,
      });
    }
  }

  const resolution = resolveStep(
    { ...state, board },
    {
      collect: (context) =>
        collectCoins(context.state, context.moves, coinCells),
    },
  );
  events.push(...resolution.events);

  const nextCoins = [...state.coinsCollected];
  const seenCoins = new Set(nextCoins.map(cellKey));

  for (const event of resolution.events) {
    if (event.kind !== 'coinCollected') {
      continue;
    }

    const key = cellKey(event.cell);

    if (!seenCoins.has(key)) {
      seenCoins.add(key);
      nextCoins.push(event.cell);
    }
  }

  return {
    action,
    outcome,
    advanced: true,
    state: { ...resolution.state, coinsCollected: nextCoins },
    events,
  };
}

/**
 * Fabrica o motor para uma fase.
 *
 * `layout` é validado aqui; um layout inválido lança com mensagem clara. A
 * fachada devolve o snapshot atual em `state`, aplica ações com `apply`,
 * calcula previsões com `prediction`, restaura o início com `reset`, compra o
 * resgate de um trem perdido com `rescue` (D28) e reverte o último passo com
 * `undoStep` (D29).
 *
 * Histórico do Time-travel (D29): cada `apply` que AVANÇA passo empilha o
 * snapshot anterior. Como `GameState` é imutável e o passo só cria estruturas
 * novas, o custo é a referência, não uma cópia profunda. A pilha é da RUN —
 * `reset` a esvazia, `rescue` não empilha (não é passo) e a compra de undo não
 * deixa rastro nela: desfazer repetido anda um passo por compra.
 */
export function setup(layout: LevelLayout): Game {
  validateLayout(layout);

  const coinCells = layout.coins ?? [];
  const entriesById = new Map<TrainId, EntryPoint>();
  const history: GameState[] = [];

  for (const trainSetup of layout.trains) {
    entriesById.set(trainSetup.id, trainSetup.entry);
  }

  let state = makeInitialState(layout);

  return {
    get state() {
      return state;
    },

    apply(action) {
      const previous = state;
      const result = applyToState(state, action, coinCells);

      if (result.advanced) {
        history.push(previous);
      }

      state = result.state;
      return result;
    },

    prediction(trainId, maxSteps) {
      const train = state.trains.find((candidate) => candidate.id === trainId);

      if (train === undefined) {
        return undefined;
      }

      return predictPath(state.board, train, maxSteps);
    },

    /**
     * Resgate de trem perdido (D28).
     *
     * Pré-condições estritas: a run está em `deadEnd` (sem trem ativo e sem
     * entrega — o único momento em que a UI oferece a escolha) e o trem alvo
     * está `derailed`. O trem volta ao `TrainSetup.entry` original como
     * `waiting`, exatamente como na partida: o próximo passo o coloca na
     * primeira célula e só o passo seguinte resolve a peça (D13). Nenhuma
     * regra nova: colisão, célula ocupada e peça mudada desde a morte são
     * resolvidas pelo `resolveStep` normal.
     *
     * A vida perdida NÃO é devolvida, `step` e `coinsCollected` não mudam, e a
     * operação não passa pelo buffer (não é ação). Como `deadEnd` garante ao
     * menos um trem não entregue, o estado restaurado tem trem ativo e volta a
     * `playing`.
     */
    rescue(trainId) {
      if (state.status !== 'deadEnd') {
        return undefined;
      }

      const entry = entriesById.get(trainId);
      const train = state.trains.find((candidate) => candidate.id === trainId);

      if (entry === undefined || train === undefined) {
        return undefined;
      }

      if (train.status.kind !== 'derailed') {
        return undefined;
      }

      const trains = state.trains.map((candidate): Train =>
        candidate.id === trainId
          ? {
              ...candidate,
              status: {
                kind: 'waiting',
                cell: entry.cell,
                direction: entry.direction,
              },
            }
          : candidate,
      );

      state = { ...state, trains, status: 'playing' };
      return state;
    },

    /**
     * Time-travel (D29): volta ao snapshot anterior à última ação.
     *
     * A restauração é INTEGRAL porque o snapshot é completo: board (peças),
     * trens (posição/status, inclusive `justTunneled`), vidas, moedas, `step` e
     * `status`. Recusa sem efeito em `step === 0`, `won` e `lost`; `deadEnd` é
     * permitido — é a reversão do passo fatal, não uma derrota consumada.
     *
     * O resgate (M4) NÃO entra no histórico: depois de resgatar e dar um passo,
     * o undo volta ao snapshot PÓS-resgate (trem `waiting`), não ao estado
     * anterior à morte. Não há reembolso da vida nem das moedas gastas.
     */
    undoStep() {
      if (state.step === 0 || state.status === 'won' || state.status === 'lost') {
        return undefined;
      }

      const previous = history.pop();

      if (previous === undefined) {
        return undefined;
      }

      state = previous;
      return state;
    },

    reset() {
      history.length = 0;
      state = makeInitialState(layout);
      return state;
    },
  };
}
