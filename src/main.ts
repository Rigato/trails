/**
 * Boot mínimo do Trails (E0).
 *
 * Só o shell: um canvas 2D vazio, centrado e DPR-aware. A área de jogo é uma
 * faixa portrait no desktop e ocupa a tela toda no celular. Grade, peças e
 * trens chegam nos próximos épicos.
 */

/** Proporção máxima largura/altura da área de jogo no desktop. */
const SHELL_ASPECT = 9 / 16;

/** Teto de DPR: acima disso o custo de fill rate não paga a nitidez. */
const MAX_DPR = 2;

/** Fundo da área de jogo — paleta de protótipo do plano de implementação §6. */
const BOARD_COLOR = '#f4f1ea';

function requiredElement<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`Elemento obrigatório ausente no index.html: ${selector}`);
  }

  return element;
}

function requiredContext(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { alpha: false });

  if (ctx === null) {
    throw new Error('Canvas 2D indisponível neste navegador.');
  }

  return ctx;
}

const stage = requiredElement<HTMLElement>('#stage');
const canvas = requiredElement<HTMLCanvasElement>('#game');
const ctx = requiredContext(canvas);

/** Ajusta o canvas ao espaço disponível; o CSS cuida de centrar a faixa. */
function resize(): void {
  const { width: availableWidth, height: availableHeight } = stage.getBoundingClientRect();

  if (availableWidth <= 0 || availableHeight <= 0) {
    return;
  }

  const cssWidth = Math.min(availableWidth, availableHeight * SHELL_ASPECT);
  const cssHeight = availableHeight;

  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const pixelWidth = Math.max(1, Math.round(cssWidth * dpr));
  const pixelHeight = Math.max(1, Math.round(cssHeight * dpr));

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  // Desenhe sempre em px CSS; o transform escala para o backing store.
  ctx.setTransform(pixelWidth / cssWidth, 0, 0, pixelHeight / cssHeight, 0, 0);
  ctx.fillStyle = BOARD_COLOR;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
}

window.addEventListener('resize', resize, { passive: true });
resize();
