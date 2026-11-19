/**
 * Previsão de trajetória (GDD §3.8): pontilhado na cor do trem a 55%, do ponto
 * atual até o primeiro ponto de parada.
 *
 * O traçado é UM caminho contínuo pela rota — arcos e retas com a mesma
 * geometria canônica das peças — para os pontinhos «marcharem» de célula em
 * célula sem reiniciar a fase a cada célula. A «marcha» anda pelo offset do
 * dash, derivado de `now` e de `predictionDashMs`: recalcular a previsão não
 * reinicia a fase, então a linha não pisca.
 *
 * A parada tem aparência própria: anel na estação certa, X no canto superior
 * direito da estação errada (fora do símbolo do par), seta na borda, sinal de
 * proibido em célula sem saída e anel com marcador no loop (D2).
 *
 * V-1: o traço colorido ganha um canal claro (cor de fundo) por baixo, largo o
 * bastante para o dash respirar sobre o trilho escuro. O canal é desenhado em
 * um passe separado para TODAS as previsões antes de qualquer traço colorido —
 * assim a segunda rota não apaga a primeira no corredor compartilhado.
 */

import type {
  Board,
  CellPos,
  Color,
  CurvePiece,
  Direction,
  Prediction,
  StraightPiece,
} from '../core/types';
import { cellAt, directionOffset, opposite, turnClockwise } from '../core/types';
import { TUNING } from '../config/tuning';
import { cellCenter, type SceneLayout } from './layout';
import { directionAngle } from './train';

const PALETTE = TUNING.palette;

/** Espessura mínima dos pontinhos e traços em px CSS. */
const MIN_STROKE = 2;
/** Opacidade dos marcadores de parada: mais visíveis que o pontilhado. */
const STOP_ALPHA = 0.82;
/** Comprimento do «ponto»: ~0 com lineCap redondo. */
const DOT_LENGTH = 0.01;
/** Espaçamento entre pontos como fração da célula. */
const DOT_GAP_RATIO = 0.16;
/** Padrão alternativo para o 2º par: traços curtos em vez de pontos. */
const DASH_LENGTH_RATIO = 0.07;
const DASH_GAP_RATIO = 0.13;
/** Largura do traço colorido como fração da célula. */
const DASH_WIDTH_RATIO = 0.07;
/** Extensão do canal claro sob o dash, em fração da célula (V-1). */
const UNDERLAY_EXTRA_RATIO = 0.12;

interface Point {
  readonly x: number;
  readonly y: number;
}

/** Direção de uma célula para a vizinha (um passo), ou `undefined`. */
function directionBetween(from: CellPos, to: CellPos): Direction | undefined {
  const dc = to.col - from.col;
  const dr = to.row - from.row;

  if (dc === 1 && dr === 0) {
    return 'east';
  }
  if (dc === -1 && dr === 0) {
    return 'west';
  }
  if (dc === 0 && dr === 1) {
    return 'south';
  }
  if (dc === 0 && dr === -1) {
    return 'north';
  }

  return undefined;
}

/**
 * Os dois lados conectados de uma peça, na convenção do core.
 *
 * Reta rot 0: N–S; rot 1: L–O. Curva rot 0: N–L; cada quarto CW gira os dois
 * lados juntos.
 */
function pieceSides(piece: StraightPiece | CurvePiece): readonly [Direction, Direction] {
  if (piece.kind === 'straight') {
    return piece.rot % 2 === 0 ? ['north', 'south'] : ['east', 'west'];
  }

  let first: Direction = 'north';
  let second: Direction = 'east';

  for (let turn = 0; turn < piece.rot; turn += 1) {
    first = turnClockwise(first);
    second = turnClockwise(second);
  }

  return [first, second];
}

/** Ponto médio da borda da célula no lado `side`. */
function edgePoint(center: Point, side: Direction, half: number): Point {
  const offset = directionOffset(side);

  return {
    x: center.x + offset.col * half,
    y: center.y + offset.row * half,
  };
}

/**
 * Curva a 90° da fase do dash: a marcha anda **uma célula por
 * `predictionDashMs`**. O offset é reduzido ao ciclo do padrão (que é
 * periódico), então o movimento é contínuo e não há salto no fim do período.
 */
function dashOffset(cellSize: number, now: number, cycle: number): number {
  const period = TUNING.predictionDashMs;

  if (!(period > 0) || !Number.isFinite(period) || !(cycle > 0)) {
    return 0;
  }

  const travel = (now / period) * cellSize;
  return -(travel % cycle);
}

/**
 * Constrói o caminho único da previsão no contexto corrente.
 *
 * Cada célula contribui com o trecho que o trem percorreria: a peça inteira
 * (reta ou arco), a ligação entre bordas de uma célula sem peça, ou o trecho
 * até o centro quando a rota morre sem saída. A estação não recebe pontilhado:
 * o marcador de parada fala por ela.
 */
function tracePredictionRoute(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  board: Board,
  prediction: Prediction,
): void {
  const { path } = prediction;
  const lastIndex = path.length - 1;

  if (lastIndex < 0) {
    return;
  }

  const half = layout.cell / 2;
  let cursor: Point | null = null;

  /** Posiciona o «lápis» sem quebrar a continuidade do traço. */
  function place(point: Point): void {
    if (cursor === null) {
      ctx.moveTo(point.x, point.y);
    } else if (
      Math.abs(cursor.x - point.x) > 0.01 ||
      Math.abs(cursor.y - point.y) > 0.01
    ) {
      ctx.lineTo(point.x, point.y);
    }

    cursor = point;
  }

  function lineTo(point: Point): void {
    ctx.lineTo(point.x, point.y);
    cursor = point;
  }

  for (let index = 0; index <= lastIndex; index += 1) {
    const cell = path[index];

    if (cell === undefined) {
      continue;
    }

    const content = cellAt(board, cell);
    const center = cellCenter(layout, cell);
    const previous = index > 0 ? path[index - 1] : undefined;
    const next = index < lastIndex ? path[index + 1] : undefined;
    const entrySide = previous ? directionBetween(cell, previous) : undefined;
    const exitSide = next ? directionBetween(cell, next) : undefined;

    if (content?.kind === 'fixed' && content.fixed.kind === 'station') {
      // A rota termina na borda da estação; o marcador de parada fala por ela.
      continue;
    }

    if (content?.kind === 'piece') {
      if (content.piece.kind === 'y') {
        // Y: a rota selecionada entra/sai por lados que o core já resolveu. O
        // traço passa pelo centro (o pino) e não tenta adivinhar o braço
        // ativo — a agulha é desenho da peça, não da previsão.
        const exit =
          exitSide ??
          (prediction.stop.kind === 'border' ? prediction.stop.direction : undefined);

        if (entrySide !== undefined) {
          place(edgePoint(center, entrySide, half));
          lineTo(center);
        } else {
          place(center);
        }

        if (exit !== undefined) {
          lineTo(edgePoint(center, exit, half));
        }
        continue;
      }

      const sides = pieceSides(content.piece);
      const entry =
        entrySide ??
        (exitSide !== undefined && sides[0] === exitSide ? sides[1] : sides[0]);
      const exit =
        exitSide ?? (entry === sides[0] ? sides[1] : sides[0]);

      // Rota que morre dentro da peça: só o trecho da entrada até o centro.
      if (!next && prediction.stop.kind === 'noExit') {
        if (previous !== undefined) {
          const entryPoint = edgePoint(center, entry, half);
          place(entryPoint);
          lineTo(center);
        }
        continue;
      }

      const entryPoint = edgePoint(center, entry, half);
      const exitPoint = edgePoint(center, exit, half);
      place(entryPoint);

      if (entry === opposite(exit)) {
        lineTo(exitPoint);
        continue;
      }

      if (entry !== exit) {
        const entryOffset = directionOffset(entry);
        const exitOffset = directionOffset(exit);
        const corner: Point = {
          x: center.x + (entryOffset.col + exitOffset.col) * half,
          y: center.y + (entryOffset.row + exitOffset.row) * half,
        };
        const startAngle = Math.atan2(
          entryPoint.y - corner.y,
          entryPoint.x - corner.x,
        );
        const endAngle = Math.atan2(
          exitPoint.y - corner.y,
          exitPoint.x - corner.x,
        );
        let delta = endAngle - startAngle;

        while (delta > Math.PI) {
          delta -= Math.PI * 2;
        }
        while (delta < -Math.PI) {
          delta += Math.PI * 2;
        }

        ctx.arc(corner.x, corner.y, half, startAngle, startAngle + delta, delta < 0);
        cursor = exitPoint;
        continue;
      }

      lineTo(exitPoint);
      continue;
    }

    // Célula sem peça: liga as bordas médias (ou o centro, nas pontas).
    const entryPoint = entrySide ? edgePoint(center, entrySide, half) : center;
    const exitPoint = exitSide ? edgePoint(center, exitSide, half) : center;

    place(entryPoint);

    if (
      Math.abs(exitPoint.x - entryPoint.x) > 0.01 ||
      Math.abs(exitPoint.y - entryPoint.y) > 0.01
    ) {
      lineTo(exitPoint);
    }
  }
}

/**
 * Canal claro sob a rota de uma previsão (V-1).
 *
 * O traço colorido a 55% sobre o trilho escuro (#3a3f44) perde contraste; este
 * passe pinta o MESMO caminho com a cor de fundo e uma largura moderada
 * (`dash + 0,12 célula`), criando um corredor claro sem tocar nas peças fora da
 * rota. O chamador desenha todos os canais antes dos traços coloridos.
 */
export function drawPredictionUnderlay(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  board: Board,
  prediction: Prediction,
): void {
  if (prediction.path.length === 0 || layout.cell <= 0) {
    return;
  }

  const dashWidth = Math.max(MIN_STROKE, layout.cell * DASH_WIDTH_RATIO);

  ctx.save();
  ctx.strokeStyle = PALETTE.background;
  ctx.globalAlpha = 1;
  ctx.lineWidth = dashWidth + layout.cell * UNDERLAY_EXTRA_RATIO;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([]);
  ctx.beginPath();
  tracePredictionRoute(ctx, layout, board, prediction);
  ctx.stroke();
  ctx.restore();
}

/**
 * Desenha o traço colorido e o marcador de parada de uma previsão.
 *
 * O trajeto já vem do core; o render só escolhe a geometria de cada célula e
 * o marcador do ponto de parada. `now` move a marcha dos pontinhos. `variant`
 * alterna o padrão (0 = pontos redondos, 1 = traços curtos) para dois trens
 * simultâneos não serem confundidos só pela cor. O canal claro (V-1) é um
 * passe separado, desenhado antes de todos os traços.
 */
export function drawPrediction(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  board: Board,
  prediction: Prediction,
  color: Color,
  now: number,
  variant = 0,
): void {
  const path = prediction.path;
  const lastIndex = path.length - 1;
  const lastCell = path[lastIndex];

  if (!lastCell || layout.cell <= 0) {
    return;
  }

  const cellSize = layout.cell;
  const dashLength =
    variant % 2 === 0 ? DOT_LENGTH : Math.max(1, cellSize * DASH_LENGTH_RATIO);
  const dashGap = cellSize * (variant % 2 === 0 ? DOT_GAP_RATIO : DASH_GAP_RATIO);

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Marcha contínua: um único caminho + offset de dash dependente do relógio.
  ctx.globalAlpha = PALETTE.predictionAlpha;
  ctx.lineWidth = Math.max(MIN_STROKE, cellSize * DASH_WIDTH_RATIO);
  ctx.setLineDash([dashLength, dashGap]);
  ctx.lineDashOffset = dashOffset(cellSize, now, dashLength + dashGap);

  ctx.beginPath();
  tracePredictionRoute(ctx, layout, board, prediction);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;
  ctx.globalAlpha = STOP_ALPHA;
  drawStopMarker(ctx, layout, prediction, color);

  ctx.restore();
}

/** Marcador do ponto onde a previsão termina. */
function drawStopMarker(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  prediction: Prediction,
  color: Color,
): void {
  const cellSize = layout.cell;
  const center = cellCenter(layout, prediction.stop.cell);
  const stop = prediction.stop;

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.035);

  switch (stop.kind) {
    case 'station': {
      if (stop.correct) {
        // Anel em volta da casa: «chegou ao destino».
        ctx.beginPath();
        ctx.arc(center.x, center.y, cellSize * 0.44, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // X no canto superior direito da célula (V-2): menor e deslocado para
        // fora do símbolo do par, preservando a casa, o quadrado/círculo e o
        // anel da chegada correta (GDD §5).
        const x = center.x + cellSize * 0.22;
        const y = center.y - cellSize * 0.22;
        const reach = cellSize * 0.16;
        ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.055);
        ctx.beginPath();
        ctx.moveTo(x - reach, y - reach);
        ctx.lineTo(x + reach, y + reach);
        ctx.moveTo(x + reach, y - reach);
        ctx.lineTo(x - reach, y + reach);
        ctx.stroke();
      }
      break;
    }

    case 'border': {
      // Seta saindo da grade na direção de fuga.
      const angle = directionAngle(stop.direction);
      const anchor = {
        x: center.x + Math.cos(angle) * cellSize * 0.4,
        y: center.y + Math.sin(angle) * cellSize * 0.4,
      };
      drawChevron(ctx, anchor.x, anchor.y, angle, cellSize * 0.22, cellSize * 0.055);
      break;
    }

    case 'noExit': {
      // Sinal de proibido (anel + barra): a rota não tem saída. Distinto do X
      // de estação errada e legível mesmo sobre um trilho vertical.
      const radius = cellSize * 0.26;
      const diagonal = radius * 0.7;
      ctx.lineWidth = Math.max(MIN_STROKE, cellSize * 0.04);
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(center.x - diagonal, center.y - diagonal);
      ctx.lineTo(center.x + diagonal, center.y + diagonal);
      ctx.stroke();
      break;
    }

    case 'loop': {
      // Anel fechado com marcador de ciclo (D2).
      const radius = cellSize * 0.3;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
      ctx.stroke();

      const arrowSize = cellSize * 0.09;
      ctx.beginPath();
      ctx.moveTo(center.x + arrowSize * 1.4, center.y - radius);
      ctx.lineTo(center.x + arrowSize * 0.2, center.y - radius - arrowSize);
      ctx.lineTo(center.x + arrowSize * 0.2, center.y - radius + arrowSize);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'limit': {
      // Trava de segurança: alvo vazado, sem prometer parada natural.
      const half = cellSize * 0.15;
      ctx.strokeRect(center.x - half, center.y - half, half * 2, half * 2);
      break;
    }
  }
}

/** Chevron apontando em `angle`, centrado em (x, y). */
function drawChevron(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  lineWidth: number,
): void {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = -dy;
  const py = dx;

  ctx.save();
  ctx.lineWidth = Math.max(MIN_STROKE, lineWidth);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(
    x - dx * size * 0.4 + px * size * 0.5,
    y - dy * size * 0.4 + py * size * 0.5,
  );
  ctx.lineTo(x + dx * size * 0.5, y + dy * size * 0.5);
  ctx.lineTo(
    x - dx * size * 0.4 - px * size * 0.5,
    y - dy * size * 0.4 - py * size * 0.5,
  );
  ctx.stroke();
  ctx.restore();
}
