/**
 * Composição de um quadro: fundo, grade, previsões, trens, feedbacks e HUD.
 *
 * A cena é 100% derivada: `main.ts` decide posições interpoladas, ângulos de
 * giro, escalas do pulse e fantasmas; este módulo só desenha na ordem certa.
 * Previsão por baixo do trem; flashes discretos por cima do trilho; HUD por
 * cima de tudo.
 */

import type {
  CellPos,
  GameState,
  Prediction,
  Train,
  TrainId,
} from '../core/types';
import { TUNING } from '../config/tuning';
import { drawBoard } from './board';
import {
  drawCellFlash,
  drawDeliveryPulse,
  drawDerailExit,
  drawFirstHint,
  type CellFlash,
  type DeliveryPulse,
  type DerailExit,
  type LifeLostPulse,
} from './fx';
import { drawHud } from './hud';
import type { SceneLayout } from './layout';
import { drawPrediction } from './predictionView';
import { drawTrainAt } from './train';

const PALETTE = TUNING.palette;

/** Trem posicionado para o quadro (interpolação, espera ou fantasma). */
export interface TrainView {
  readonly train: Train;
  /** Centro em px CSS. */
  readonly x: number;
  readonly y: number;
  /** Ângulo do corpo em radianos. */
  readonly angle: number;
  readonly scale: number;
  readonly alpha: number;
}

/** Tudo o que um quadro precisa saber, já derivado pela costura em `main.ts`. */
export interface Scene {
  readonly state: GameState;
  readonly predictions: readonly Prediction[];
  readonly levelName: string;
  /** Total de vidas da fase; `null` no tutorial sem vidas (D1). */
  readonly livesTotal: number | null;
  /** A fase atual tem sucessora? D10 decide o rótulo do botão final. */
  readonly hasNextPhase: boolean;
  /** Relógio do quadro, em ms — marcha da previsão e lifecycles dos feedbacks. */
  readonly now: number;
  readonly trains: readonly TrainView[];
  readonly pieceAngles?: ReadonlyMap<string, number>;
  readonly stationScales?: ReadonlyMap<string, number>;
  /** Ângulo local da agulha do Y no toggle animado (E8). */
  readonly needleAngles?: ReadonlyMap<string, number>;
  /** Peça do primeiro giro que pulsa até a primeira ação válida (D6). */
  readonly firstHint?: CellPos | null;
  readonly flashes: readonly CellFlash[];
  readonly pulses: readonly DeliveryPulse[];
  readonly exits: readonly DerailExit[];
  /** Marcas de vida que acabaram de esvaziar (E8). */
  readonly lifePulses: readonly LifeLostPulse[];
}

/** Desenha um quadro inteiro. */
export function drawScene(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  scene: Scene,
): void {
  const { state, now } = scene;

  ctx.save();
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, layout.width, layout.height);

  drawBoard(ctx, layout, state.board, scene.pieceAngles, scene.stationScales, scene.needleAngles);

  // D6: o halo fica SOB a previsão — o traço e o marcador de parada continuam
  // sendo a leitura principal; o anel só enquadra a peça do primeiro giro.
  if (scene.firstHint) {
    drawFirstHint(ctx, layout, scene.firstHint, now);
  }

  for (const flash of scene.flashes) {
    drawCellFlash(ctx, layout, flash, now);
  }

  const trainsById = new Map<TrainId, Train>();
  for (const train of state.trains) {
    trainsById.set(train.id, train);
  }

  for (const prediction of scene.predictions) {
    const train = trainsById.get(prediction.trainId);

    if (train !== undefined) {
      const trainIndex = state.trains.findIndex(
        (candidate) => candidate.id === prediction.trainId,
      );

      drawPrediction(
        ctx,
        layout,
        state.board,
        prediction,
        train.color,
        now,
        Math.max(0, trainIndex) % 2,
      );
    }
  }

  for (const pulse of scene.pulses) {
    drawDeliveryPulse(ctx, layout, pulse, now);
  }

  for (const train of scene.trains) {
    drawTrainAt(
      ctx,
      layout.cell,
      train.train,
      train.x,
      train.y,
      train.angle,
      train.scale,
      train.alpha,
    );
  }

  for (const exit of scene.exits) {
    drawDerailExit(ctx, layout, exit, now);
  }

  drawHud(ctx, layout, state, scene.levelName, {
    livesTotal: scene.livesTotal,
    hasNextPhase: scene.hasNextPhase,
    now,
    lifePulses: scene.lifePulses,
  });
  ctx.restore();
}
