/**
 * Helpers de layout e estado para os testes do core.
 *
 * Não é um arquivo de teste (o Vitest só inclui `*.test.ts`). Os layouts são
 * dados puros; os testes de colisão fabricam 2–3 trens, como o plano exige.
 */

import type {
  Board,
  Cell,
  CellPos,
  Color,
  Direction,
  Game,
  GameEvent,
  GameState,
  GameStatus,
  LevelLayout,
  Rotation,
  Shape,
  Train,
  TrainSetup,
} from '../../src/core/types';
import { setup } from '../../src/core/game';

/** Par vermelho do P0. */
export const RED: Color = '#d64545';

/** Par azul para o segundo trem dos testes. */
export const BLUE: Color = '#2f6fb0';

/** Par verde para o terceiro trem dos testes. */
export const GREEN: Color = '#3f8f5f';

/** Célula vazia compartilhada pelos layouts de teste. */
export const EMPTY: Cell = { kind: 'empty' };

/** Célula com reta; `rot` é o quarto de volta CW a partir de norte–sul. */
export function straight(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'straight', rot } };
}

/** Célula com curva; `rot` é o quarto de volta CW a partir de norte–leste. */
export function curve(rot: Rotation): Cell {
  return { kind: 'piece', piece: { kind: 'curve', rot } };
}

/**
 * Célula com Y; `arm` é relativo à peça e `next` começa em `toggle` (ABAB).
 */
export function y(
  rot: Rotation,
  arm: 0 | 1,
  next: 'toggle' | 'rotate' = 'toggle',
): Cell {
  return { kind: 'piece', piece: { kind: 'y', rot, arm, next } };
}

/** Célula com cruzamento; `rot` é cosmético (canais N–S + E–W). */
export function crossing(rot: Rotation = 0): Cell {
  return { kind: 'piece', piece: { kind: 'crossing', rot } };
}

/** Célula de estação. */
export function station(color: Color = RED, shape: Shape = 'circle'): Cell {
  return { kind: 'fixed', fixed: { kind: 'station', color, shape } };
}

/** Célula de água de uma banda de rio. */
export function river(): Cell {
  return { kind: 'fixed', fixed: { kind: 'river' } };
}

/** Célula de ponte fixa; `axis` é o sentido da travessia. */
export function bridge(axis: 'east-west' | 'north-south'): Cell {
  return { kind: 'fixed', fixed: { kind: 'bridge', axis } };
}

/** Célula de portal de túnel apontando para o parceiro. */
export function tunnel(exit: CellPos): Cell {
  return { kind: 'fixed', fixed: { kind: 'tunnel', exit } };
}

/** Célula de montanha (intransponível). */
export function mountain(): Cell {
  return { kind: 'fixed', fixed: { kind: 'mountain' } };
}

/**
 * Primeira célula de entrada como trilho alinhado (helper de teste).
 *
 * O modelo novo não tem célula fixa de entrada: a primeira célula é uma peça
 * comum e pode ser reta, curva ou Y. Este helper monta a reta alinhada usada
 * pelos layouts de teste para preservar os timelines; `direction` é o sentido
 * em que o trem entra nela.
 */
export function entry(direction: Direction): Cell {
  return direction === 'north' || direction === 'south'
    ? straight(0)
    : straight(1);
}

/** Monta um `Board` a partir das linhas; a largura vem da primeira linha. */
export function board(rows: readonly (readonly Cell[])[]): Board {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;

  return { width, height, rows };
}

/** Coordenada de célula. */
export function pos(col: number, row: number): CellPos {
  return { col, row };
}

/**
 * Configuração de trem para um layout de teste.
 *
 * `direction` é o sentido de entrada (perpendicular à borda da `entryCell`); o
 * default `east` cobre os corredores horizontais e é sobrescrito nos testes de
 * entradas norte/sul/oeste.
 */
export function trainSetup(
  id: string,
  color: Color,
  shape: Shape,
  entryCell: CellPos,
  direction: Direction = 'east',
): TrainSetup {
  return { id, color, shape, entry: { cell: entryCell, direction } };
}

/** Monta uma fase de teste; `lives` ausente preserva D1. */
export function makeLevel(
  id: string,
  cells: Board,
  trains: readonly TrainSetup[],
  lives?: number,
): LevelLayout {
  return { id, name: id, board: cells, trains, lives };
}

/** Cria a fachada do jogo para um layout válido. */
export function makeGame(level: LevelLayout): Game {
  return setup(level);
}

/** Trem do snapshot, com erro claro se o id não existir. */
export function trainInState(state: GameState, id: string): Train {
  const train = state.trains.find((candidate) => candidate.id === id);

  if (train === undefined) {
    throw new Error(`Trem "${id}" não encontrado no estado.`);
  }

  return train;
}

/** Trem do jogo atual. */
export function trainById(game: Game, id: string): Train {
  return trainInState(game.state, id);
}

/** Trem já em campo, para estados fabricados de teste. */
export function runningTrain(
  id: string,
  color: Color,
  shape: Shape,
  cell: CellPos,
  incoming: Direction,
): Train {
  return {
    id,
    color,
    shape,
    status: { kind: 'running', cell, incoming },
  };
}

/** Snapshot fabricado para testar `resolveStep` sem passar pelo setup. */
export function gameState(
  cells: Board,
  trains: readonly Train[],
  step = 0,
  status: GameStatus = 'playing',
  lives: number | null = null,
  coinsCollected: readonly CellPos[] = [],
): GameState {
  return {
    levelId: 'test',
    board: cells,
    trains,
    lives,
    coinsCollected,
    step,
    status,
  };
}

/** Tipos de evento em ordem, para asserts de sequência. */
export function eventKinds(
  events: readonly GameEvent[],
): readonly GameEvent['kind'][] {
  return events.map((event) => event.kind);
}

export type TrainMovedEvent = Extract<GameEvent, { kind: 'trainMoved' }>;
export type TrainDeliveredEvent = Extract<GameEvent, { kind: 'trainDelivered' }>;
export type TrainDerailedEvent = Extract<GameEvent, { kind: 'trainDerailed' }>;
export type CollisionEvent = Extract<GameEvent, { kind: 'collision' }>;
export type PieceToggledEvent = Extract<GameEvent, { kind: 'pieceToggled' }>;
export type LifeLostEvent = Extract<GameEvent, { kind: 'lifeLost' }>;

export function movementsOf(
  events: readonly GameEvent[],
): readonly TrainMovedEvent[] {
  return events.filter(
    (event): event is TrainMovedEvent => event.kind === 'trainMoved',
  );
}

export function deliveriesOf(
  events: readonly GameEvent[],
): readonly TrainDeliveredEvent[] {
  return events.filter(
    (event): event is TrainDeliveredEvent =>
      event.kind === 'trainDelivered',
  );
}

export function derailsOf(
  events: readonly GameEvent[],
): readonly TrainDerailedEvent[] {
  return events.filter(
    (event): event is TrainDerailedEvent =>
      event.kind === 'trainDerailed',
  );
}

export function collisionsOf(
  events: readonly GameEvent[],
): readonly CollisionEvent[] {
  return events.filter(
    (event): event is CollisionEvent => event.kind === 'collision',
  );
}

export function togglesOf(
  events: readonly GameEvent[],
): readonly PieceToggledEvent[] {
  return events.filter(
    (event): event is PieceToggledEvent => event.kind === 'pieceToggled',
  );
}

export function lifeLossesOf(
  events: readonly GameEvent[],
): readonly LifeLostEvent[] {
  return events.filter(
    (event): event is LifeLostEvent => event.kind === 'lifeLost',
  );
}
