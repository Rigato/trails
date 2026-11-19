/**
 * Previsão de trajetória por locomotiva (GDD §3.8).
 *
 * A previsão é independente por trem: ignora os outros trens e não modela
 * colisões — a colisão é a única incerteza permitida pelo Pilar 3. O trajeto
 * reflete o estado atual das peças e termina no primeiro ponto de parada
 * (estação, borda, célula sem saída), em um loop fechado (D2) ou no cap de
 * segurança.
 */

import type {
  Board,
  CellPos,
  Direction,
  Prediction,
  PredictionStop,
  Train,
} from './types';
import { cellAt, cellKey, inBounds, neighbor } from './types';
import { resolveCell } from './movement';

/** Cap default de segurança da simulação (D2): invisível ao jogador. */
export const DEFAULT_PREDICTION_STEPS = 24;

interface StartState {
  readonly cell: CellPos;
  readonly incoming: Direction;
  readonly justTunneled: boolean;
}

/**
 * Posição inicial da previsão.
 *
 * Trem `waiting` ainda está fora da grade, mas o trajeto começa na primeira
 * célula de trilho da entrada (`entry.cell`), viajando na direção marcada por
 * `entry.direction`; a própria peça dessa célula já é resolvida, então uma
 * entrada torta aparece como `noExit` ali antes do primeiro passo. Trem
 * `running` começa na célula atual com sua direção de entrada. Entregue ou
 * descarrilado não tem previsão.
 */
function startState(train: Train): StartState | undefined {
  switch (train.status.kind) {
    case 'waiting':
      return {
        cell: train.status.cell,
        incoming: train.status.direction,
        justTunneled: false,
      };
    case 'running':
      return {
        cell: train.status.cell,
        incoming: train.status.incoming,
        justTunneled: train.status.justTunneled === true,
      };
    case 'delivered':
    case 'derailed':
      return undefined;
  }
}

/** Normaliza o cap para um inteiro ≥ 1; valores não finitos usam o default. */
function normalizeCap(maxSteps: number): number {
  if (!Number.isFinite(maxSteps)) {
    return DEFAULT_PREDICTION_STEPS;
  }

  return Math.max(1, Math.floor(maxSteps));
}

/** Chave de estado de loop: célula + direção de entrada + pós-túnel (§3.8/D2). */
function stateKey(
  cell: CellPos,
  incoming: Direction,
  justTunneled: boolean,
): string {
  return `${cellKey(cell)}:${incoming}:${justTunneled ? 't' : 'f'}`;
}

function finish(
  train: Train,
  path: readonly CellPos[],
  stop: PredictionStop,
): Prediction {
  return {
    trainId: train.id,
    path,
    stop,
    loop: stop.kind === 'loop',
  };
}

/**
 * Calcula o caminho futuro de um trem.
 *
 * Devolve `undefined` para trem entregue ou descarrilado. O `path` inclui a
 * posição inicial (ou a primeira célula de trilho da entrada, para `waiting`)
 * e termina em `stop.cell`; em um loop, a última célula repete uma anterior com
 * a mesma direção de entrada e `loop` é `true`. `maxSteps` limita o número de
 * células do trajeto (default 24). O trajeto atravessa pares de túnel
 * (incluindo os dois portais) e para na montanha com `stop.kind:'mountain'`.
 */
export function predictPath(
  board: Board,
  train: Train,
  maxSteps = DEFAULT_PREDICTION_STEPS,
): Prediction | undefined {
  const start = startState(train);

  if (start === undefined) {
    return undefined;
  }

  const cap = normalizeCap(maxSteps);
  const path: CellPos[] = [start.cell];
  const visited = new Set<string>([
    stateKey(start.cell, start.incoming, start.justTunneled),
  ]);

  let current = start.cell;
  let incoming = start.incoming;
  let justTunneled = start.justTunneled;

  for (;;) {
    const cell = cellAt(board, current);

    if (cell === undefined) {
      return finish(train, path, { kind: 'noExit', cell: current });
    }

    // Trem que acabou de emergir do túnel sai pelo lado correspondente à
    // direção preservada; não atravessa de volta.
    const exit =
      cell.kind === 'fixed' &&
      cell.fixed.kind === 'tunnel' &&
      justTunneled
        ? { kind: 'exit' as const, direction: incoming }
        : resolveCell(cell, incoming);

    if (exit.kind === 'noExit') {
      return finish(train, path, { kind: 'noExit', cell: current });
    }

    if (exit.kind === 'water') {
      return finish(train, path, { kind: 'water', cell: current });
    }

    if (exit.kind === 'mountain') {
      return finish(train, path, { kind: 'mountain', cell: current });
    }

    if (exit.kind === 'station') {
      const correct =
        cell.kind === 'fixed' &&
        cell.fixed.kind === 'station' &&
        cell.fixed.color === train.color;

      return finish(train, path, { kind: 'station', cell: current, correct });
    }

    const next =
      exit.kind === 'tunnel' ? exit.to : neighbor(current, exit.direction);
    const nextIncoming =
      exit.kind === 'tunnel' ? incoming : exit.direction;
    const nextTunneled = exit.kind === 'tunnel';

    if (!inBounds(board, next)) {
      return finish(train, path, {
        kind: 'border',
        cell: current,
        direction: nextIncoming,
      });
    }

    // A borda acima não adiciona célula; o cap só precisa travar a simulação
    // quando o próximo passo exigiria mais uma célula no trajeto.
    if (path.length >= cap) {
      return finish(train, path, { kind: 'limit', cell: current });
    }

    const destination = cellAt(board, next);

    if (destination === undefined) {
      return finish(train, path, { kind: 'noExit', cell: next });
    }

    path.push(next);

    if (destination.kind === 'fixed' && destination.fixed.kind === 'station') {
      return finish(train, path, {
        kind: 'station',
        cell: next,
        correct: destination.fixed.color === train.color,
      });
    }

    if (destination.kind === 'empty') {
      return finish(train, path, { kind: 'noExit', cell: next });
    }

    if (
      destination.kind === 'fixed' &&
      destination.fixed.kind === 'river'
    ) {
      return finish(train, path, { kind: 'water', cell: next });
    }

    if (
      destination.kind === 'fixed' &&
      destination.fixed.kind === 'mountain'
    ) {
      return finish(train, path, { kind: 'mountain', cell: next });
    }

    // Chegar a um portal é uma parada intermediária: o próximo laço resolve a
    // travessia (ou a saída, se o trem acabou de emergir do parceiro).
    if (
      destination.kind !== 'fixed' ||
      destination.fixed.kind !== 'tunnel'
    ) {
      const destinationExit = resolveCell(destination, nextIncoming);

      if (destinationExit.kind === 'water') {
        return finish(train, path, { kind: 'water', cell: next });
      }

      if (destinationExit.kind === 'mountain') {
        return finish(train, path, { kind: 'mountain', cell: next });
      }

      if (destinationExit.kind !== 'exit') {
        return finish(train, path, { kind: 'noExit', cell: next });
      }
    }

    const key = stateKey(next, nextIncoming, nextTunneled);

    if (visited.has(key)) {
      return finish(train, path, { kind: 'loop', cell: next });
    }

    visited.add(key);
    current = next;
    incoming = nextIncoming;
    justTunneled = nextTunneled;
  }
}
