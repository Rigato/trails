/**
 * Estrela dourada do selo de perfeição (D30): forma + cor, nunca cor sozinha.
 *
 * O mesmo símbolo aparece na lista de fases e no painel de vitória; vive aqui
 * para os dois desenhos não divergirem. O ouro é o da moeda, com contorno do
 * trilho e um brilho no miolo — legível sobre o fundo claro do tabuleiro sem
 * virar gradiente.
 */

import { TUNING } from '../config/tuning';
import { COIN_COLOR, COIN_HIGHLIGHT } from './coin';

const PALETTE = TUNING.palette;

/**
 * Desenha a estrela de cinco pontas centrada em (cx, cy).
 *
 * `radius` é a distância do centro à ponta; a escala do pulso, quando houver,
 * é aplicada pelo chamador em volta da estrela inteira.
 */
export function drawSealStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const points = 5;
  const inner = radius * 0.45;

  ctx.save();
  ctx.beginPath();

  for (let point = 0; point < points * 2; point += 1) {
    const r = point % 2 === 0 ? radius : inner;
    const angle = -Math.PI / 2 + (point * Math.PI) / points;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;

    if (point === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();
  ctx.fillStyle = COIN_COLOR;
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = Math.max(1, radius * 0.16);
  ctx.stroke();

  // Um brilho no miolo repete a leitura da moeda sem virar gradiente.
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = COIN_HIGHLIGHT;
  ctx.beginPath();
  ctx.arc(cx - radius * 0.16, cy - radius * 0.18, radius * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
