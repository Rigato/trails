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
}

/**
 * Posição inicial da previsão.
 *
 * Trem `waiting` ainda está fora da grade, mas o trajeto começa na célula de
 * entrada, viajando na direção marcada pela `Entry`. Trem `running` começa na
 * célula atual com sua direção de entrada. Entregue/descarrilado não tem
 * previsão.
 */
function startState(train: Train): StartState | undefined {
  switch (train.status.kind) {
    case 'waiting':
      return { cell: train.status.cell, incoming: train.status.direction };
    case 'running':
      return { cell: train.status.cell, incoming: train.status.incoming };
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

/** Chave de estado de loop: célula + direção de entrada (§3.8/D2). */
function stateKey(cell: CellPos, incoming: Direction): string {
  return `${cellKey(cell)}:${incoming}`;
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
 * posição inicial (ou a célula de entrada, para `waiting`) e termina em
 * `stop.cell`; em um loop, a última célula repete uma anterior com a mesma
 * direção de entrada e `loop` é `true`. `maxSteps` limita o número de células
 * do trajeto (default 24).
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
  const visited = new Set<string>([stateKey(start.cell, start.incoming)]);

  let current = start.cell;
  let incoming = start.incoming;

  for (;;) {
    const cell = cellAt(board, current);

    if (cell === undefined) {
      return finish(train, path, { kind: 'noExit', cell: current });
    }

    const exit = resolveCell(cell, incoming);

    if (exit.kind === 'noExit') {
      return finish(train, path, { kind: 'noExit', cell: current });
    }

    if (exit.kind === 'station') {
      const correct =
        cell.kind === 'fixed' &&
        cell.fixed.kind === 'station' &&
        cell.fixed.color === train.color;

      return finish(train, path, { kind: 'station', cell: current, correct });
    }

    const next = neighbor(current, exit.direction);

    if (!inBounds(board, next)) {
      return finish(train, path, {
        kind: 'border',
        cell: current,
        direction: exit.direction,
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

    if (destination.kind === 'fixed' && destination.fixed.kind === 'entry') {
      return finish(train, path, { kind: 'noExit', cell: next });
    }

    const destinationExit = resolveCell(destination, exit.direction);

    if (destinationExit.kind !== 'exit') {
      return finish(train, path, { kind: 'noExit', cell: next });
    }

    const key = stateKey(next, exit.direction);

    if (visited.has(key)) {
      return finish(train, path, { kind: 'loop', cell: next });
    }

    visited.add(key);
    current = next;
    incoming = exit.direction;
  }
}
