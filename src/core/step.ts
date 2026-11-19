/**
 * Resolução de um passo (GDD §3.6).
 *
 * Compute-then-resolve: primeiro calcula o destino de TODOS os trens ativos,
 * depois resolve entregas, coleta (slot vazio no P0) e colisões/
 * descarrilamentos. A tabela §3.10 cai como consequência:
 * - célula deixada no mesmo passo é livre;
 * - mesma célula destino = colisão;
 * - troca de células no mesmo passo = colisão;
 * - entrega resolve antes da ocupação.
 *
 * O passo é puro: o `GameState` de entrada não é mutado; o board já chega com
 * o giro da ação aplicado (quem orquestra é `game.ts`).
 */

import type {
  Cell,
  CellPos,
  DerailReason,
  Direction,
  GameEvent,
  GameState,
  GameStatus,
  Train,
  TrainId,
} from './types';
import { cellAt, cellKey, cellsEqual, inBounds, neighbor } from './types';
import { resolveCell } from './movement';

/** Movimento planejado de um trem neste passo. */
export interface TrainMove {
  readonly trainId: TrainId;
  /** `null` quando o trem entra na grade pela primeira vez. */
  readonly from: CellPos | null;
  readonly to: CellPos;
  /** Direção de deslocamento com que o trem chega em `to`. */
  readonly direction: Direction;
}

/**
 * Contexto do slot de coleta de bônus (P2).
 *
 * O P0 não tem moedas: `StepOptions.collect` fica indefinido. P2 injeta um
 * coletor por `game.ts` sem alterar `step.ts` — a fase de coleta continua
 * acontecendo entre entregas e colisões, como no GDD §3.6.
 */
export interface CollectionContext {
  readonly state: GameState;
  readonly moves: readonly TrainMove[];
}

/** Slot de coleta: devolve eventos extras (ex.: moeda coletada). */
export type CollectBonus = (context: CollectionContext) => readonly GameEvent[];

/** Opções do passo; o único slot previsto é a coleta de bônus (P2). */
export interface StepOptions {
  readonly collect?: CollectBonus;
}

/** Resultado de um passo: novo snapshot + eventos na ordem do GDD. */
export interface StepResolution {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

type Arrival =
  | { readonly kind: 'running' }
  | { readonly kind: 'delivered' }
  | { readonly kind: 'derailed'; readonly reason: DerailReason };

interface Mover {
  readonly train: Train;
  readonly from: CellPos | null;
  readonly to: CellPos;
  readonly direction: Direction;
  readonly entersFromOutside: boolean;
  arrival: Arrival;
}

interface DerailInfo {
  readonly at: CellPos;
  readonly direction: Direction;
  readonly reason: DerailReason;
}

/**
 * O que acontece ao chegar em `destination` viajando na direção `direction`.
 *
 * Trem que chega a estação da cor certa é entregue; estação de cor errada
 * descarrila; vazio e peça sem conexão também descarriam. Peça com saída
 * continua `running` (a direção de saída só será usada no próximo passo).
 */
function resolveArrival(
  train: Train,
  destination: Cell,
  direction: Direction,
): Arrival {
  if (destination.kind === 'fixed' && destination.fixed.kind === 'station') {
    return destination.fixed.color === train.color
      ? { kind: 'delivered' }
      : { kind: 'derailed', reason: 'wrongStation' };
  }

  if (destination.kind === 'piece') {
    const exit = resolveCell(destination, direction);

    return exit.kind === 'exit'
      ? { kind: 'running' }
      : { kind: 'derailed', reason: 'noExit' };
  }

  // Vazio e futuros fixos bloqueantes.
  return { kind: 'derailed', reason: 'noExit' };
}

/**
 * Resolve exatamente um passo.
 *
 * O `state.status` deve ser `ready` ou `playing` — `game.ts` nunca chama depois
 * do fim. O retorno tem `step + 1`, `lives` atualizado e o `status` recalculado:
 * - `playing` enquanto houver trem `waiting`/`running`;
 * - `won` sem trem ativo e com ao menos uma entrega (vitória dinâmica §3.7);
 * - `deadEnd` sem trem ativo e sem entrega (D1);
 * - `lost` quando as vidas zeram (D7), com precedência D11 sobre won/deadEnd.
 *
 * Fase sem vidas (`state.lives === null`) não emite `lifeLost` e nunca chega a
 * `lost`. Todos os trens ativos se movem, inclusive os que vão colidir ou
 * descarrilar. A única exceção é um estado inválido (trem `running` em célula
 * sem saída), que vira `noExit` no lugar de se mover.
 */
export function resolveStep(
  state: GameState,
  options: StepOptions = {},
): StepResolution {
  if (
    state.status === 'won' ||
    state.status === 'deadEnd' ||
    state.status === 'lost'
  ) {
    throw new Error('resolveStep: o jogo já terminou');
  }

  const movers: Mover[] = [];
  const moverById = new Map<TrainId, Mover>();
  const deliveryById = new Map<TrainId, CellPos>();
  const derailById = new Map<TrainId, DerailInfo>();

  // 1. Computar o movimento de todos os trens ativos.
  for (const train of state.trains) {
    const status = train.status;

    if (status.kind === 'delivered' || status.kind === 'derailed') {
      continue;
    }

    if (status.kind === 'waiting') {
      const mover: Mover = {
        train,
        from: null,
        to: status.cell,
        direction: status.direction,
        entersFromOutside: true,
        arrival: { kind: 'running' },
      };

      movers.push(mover);
      moverById.set(train.id, mover);
      continue;
    }

    const currentCell = cellAt(state.board, status.cell);

    if (currentCell === undefined) {
      derailById.set(train.id, {
        at: status.cell,
        direction: status.incoming,
        reason: 'noExit',
      });
      continue;
    }

    const exit = resolveCell(currentCell, status.incoming);

    if (exit.kind === 'noExit') {
      derailById.set(train.id, {
        at: status.cell,
        direction: status.incoming,
        reason: 'noExit',
      });
      continue;
    }

    if (exit.kind === 'station') {
      if (
        currentCell.kind === 'fixed' &&
        currentCell.fixed.kind === 'station' &&
        currentCell.fixed.color === train.color
      ) {
        deliveryById.set(train.id, status.cell);
      } else {
        derailById.set(train.id, {
          at: status.cell,
          direction: status.incoming,
          reason: 'wrongStation',
        });
      }
      continue;
    }

    const next = neighbor(status.cell, exit.direction);

    if (!inBounds(state.board, next)) {
      derailById.set(train.id, {
        at: status.cell,
        direction: exit.direction,
        reason: 'offBoard',
      });
      continue;
    }

    const mover: Mover = {
      train,
      from: status.cell,
      to: next,
      direction: exit.direction,
      entersFromOutside: false,
      arrival: { kind: 'running' },
    };

    movers.push(mover);
    moverById.set(train.id, mover);
  }

  // 2. Resolver a chegada de cada movimento planejado.
  for (const mover of movers) {
    if (mover.entersFromOutside) {
      // O primeiro passo apenas pisa na primeira célula de trilho; o setup
      // garante que ela existe na borda. A peça dali é resolvida no passo 2.
      continue;
    }

    const destination = cellAt(state.board, mover.to);

    mover.arrival =
      destination === undefined
        ? { kind: 'derailed', reason: 'noExit' }
        : resolveArrival(mover.train, destination, mover.direction);
  }

  for (const mover of movers) {
    if (mover.arrival.kind === 'delivered') {
      deliveryById.set(mover.train.id, mover.to);
    }
  }

  // 3. Slot de coleta (vazio no P0). Roda depois das entregas e antes das
  // colisões; P2 injeta o coletor sem tocar neste arquivo.
  const moves: readonly TrainMove[] = movers.map((mover) => ({
    trainId: mover.train.id,
    from: mover.from,
    to: mover.to,
    direction: mover.direction,
  }));

  const collectionEvents =
    options.collect === undefined
      ? []
      : options.collect({ state, moves });

  // 4. Colisões: mesma célula destino ou troca de células. Entregues já
  // resolveram e não participam — a célula da entrega está livre.
  const candidates = movers.flatMap((mover, index) =>
    mover.arrival.kind === 'delivered' ? [] : [{ index, mover }],
  );

  const parent = candidates.map((_, index) => index);

  function rootOf(index: number): number {
    let root = index;
    let nextRoot = parent[root];

    while (nextRoot !== undefined && nextRoot !== root) {
      root = nextRoot;
      nextRoot = parent[root];
    }

    return root;
  }

  function union(a: number, b: number): void {
    const rootA = rootOf(a);
    const rootB = rootOf(b);

    if (rootA !== rootB) {
      parent[rootB] = rootA;
    }
  }

  const byDestination = new Map<string, number[]>();

  for (const [index, candidate] of candidates.entries()) {
    const key = cellKey(candidate.mover.to);
    const group = byDestination.get(key);

    if (group === undefined) {
      byDestination.set(key, [index]);
    } else {
      group.push(index);
    }
  }

  for (const group of byDestination.values()) {
    const first = group[0];

    if (group.length < 2 || first === undefined) {
      continue;
    }

    for (let index = 1; index < group.length; index += 1) {
      const other = group[index];

      if (other !== undefined) {
        union(first, other);
      }
    }
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const a = candidates[i];

    if (a === undefined || a.mover.from === null) {
      continue;
    }

    for (let j = i + 1; j < candidates.length; j += 1) {
      const b = candidates[j];

      if (b === undefined || b.mover.from === null) {
        continue;
      }

      if (
        cellsEqual(a.mover.to, b.mover.from) &&
        cellsEqual(b.mover.to, a.mover.from)
      ) {
        union(i, j);
      }
    }
  }

  const groupsByRoot = new Map<number, number[]>();

  for (let index = 0; index < candidates.length; index += 1) {
    const root = rootOf(index);
    const group = groupsByRoot.get(root);

    if (group === undefined) {
      groupsByRoot.set(root, [index]);
    } else {
      group.push(index);
    }
  }

  const collisionGroups = [...groupsByRoot.values()]
    .filter((group) => group.length >= 2)
    .sort((a, b) => (a[0] ?? 0) - (b[0] ?? 0));

  const collided = new Set<Mover>();
  const collisionEvents: GameEvent[] = [];

  for (const group of collisionGroups) {
    const trainIds: TrainId[] = [];
    const cells: CellPos[] = [];
    const seenCells = new Set<string>();

    for (const index of group) {
      const candidate = candidates[index];

      if (candidate === undefined) {
        continue;
      }

      const mover = candidate.mover;
      collided.add(mover);
      trainIds.push(mover.train.id);

      const key = cellKey(mover.to);

      if (!seenCells.has(key)) {
        seenCells.add(key);
        cells.push(mover.to);
      }
    }

    collisionEvents.push({ kind: 'collision', trainIds, cells });
  }

  // 5. Descarrilamentos: colisão vence a chegada fatal individual.
  for (const mover of movers) {
    if (collided.has(mover)) {
      derailById.set(mover.train.id, {
        at: mover.to,
        direction: mover.direction,
        reason: 'collision',
      });
      continue;
    }

    if (mover.arrival.kind === 'derailed') {
      derailById.set(mover.train.id, {
        at: mover.to,
        direction: mover.direction,
        reason: mover.arrival.reason,
      });
    }
  }

  // 6. Eventos e novo estado, sempre na ordem do contrato.
  const movementEvents: GameEvent[] = movers.map((mover) => ({
    kind: 'trainMoved',
    trainId: mover.train.id,
    from: mover.from,
    to: mover.to,
  }));

  const deliveryEvents: GameEvent[] = [];

  for (const train of state.trains) {
    const station = deliveryById.get(train.id);

    if (station !== undefined) {
      deliveryEvents.push({
        kind: 'trainDelivered',
        trainId: train.id,
        station,
      });
    }
  }

  const derailEvents: GameEvent[] = [];

  for (const train of state.trains) {
    const info = derailById.get(train.id);

    if (info !== undefined) {
      derailEvents.push({
        kind: 'trainDerailed',
        trainId: train.id,
        at: info.at,
        direction: info.direction,
        reason: info.reason,
      });
    }
  }

  // 6. Vidas: uma vida por EVENTO — cada colisão (independente do número de
  // trens) e cada descarrilamento com reason !== 'collision'. Colisão vence o
  // descarrilamento individual, então o duplo na mesma célula custa 1.
  let livesLeft = state.lives;
  const lifeLostEvents: GameEvent[] = [];

  if (livesLeft !== null) {
    let nonCollisionDerailments = 0;

    for (const info of derailById.values()) {
      if (info.reason !== 'collision') {
        nonCollisionDerailments += 1;
      }
    }

    const lifeLosses = collisionEvents.length + nonCollisionDerailments;

    for (let loss = 0; loss < lifeLosses; loss += 1) {
      livesLeft = Math.max(0, livesLeft - 1);
      lifeLostEvents.push({
        kind: 'lifeLost',
        step: state.step + 1,
        remaining: livesLeft,
      });
    }
  }

  const nextTrains = state.trains.map((train): Train => {
    if (train.status.kind === 'delivered' || train.status.kind === 'derailed') {
      return train;
    }

    const station = deliveryById.get(train.id);

    if (station !== undefined) {
      return { ...train, status: { kind: 'delivered' } };
    }

    const derailed = derailById.get(train.id);

    if (derailed !== undefined) {
      return {
        ...train,
        status: { kind: 'derailed', reason: derailed.reason },
      };
    }

    const mover = moverById.get(train.id);

    if (mover !== undefined) {
      return {
        ...train,
        status: {
          kind: 'running',
          cell: mover.to,
          incoming: mover.direction,
        },
      };
    }

    throw new Error(`resolveStep: estado do trem "${train.id}" não resolvido`);
  });

  const hasActive = nextTrains.some(
    (train) =>
      train.status.kind === 'waiting' || train.status.kind === 'running',
  );
  const hasDelivered = nextTrains.some(
    (train) => train.status.kind === 'delivered',
  );

  // D11: orçamento esgotado tem precedência sobre won/deadEnd no mesmo passo.
  // Fase sem vidas (lives null) nunca chega a lost.
  const status: GameStatus =
    livesLeft !== null && livesLeft === 0
      ? 'lost'
      : hasActive
        ? 'playing'
        : hasDelivered
          ? 'won'
          : 'deadEnd';

  const endEvents: GameEvent[] = [];

  if (status === 'won') {
    endEvents.push({ kind: 'victory' });
  }

  if (status === 'deadEnd') {
    endEvents.push({ kind: 'deadEnd' });
  }

  const events: readonly GameEvent[] = [
    ...movementEvents,
    ...deliveryEvents,
    ...collectionEvents,
    ...collisionEvents,
    ...derailEvents,
    ...lifeLostEvents,
    ...endEvents,
  ];

  const nextState: GameState = {
    ...state,
    trains: nextTrains,
    lives: livesLeft,
    step: state.step + 1,
    status,
  };

  return { state: nextState, events };
}
