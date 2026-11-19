/**
 * Peças móveis desenhadas por código — sem nenhum asset.
 *
 * A orientação canônica é a do contrato (`core/types.ts`): reta rot 0 = N–S;
 * curva rot 0 = N–E; Y rot 0 = talo N, braços L/O e lado S fechado. `rot` gira
 * o conjunto 90° CW. O desenho aplica a mesma rotação de contexto, então
 * render e regra não podem divergir.
 *
 * `angleRad` opcional é o gancho do E3: durante o giro animado a peça é
 * desenhada num ângulo contínuo (fora dos múltiplos de 90°) sem que a regra
 * saiba da animação.
 *
 * Y (pós-playtest): três stubs + **seta da rota** do talo (na borda) ao centro
 * e à ponta ativa, + **realce claro do canal ativo**. O lado fechado não tem
 * trilho. D9: `next` não é desenhado — a indicação mostra só o estado atual,
 * nunca a próxima ação ABAB.
 *
 * A seta e o realce são desenhados no MESMO `drawPiece`; no giro do Y eles
 * giram com a peça (`angle`). No toque-toggle, os stubs ficam parados e só o
 * ângulo local do canal (`needleAngleRad`) varre do braço antigo ao novo, pelo
 * lado fechado (`yNeedleSweepAngle` em `fx.ts`).
 */

import type { Piece, YPiece } from '../core/types';
import { TUNING } from '../config/tuning';

/** Espessura mínima do trilho em px CSS (legibilidade em DPR 1). */
const MIN_TRACK_WIDTH = 2;
/** Contorno mínimo do traço/da seta em px CSS. */
const MIN_ROUTE_OUTLINE = 1.5;

/**
 * Constrói o traçado canônico de uma peça no contexto atual, sem espessura nem
 * cor. O chamador decide o stroke. A previsão pontilhada reconstrói a mesma
 * geometria canônica (reta entre bordas opostas; arco no canto; Y com três
 * stubs) em um caminho contínuo, então a rota nunca «descola» do trilho.
 */
export function tracePiecePath(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  angleRad: number = (piece.rot * Math.PI) / 2,
): void {
  const half = cell / 2;

  ctx.save();
  ctx.translate(x + half, y + half);
  ctx.rotate(angleRad);
  ctx.translate(-half, -half);

  ctx.beginPath();

  if (piece.kind === 'straight') {
    // Canônico: norte–sul, atravessando a célula de ponta a ponta.
    ctx.moveTo(half, 0);
    ctx.lineTo(half, cell);
  } else if (piece.kind === 'curve') {
    // Canônico: norte–leste. Centro no canto NE; arco pela borda interna do
    // canto, tangente aos lados norte e leste.
    ctx.arc(cell, 0, half, Math.PI / 2, Math.PI, false);
  } else {
    // Y canônico: talo N + braços L/O até o centro; o lado S fechado fica sem
    // traço. O encontro no centro é coberto pelo pino desenhado em drawPiece.
    ctx.moveTo(half, 0);
    ctx.lineTo(half, half);
    ctx.moveTo(cell, half);
    ctx.lineTo(half, half);
    ctx.moveTo(0, half);
    ctx.lineTo(half, half);
  }

  ctx.restore();
}

/**
 * Desenha uma peça com o canto superior esquerdo da célula em (x, y).
 *
 * Reta: traço dos dois lados opostos (N–S canônico). Curva: arco de um quarto
 * de volta que encosta no canto entre os dois lados conectados (N–E canônico).
 * Y: três stubs + seta da rota + realce do canal ativo; o lado fechado fica
 * vazio. `angleRad` permite o giro animado do E3. `needleAngleRad` é o ângulo
 * LOCAL do canal ativo (0 = braço 0/leste canônico, π = braço 1/oeste
 * canônico): no toggle, a seta e o realce varrem por ele sem girar os stubs.
 */
export function drawPiece(
  ctx: CanvasRenderingContext2D,
  piece: Piece,
  x: number,
  y: number,
  cell: number,
  color: string,
  angleRad?: number,
  needleAngleRad?: number,
): void {
  const lineWidth = Math.max(MIN_TRACK_WIDTH, cell * TUNING.trackWidthRatio);
  const angle = angleRad ?? (piece.rot * Math.PI) / 2;

  ctx.save();
  tracePiecePath(ctx, piece, x, y, cell, angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'butt';
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  if (piece.kind === 'y') {
    drawYRoute(ctx, piece, x, y, cell, color, lineWidth, angle, needleAngleRad);
  }
}

/**
 * Seta da rota + realce do canal ativo (substitui a cunha do E7/E8).
 *
 * **Leitura:** uma linha clara fina sai do TALO (na borda da célula), passa
 * pelo pino central e vira o canal ativo; o canal é um stub claro e mais
 * grosso, com bordas escuras, que termina numa PONTA DE SETA clara contornada
 * de trilho na ponta ativa. Assim «quem vem do talo vai por aqui» se lê pela
 * rota, e o canal ligado se lê pela largura/claridade (redundância). O talo e
 * a ponta inativa continuam no traço normal; o lado fechado não tem trilho.
 * D9: nada indica a próxima ação ABAB.
 *
 * **Varredura:** `needleAngleRad` é local (0 = braço 0/leste, π = braço 1/
 * oeste). A passagem pelo lado FECHADO (local +π/2) evita varrer por cima do
 * talo. A linha do talo é fixa; o canal e a ponta giram com o ângulo local. No
 * giro do Y, `angle` gira o conjunto.
 *
 * **Tamanho sem parâmetro novo:** `yNeedleRatio` (0,38) dimensiona a PONTA —
 * comprimento 0,78× e meia-largura 0,46×. O canal usa a espessura do trilho; a
 * linha do talo e o contorno são constantes locais. O valor antigo da cunha
 * (0,38) é assim reaproveitado como driver da seta.
 *
 * Cores: a linha, o canal e o miolo da ponta usam a cor de fundo; o contorno
 * do canal e da ponta usa a cor do trilho. O canal tem bordas escuras para não
 * sumir no fundo creme; a ponta contornada também lê sobre o branco da
 * previsão (V-1), onde só o contorno escuro sobrevive. O pino escuro fecha a
 * junção.
 */
function drawYRoute(
  ctx: CanvasRenderingContext2D,
  piece: YPiece,
  x: number,
  y: number,
  cell: number,
  color: string,
  trackWidth: number,
  angle: number,
  needleAngleRad?: number,
): void {
  const half = cell / 2;
  const localAngle = needleAngleRad ?? (piece.arm === 0 ? 0 : Math.PI);
  const background = TUNING.palette.background;

  // Ponta: yNeedleRatio conduz o tamanho (reaproveitamento documentado).
  const tipRadius = half - cell * 0.035;
  const headLength = cell * TUNING.yNeedleRatio * 0.78;
  const headHalfWidth = cell * TUNING.yNeedleRatio * 0.46;
  const baseRadius = Math.max(0, tipRadius - headLength);

  const outline = Math.max(MIN_ROUTE_OUTLINE, cell * 0.034);
  const routeWidth = Math.max(MIN_TRACK_WIDTH * 0.75, trackWidth * 0.28);
  // Canal ativo: mais grosso que o trilho, claro, com borda escura.
  const channelOuter = Math.max(trackWidth, trackWidth * 1.85);
  const channelInner = Math.max(trackWidth * 0.6, trackWidth * 1.42);

  ctx.save();
  ctx.translate(x + half, y + half);
  ctx.rotate(angle);

  // 1. Canal ativo: borda escura + miolo claro, do pino à base da ponta.
  ctx.save();
  ctx.rotate(localAngle);
  ctx.lineCap = 'butt';

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(baseRadius, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = channelOuter;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(baseRadius, 0);
  ctx.strokeStyle = background;
  ctx.lineWidth = channelInner;
  ctx.stroke();

  // 2. Ponta de seta clara, contornada de trilho, na ponta ativa.
  ctx.beginPath();
  ctx.moveTo(tipRadius, 0);
  ctx.lineTo(baseRadius, -headHalfWidth);
  ctx.lineTo(baseRadius, headHalfWidth);
  ctx.closePath();
  ctx.fillStyle = background;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = outline;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();

  // 3. Linha da rota no talo (borda ao pino), fina e clara.
  const routeStart = -half + routeWidth / 2;
  ctx.beginPath();
  ctx.moveTo(0, routeStart);
  ctx.lineTo(0, 0);
  ctx.strokeStyle = background;
  ctx.lineWidth = routeWidth;
  ctx.lineCap = 'round';
  ctx.stroke();

  // 4. Pino central: cobre a junção dos stubs, o início do canal e o pivô.
  ctx.beginPath();
  ctx.arc(0, 0, trackWidth * 0.46, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.restore();
}
