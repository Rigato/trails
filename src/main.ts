/**
 * Boot do protótipo P0 «Contrato» e costura render ↔ input ↔ core.
 *
 * O core é a única autoridade de regra: o input entrega `Action`, `apply`
 * devolve `ApplyResult`, e o render desenha o snapshot novo. E2 não anima —
 * cada ação válida aparece no quadro seguinte, instantaneamente. O loop de
 * animação e o buffer entram no E3 sem mudar esta costura.
 */

import { TUNING } from './config/tuning';
import type { Action, Game, Prediction } from './core/types';
import { setup } from './core/game';
import { attachPointerInput } from './input/pointer';
import { P0_LEVEL } from './level/p0';
import { computeLayout, type SceneLayout } from './render/layout';
import { drawScene } from './render/scene';

/** Proporção máxima largura/altura da faixa de jogo no desktop. */
const SHELL_ASPECT = 9 / 16;

/** Teto de DPR: acima disso o custo de fill rate não paga a nitidez. */
const MAX_DPR = 2;

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

const game: Game = setup(P0_LEVEL);

/** Previsões do quadro atual; recalculadas após cada passo e cada reset. */
let predictions: Prediction[] = collectPredictions();
let layout: SceneLayout = computeLayout(1, 1, game.state.board);

function collectPredictions(): Prediction[] {
  const result: Prediction[] = [];

  for (const train of game.state.trains) {
    const prediction = game.prediction(train.id, TUNING.predictionSafetyCapSteps);

    if (prediction !== undefined) {
      result.push(prediction);
    }
  }

  return result;
}

function render(): void {
  drawScene(ctx, layout, {
    state: game.state,
    predictions,
    levelName: P0_LEVEL.name,
  });
}

/** Após qualquer mudança de estado: previsão reflete as peças atuais. */
function afterStateChange(): void {
  predictions = collectPredictions();
  render();
}

function onAction(action: Action): void {
  const result = game.apply(action);

  // null/blocked/ignored não mudam nada (o flash é E3). Só `advanced` produz
  // um snapshot novo — e exatamente um passo.
  if (result.advanced) {
    afterStateChange();
  }
}

function onReset(): void {
  game.reset();
  afterStateChange();
}

/** Ajusta a faixa de jogo e o backing store; recalcula layout e redesenha. */
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
  layout = computeLayout(cssWidth, cssHeight, game.state.board);
  render();
}

attachPointerInput(canvas, {
  getLayout: () => layout,
  onAction,
  onReset,
});

window.addEventListener('resize', resize, { passive: true });
window.visualViewport?.addEventListener('resize', resize, { passive: true });

if (typeof ResizeObserver !== 'undefined') {
  new ResizeObserver(() => resize()).observe(stage);
}

resize();
