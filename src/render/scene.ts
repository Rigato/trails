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
  EntryPoint,
  GameState,
  Prediction,
  Train,
  TrainId,
} from '../core/types';
import { TUNING } from '../config/tuning';
import { drawBoard } from './board';
import { drawCoinPulse, drawCoinRing } from './coin';
import {
  coinPulseProgress,
  drawCellFlash,
  drawDeliveryPulse,
  drawDerailExit,
  drawFirstHint,
  type CellFlash,
  type CoinPulse,
  type DeliveryPulse,
  type DerailExit,
  type LifeLostPulse,
} from './fx';
import { drawHud } from './hud';
import { cellCenter, type SceneLayout } from './layout';
import { drawPrediction, drawPredictionUnderlay } from './predictionView';
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
  /** Entradas da fase: marcadores de borda derivados do layout. */
  readonly entries: readonly EntryPoint[];
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
  /** Moedas ainda não coletadas (overlay sobre trilho; D16). */
  readonly coins: readonly CellPos[];
  /** Total de moedas da fase; `0` = fase sem moedas. */
  readonly coinsTotal: number;
  /** Coletas recentes: anel dourado na célula (E13). */
  readonly coinPulses: readonly CoinPulse[];
  /** Início do tick do contador de moedas (E13); `null` = sem tick. */
  readonly coinTickAt: number | null;
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

  drawBoard(ctx, layout, state.board, scene.pieceAngles, scene.stationScales, scene.needleAngles, scene.entries);

  const trainsById = new Map<TrainId, Train>();
  for (const train of state.trains) {
    trainsById.set(train.id, train);
  }

  const predictionViews: {
    prediction: Prediction;
    color: string;
    variant: number;
  }[] = [];

  for (const prediction of scene.predictions) {
    const train = trainsById.get(prediction.trainId);

    if (train === undefined) {
      continue;
    }

    const trainIndex = state.trains.findIndex(
      (candidate) => candidate.id === prediction.trainId,
    );

    predictionViews.push({
      prediction,
      color: train.color,
      variant: Math.max(0, trainIndex) % 2,
    });
  }

  // V-1: todos os canais claros primeiro; assim uma segunda rota não apaga a
  // primeira no corredor compartilhado. O hint/flash ficam por cima do canal e
  // por baixo do traço colorido.
  for (const view of predictionViews) {
    drawPredictionUnderlay(ctx, layout, state.board, view.prediction);
  }

  // D6: o halo fica SOB a previsão — o traço e o marcador de parada continuam
  // sendo a leitura principal; o anel só enquadra a peça do primeiro giro.
  if (scene.firstHint) {
    drawFirstHint(ctx, layout, scene.firstHint, now);
  }

  for (const flash of scene.flashes) {
    drawCellFlash(ctx, layout, flash, now);
  }

  for (const view of predictionViews) {
    drawPrediction(
      ctx,
      layout,
      state.board,
      view.prediction,
      view.color,
      now,
      view.variant,
    );
  }

  // Moedas DEPOIS da previsão: o anel de ouro continua visível quando o traço
  // passa pela célula (o miolo é vazado e mostra o trilho).
  for (const coin of scene.coins) {
    const center = cellCenter(layout, coin);

    drawCoinRing(ctx, center.x, center.y, layout.cell * TUNING.coinRatio);
  }

  // Coleta em ~0 tempo: a moeda já saiu; o anel dourado marca o instante no
  // início do passo. Fica sob os trens (o centro da célula é deles).
  for (const pulse of scene.coinPulses) {
    const center = cellCenter(layout, pulse.cell);

    drawCoinPulse(
      ctx,
      center.x,
      center.y,
      layout.cell,
      coinPulseProgress(pulse, now),
    );
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
    coinsTotal: scene.coinsTotal,
    coinTickAt: scene.coinTickAt,
  });
  ctx.restore();
}
