/**
 * Tabela de movimento do core.
 *
 * Toda a geometria de trilho vive aqui. `step.ts` e `prediction.ts` não
 * conhecem as conexões de reta/curva/Y: perguntam a `resolveCell` por onde o
 * trem sai (ou se ele para). Y (P1) já tem case; cruzamento e túnel (P3) entram
 * como novos cases nesta tabela, sem mudar o motor de passo.
 *
 * Convenção (ver `types.ts`): `incoming` é a direção de deslocamento com que o
 * trem entrou na célula. As conexões de uma peça são lados; o lado de entrada
 * é `opposite(incoming)`.
 */

import type {
  Cell,
  CellPos,
  CrossingPiece,
  CurvePiece,
  Direction,
  Piece,
  Rotation,
  StraightPiece,
  YPiece,
} from './types';
import { opposite, turnClockwise } from './types';

/** Os dois lados conectados por uma peça de trilho de dois lados. */
export type PieceConnections = readonly [Direction, Direction];

/** Gira as duas conexões de uma peça de dois lados `rot` quartos CW. */
function rotateConnections(
  base: PieceConnections,
  rot: Rotation,
): PieceConnections {
  let [first, second] = base;

  for (let turn = 0; turn < rot; turn += 1) {
    first = turnClockwise(first);
    second = turnClockwise(second);
  }

  return [first, second];
}

/**
 * Lados conectados por uma reta/curva, já na orientação `piece.rot`.
 *
 * Orientação canônica (`rot: 0`): reta norte–sul; curva norte–leste. Cada
 * quarto de volta CW gira as duas conexões juntas. O Y tem três lados e usa
 * `ySides` (abaixo); cruzamento/túnel terão helpers próprios.
 */
export function pieceConnections(
  piece: StraightPiece | CurvePiece,
): PieceConnections {
  switch (piece.kind) {
    case 'straight':
      return rotateConnections(['north', 'south'], piece.rot);
    case 'curve':
      return rotateConnections(['north', 'east'], piece.rot);
  }
}

/**
 * Os quatro lados de um Y na orientação atual.
 *
 * `stub` é o talo; `arm0`/`arm1` são as pontas relativas à peça (base L/O no
 * `rot: 0`); `closed` é o lado sem saída. A tabela canônica está em `types.ts`.
 */
export interface YSides {
  readonly stub: Direction;
  readonly arm0: Direction;
  readonly arm1: Direction;
  readonly closed: Direction;
}

/** Gira os quatro lados do Y `piece.rot` quartos CW. */
export function ySides(piece: YPiece): YSides {
  let stub: Direction = 'north';
  let arm0: Direction = 'east';
  let arm1: Direction = 'west';
  let closed: Direction = 'south';

  for (let turn = 0; turn < piece.rot; turn += 1) {
    stub = turnClockwise(stub);
    arm0 = turnClockwise(arm0);
    arm1 = turnClockwise(arm1);
    closed = turnClockwise(closed);
  }

  return { stub, arm0, arm1, closed };
}

/**
 * Fluxo do Y (GDD §3.2).
 *
 * Talo → ponta ativa; qualquer ponta (ativa ou inativa) → talo; lado fechado
 * → `noExit`. A ponta ativa é `arm` (relativo à peça), então o giro do conjunto
 * e a troca de braço mudam a saída sem ambiguidade.
 */
function moveThroughY(piece: YPiece, incoming: Direction): Direction | null {
  const sides = ySides(piece);
  const entrySide = opposite(incoming);

  if (entrySide === sides.stub) {
    return piece.arm === 0 ? sides.arm0 : sides.arm1;
  }

  if (entrySide === sides.arm0 || entrySide === sides.arm1) {
    return sides.stub;
  }

  return null;
}

/**
 * Cruzamento: dois canais retos independentes. O trem continua na MESMA
 * direção de deslocamento (entra pelo lado oposto e sai pelo lado de fuga);
 * `rot` não muda o conjunto de canais.
 */
function moveThroughCrossing(
  _piece: CrossingPiece,
  incoming: Direction,
): Direction {
  return incoming;
}

/**
 * Saída de uma peça de dois lados para um trem que entra na direção
 * `incoming`.
 *
 * Devolve a direção de saída (lado por onde o trem deixa a célula) ou `null`
 * quando o lado de entrada não está conectado — a peça não aceita o trem
 * naquela direção.
 */
function moveThroughTwoSidedPiece(
  piece: StraightPiece | CurvePiece,
  incoming: Direction,
): Direction | null {
  const connections = pieceConnections(piece);
  const entrySide = opposite(incoming);

  if (!connections.includes(entrySide)) {
    return null;
  }

  return connections.find((side) => side !== entrySide) ?? null;
}

/**
 * Tabela de saída por tipo de peça.
 *
 * Reta/curva compartilham a geometria de dois lados; o Y tem fluxo próprio.
 * Cruzamento/túnel (P3) entram como cases novos; um `PieceKind` sem case vira
 * erro de compilação.
 */
export function moveThroughPiece(
  piece: Piece,
  incoming: Direction,
): Direction | null {
  switch (piece.kind) {
    case 'straight':
    case 'curve':
      return moveThroughTwoSidedPiece(piece, incoming);
    case 'y':
      return moveThroughY(piece, incoming);
    case 'crossing':
      return moveThroughCrossing(piece, incoming);
  }
}

/**
 * Resultado de resolver uma célula para um trem que entra nela.
 *
 * - `exit`: a célula tem trilho e o trem sai na direção indicada;
 * - `tunnel`: o trem está num portal e atravessa para `to` (o parceiro),
 *   preservando a direção de deslocamento; a travessia custa este passo. A
 *   saída no portal parceiro é tratada no passo seguinte por `justTunneled`;
 * - `station`: a célula é estação; a entrega/descarrilamento depende da cor;
 * - `water`: a célula é rio; o trem para/descarrila na água;
 * - `mountain`: a célula é montanha; o trem para/descarrila nela;
 * - `noExit`: o trem para/descarrila na célula (vazia, peça sem conexão ou
 *   ponte acessada fora do eixo).
 */
export type CellExit =
  | { readonly kind: 'exit'; readonly direction: Direction }
  | { readonly kind: 'tunnel'; readonly to: CellPos }
  | { readonly kind: 'station' }
  | { readonly kind: 'water' }
  | { readonly kind: 'mountain' }
  | { readonly kind: 'noExit' };

/**
 * Resolve o que acontece com um trem que está sobre `cell` vindo de
 * `incoming`.
 *
 * Peças usam a tabela de movimento; a estação é um ponto de parada; o rio para
 * na água; a montanha para na montanha; a ponte conduz apenas ao longo do seu
 * eixo (quem entra de lado não conecta). O túnel conduz ao parceiro; o estado
 * `justTunneled` (tratado em `step`/`prediction`) decide a saída no passo
 * seguinte. A primeira célula da entrada é uma peça comum.
 */
export function resolveCell(cell: Cell, incoming: Direction): CellExit {
  switch (cell.kind) {
    case 'empty':
      return { kind: 'noExit' };

    case 'piece': {
      const direction = moveThroughPiece(cell.piece, incoming);
      return direction === null
        ? { kind: 'noExit' }
        : { kind: 'exit', direction };
    }

    case 'fixed':
      switch (cell.fixed.kind) {
        case 'station':
          return { kind: 'station' };
        case 'river':
          return { kind: 'water' };
        case 'mountain':
          return { kind: 'mountain' };
        case 'bridge': {
          const alongAxis =
            cell.fixed.axis === 'east-west'
              ? incoming === 'east' || incoming === 'west'
              : incoming === 'north' || incoming === 'south';

          return alongAxis
            ? { kind: 'exit', direction: incoming }
            : { kind: 'noExit' };
        }
        case 'tunnel':
          return { kind: 'tunnel', to: cell.fixed.exit };
      }
  }
}
