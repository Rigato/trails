/**
 * Tabela de movimento do core.
 *
 * Toda a geometria de trilho vive aqui. `step.ts` e `prediction.ts` não
 * conhecem as conexões de reta/curva: perguntam a `resolveCell` por onde o
 * trem sai (ou se ele para). Y (P1), cruzamento (P3) e túnel (P3) entram como
 * novos cases nesta tabela, sem mudar o motor de passo.
 *
 * Convenção (ver `types.ts`): `incoming` é a direção de deslocamento com que o
 * trem entrou na célula. As conexões de uma peça são lados; o lado de entrada
 * é `opposite(incoming)`.
 */

import type { Cell, Direction, Piece, Rotation } from './types';
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
 * Lados conectados por uma peça, já na orientação `piece.rot`.
 *
 * Orientação canônica (`rot: 0`): reta norte–sul; curva norte–leste. Cada
 * quarto de volta CW gira as duas conexões juntas. Y e cruzamento (P1/P3) não
 * são peças de dois lados: entram como novos cases/helpers, não como um novo
 * ramo desta função.
 */
export function pieceConnections(piece: Piece): PieceConnections {
  switch (piece.kind) {
    case 'straight':
      return rotateConnections(['north', 'south'], piece.rot);
    case 'curve':
      return rotateConnections(['north', 'east'], piece.rot);
  }
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
  piece: Piece,
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
 * O `switch` é deliberado: reta e curva compartilham a mesma geometria de dois
 * lados, mas Y (P1), cruzamento (P3) e túnel (P3) exigem cases próprios. Um
 * novo `PieceKind` sem case aqui (ou em `pieceConnections`) vira erro de
 * compilação, não um comportamento silencioso de curva.
 */
export function moveThroughPiece(
  piece: Piece,
  incoming: Direction,
): Direction | null {
  switch (piece.kind) {
    case 'straight':
    case 'curve':
      return moveThroughTwoSidedPiece(piece, incoming);
  }
}

/**
 * Resultado de resolver uma célula para um trem que entra nela.
 *
 * - `exit`: a célula tem trilho e o trem sai na direção indicada;
 * - `station`: a célula é estação; a entrega/descarrilamento depende da cor;
 * - `noExit`: o trem para/descarrila na célula (vazia, peça sem conexão ou
 *   entrada acessada no sentido errado).
 */
export type CellExit =
  | { readonly kind: 'exit'; readonly direction: Direction }
  | { readonly kind: 'station' }
  | { readonly kind: 'noExit' };

/**
 * Resolve o que acontece com um trem que está sobre `cell` vindo de
 * `incoming`.
 *
 * A entrada é especial: ela só conduz para dentro quando o trem chega viajando
 * na direção marcada (`entry.direction`); qualquer outro sentido é bloqueado.
 * A estação não é atravessada por um trem em movimento — quem chama decide
 * entrega ou descarrilamento pela cor.
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
        case 'entry':
          return incoming === cell.fixed.direction
            ? { kind: 'exit', direction: cell.fixed.direction }
            : { kind: 'noExit' };
      }
  }
}
