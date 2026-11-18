/**
 * Composição de um quadro: fundo, grade, previsões, trens e HUD.
 *
 * E2 desenha sempre o snapshot atual — sem animação. O E3 vai interpolar
 * entre snapshots sem mudar esta ordem de camadas: previsão por baixo do trem,
 * HUD por cima de tudo.
 */

import type { GameState, Prediction, Train, TrainId } from '../core/types';
import { TUNING } from '../config/tuning';
import { drawBoard } from './board';
import { drawHud } from './hud';
import type { SceneLayout } from './layout';
import { drawPrediction } from './predictionView';
import { drawTrain } from './train';

const PALETTE = TUNING.palette;

/** Tudo o que um quadro precisa saber, já derivado pela costura em `main.ts`. */
export interface Scene {
  readonly state: GameState;
  readonly predictions: readonly Prediction[];
  readonly levelName: string;
}

/** Desenha um quadro inteiro. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  scene: Scene,
): void {
  const { state } = scene;

  ctx.save();
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawBoard(ctx, layout, state.board);

  const trainsById = new Map<TrainId, Train>();
  for (const train of state.trains) {
    trainsById.set(train.id, train);
  }

  for (const prediction of scene.predictions) {
    const train = trainsById.get(prediction.trainId);

    if (train !== undefined) {
      drawPrediction(ctx, layout, state.board, prediction, train.color);
    }
  }

  for (const train of state.trains) {
    drawTrain(ctx, layout, train);
  }

  drawHud(ctx, layout, state, scene.levelName);
  ctx.restore();
}
