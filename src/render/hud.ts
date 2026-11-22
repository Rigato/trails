/**
 * HUD desenhado no canvas: cabeçalho (fase, passo, estado, vidas) e botões.
 *
 * Em jogo, a fileira inferior tem três alvos de ≥ 44 pt: «Passar turno», o
 * seletor CW/CCW compacto no meio (D22/D25) e «Recomeçar». O seletor é
 * ferramenta, não turno (D26): o glifo de seta circular mostra o sentido ativo
 * (↻ CW / ↺ CCW) e pulsa ao alternar. Quando a run termina, os três viram UM
 * botão de largura total: «Próxima fase» quando a vitória tem sucessora (D10),
 * «Jogar de novo» na última fase e «Recomeçar» em deadEnd/lost. O caminho para
 * seguir/rejogar fica óbvio sem menu.
 *
 * M2: um glifo de três barras no canto esquerdo do cabeçalho volta para a lista
 * de fases a qualquer momento — sem confirmar e sem tocar no save. O alvo de
 * 44 pt vive no layout; o desenho ocupa só a faixa do header.
 *
 * M3: o cabeçalho mostra a CARTEIRA persistente (glifo + saldo), não o contador
 * burro de moedas da run — a leitura por run vive no painel de vitória. Quando
 * a vitória banca, o glifo faz o tick da família E13; a coleta no tabuleiro
 * continua com o pulse dela, independente do header.
 *
 * M4/D28: em `deadEnd` de fase NÃO-tutorial, a fileira inferior vira dois
 * botões de meia-largura — «Resgatar · preço» (acento dourado + glifo de
 * moeda) e «Desistir» (contornado, efeito do antigo «Recomeçar»). Sem carteira
 * ou com o resgate da run já usado, o botão de resgate fica opaco e o toque
 * apenas pisca (D3). Tutorial mantém o botão único de largura total; `won` e
 * `lost` não mudam (D11: resgate não devolve vida).
 *
 * M5/D29: fase não-tutorial ganha o Time-travel na fileira — botão compacto
 * com a seta de retorno e o preço («⟲ 4»), entre o seletor e «Recomeçar».
 * Opaco quando não aplicável (passo 0, carteira curta, run encerrada); toque
 * nele apenas pisca (D3). Na compra o glifo pulsa na família do seletor. O
 * tutorial mantém a fileira de três alvos (loja indisponível, D23).
 *
 * Vidas são marcas geométricas no centro do cabeçalho: diamantes cheios =
 * vivas, vazios = perdidas. Fase sem vidas (`lives: null`) não desenha nada.
 * E8: a marca que acabou de esvaziar pulsa (cresce + anel, `lifeLostPulseMs`),
 * ancorada no relógio do loop; duas perdas no mesmo passo = duas marcas.
 */

import type { GameState, RotationDirection } from '../core/types';
import { TUNING } from '../config/tuning';
import { COIN_COLOR, drawCoinGlyph, drawCoinTick } from './coin';
import {
  CELL_FLASH_MS,
  coinTickProgress,
  hintPulseIntensity,
  lifePulseProgress,
  lifePulseRing,
  lifePulseScale,
  type LifeLostPulse,
} from './fx';
import type { Rect, SceneLayout } from './layout';

const PALETTE = TUNING.palette;
const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const HEADER_ALPHA = 0.82;
const EMPTY_LIFE_ALPHA = 0.5;

/** Contexto de HUD que não vive no snapshot do core. */
export interface HudContext {
  /** Total de vidas da fase; `null` = tutorial sem vidas (D1). */
  readonly livesTotal: number | null;
  /** A fase atual tem sucessora? Decide «Próxima fase» vs. «Jogar de novo». */
  readonly hasNextPhase: boolean;
  /** Relógio do quadro — anima o pulse das marcas de vida (E8). */
  readonly now: number;
  /** Marcas que acabaram de esvaziar e ainda pulsam (E8). */
  readonly lifePulses: readonly LifeLostPulse[];
  /** Saldo persistente da carteira (M3), exibido no cabeçalho. */
  readonly wallet: number;
  /**
   * Início do tick do glifo da carteira quando a vitória banca (M3);
   * `null` = sem tick. A coleta de moeda no tabuleiro não anima o header.
   */
  readonly walletTickAt: number | null;
  /** Sentido ativo do seletor CW/CCW (D22/D26). */
  readonly rotationDirection: RotationDirection;
  /** Início do pulso do seletor ao alternar; `null` = sem pulso. */
  readonly selectorPulseAt: number | null;
  /** O hint de apresentação do seletor está ativo (D24)? */
  readonly selectorHintActive: boolean;
  /** Fase de ensino (D23): a loja não aparece; deadEnd usa «Recomeçar» (D1). */
  readonly tutorial: boolean;
  /** Preço do resgate (D28), exibido no botão. */
  readonly rescuePrice: number;
  /** O resgate é comprável agora (resgate restante + carteira)? */
  readonly rescueEnabled: boolean;
  /** Início do flash de toque no resgate indisponível; `null` = sem flash. */
  readonly rescueDeniedAt: number | null;
  /** Preço do Time-travel (M5/D29), exibido no botão. */
  readonly timeTravelPrice: number;
  /** O Time-travel é comprável agora (passo > 0 + carteira + run ativa)? */
  readonly timeTravelEnabled: boolean;
  /** Início do pulso do glifo na compra do Time-travel; `null` = sem pulso. */
  readonly timeTravelPulseAt: number | null;
  /** Início do flash no Time-travel indisponível (D3); `null` = sem flash. */
  readonly timeTravelDeniedAt: number | null;
}

/**
 * Retângulo do botão único de fim de run: a união dos dois botões de texto,
 * incluindo o vão central e o seletor no meio. Exportado para o hit-test do
 * input usar exatamente a mesma área que o desenho.
 */
export function fullWidthHudButton(layout: SceneLayout): Rect {
  const left = layout.passButton;
  const right = layout.resetButton;
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const rightEdge = Math.max(left.x + left.width, right.x + right.width);
  const bottom = Math.max(left.y + left.height, right.y + right.height);

  return { x, y, width: rightEdge - x, height: bottom - y };
}

/** Desenha o cabeçalho e os botões do HUD. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
  context: HudContext,
): void {
  drawHeader(ctx, layout, state, levelName, context);

  if (state.status === 'deadEnd' && !context.tutorial) {
    drawRescueButton(ctx, layout, layout.rescueButton, context);
    drawButton(ctx, layout, layout.surrenderButton, 'Desistir', false, true);
    return;
  }

  if (isEnded(state)) {
    const winner = state.trains.find((train) => train.status.kind === 'delivered');
    const accent =
      state.status === 'won' ? (winner?.color ?? PALETTE.pairs[0]) : undefined;

    drawButton(
      ctx,
      layout,
      fullWidthHudButton(layout),
      endLabel(state, context.hasNextPhase),
      true,
      true,
      accent,
    );
    return;
  }

  drawButton(ctx, layout, layout.resetButton, 'Recomeçar', false, true);
  drawRotationButton(ctx, layout, context);

  if (layout.timeTravelVisible) {
    drawTimeTravelButton(ctx, layout, context);
  }

  drawButton(ctx, layout, layout.passButton, 'Passar turno', true, true);
}

function isEnded(state: GameState): boolean {
  return (
    state.status === 'won' ||
    state.status === 'deadEnd' ||
    state.status === 'lost'
  );
}

/** Rótulo do botão único de fim de run (D1/D5/D10). */
function endLabel(state: GameState, hasNextPhase: boolean): string {
  if (state.status === 'won') {
    return hasNextPhase ? 'Próxima fase' : 'Jogar de novo';
  }

  return 'Recomeçar';
}

function drawHeader(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  state: GameState,
  levelName: string,
  context: HudContext,
): void {
  const { header, headerFontSize } = layout;
  const status = statusLabel(state);
  const iconSize = Math.min(headerFontSize * 1.2, 18);
  const iconX = layout.listButton.x + layout.listButton.width / 2;
  const iconY = header.y + header.height / 2;
  const titleX = iconX + iconSize / 2 + Math.max(6, headerFontSize * 0.5);

  ctx.save();
  ctx.font = `600 ${headerFontSize}px ${FONT_STACK}`;
  const statusWidth = Math.min(header.width * 0.42, ctx.measureText(status).width);

  drawListGlyph(ctx, iconX, iconY, iconSize);

  ctx.globalAlpha = HEADER_ALPHA;
  ctx.fillStyle = PALETTE.track;
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${headerFontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    levelName,
    titleX,
    header.y + header.height / 2,
    header.width * 0.3,
  );

  ctx.textAlign = 'right';
  ctx.font = `600 ${headerFontSize}px ${FONT_STACK}`;
  ctx.fillText(
    status,
    header.x + header.width,
    header.y + header.height / 2,
    header.width * 0.42,
  );
  ctx.restore();

  if (context.livesTotal !== null && context.livesTotal > 0) {
    drawLifeMarks(
      ctx,
      layout,
      state.lives ?? 0,
      context.livesTotal,
      context.now,
      context.lifePulses,
    );
  }

  drawWalletCounter(
    ctx,
    layout,
    context.wallet,
    statusWidth,
    context.now,
    context.walletTickAt,
  );
}

/**
 * Carteira persistente: glifo de ouro + saldo, à direita do cabeçalho antes do
 * «passo N». Aparece sempre (inclusive 0), porque é o saldo do jogador — não o
 * contador burro da run, que deixou de existir no header no M3.
 *
 * M3/E13: quando a vitória banca, o glifo pulsa uma vez (cresce + anel
 * dourado, `coinPulseMs`); o número fica estável. A coleta no tabuleiro
 * mantém o pulse dela no tabuleiro.
 */
function drawWalletCounter(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  wallet: number,
  statusWidth: number,
  now: number,
  walletTickAt: number | null,
): void {
  const { header, headerFontSize } = layout;
  const countText = String(Math.max(0, Math.trunc(wallet)));

  ctx.save();
  ctx.font = `600 ${headerFontSize}px ${FONT_STACK}`;
  const countWidth = ctx.measureText(countText).width;
  const coinRadius = Math.max(3, headerFontSize * 0.32);
  const gap = Math.max(3, headerFontSize * 0.28);
  const groupWidth = coinRadius * 2 + gap + countWidth;
  const statusGap = Math.max(8, headerFontSize * 0.65);
  const rightEdge = header.x + header.width - statusWidth - statusGap;
  const groupLeft = rightEdge - groupWidth;
  const cy = header.y + header.height / 2;
  const glyphX = groupLeft + coinRadius;

  ctx.globalAlpha = HEADER_ALPHA;
  ctx.fillStyle = PALETTE.track;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(countText, rightEdge, cy);

  const tick =
    walletTickAt === null ? 1 : coinTickProgress(walletTickAt, now);

  if (tick < 1) {
    drawCoinTick(ctx, glyphX, cy, coinRadius, tick);
  } else {
    drawCoinGlyph(ctx, glyphX, cy, coinRadius);
  }

  ctx.restore();
}

/** Rótulo curto do estado; o passo é a informação padrão durante o jogo. */
function statusLabel(state: GameState): string {
  switch (state.status) {
    case 'ready':
      return 'passo 0';
    case 'playing':
      return `passo ${state.step}`;
    case 'won':
      return 'entregue';
    case 'deadEnd':
      return 'sem trem ativo';
    case 'lost':
      return 'sem vidas';
  }
}

/**
 * Marcas de vida no centro do cabeçalho: cheias = vivas, vazias = perdidas.
 *
 * Diamantes pequenos (não os símbolos dos pares) mantêm o HUD neutro em cor e
 * legível em DPR 1; a quantidade total vem da fase, o saldo do snapshot.
 *
 * E8: a marca que acabou de esvaziar pulsa — cresce e volta, com um anel na
 * cor do trilho expandindo e sumindo (`lifeLostPulseMs`). O índice vem do
 * `remaining` do evento `lifeLost` (marcas `0..remaining-1` seguem cheias), então
 * duas perdas no mesmo passo fazem DUAS marcas pulsarem. O pulse é ancorado no
 * relógio do loop, como os demais fx.
 */
function drawLifeMarks(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  current: number,
  total: number,
  now: number,
  pulses: readonly LifeLostPulse[],
): void {
  const size = Math.max(6, layout.headerFontSize * 0.55);
  const gap = size * 0.55;
  const marksWidth = total * size + (total - 1) * gap;
  const startX = layout.header.x + layout.header.width / 2 - marksWidth / 2 + size / 2;
  const cy = layout.header.y + layout.header.height / 2;
  const alive = Math.max(0, Math.min(total, Math.trunc(current)));

  ctx.save();

  for (let index = 0; index < total; index += 1) {
    const cx = startX + index * (size + gap);
    const pulse = pulses.find((candidate) => candidate.markIndex === index);
    const progress = pulse === undefined ? 1 : lifePulseProgress(pulse, now);
    const pulsing = pulse !== undefined && progress < 1;
    const scale = pulsing ? lifePulseScale(progress) : 1;

    // Anel de perda: atrás da marca, na cor do trilho, expande e desaparece.
    if (pulsing) {
      const ring = lifePulseRing(progress);

      ctx.save();
      ctx.globalAlpha = ring.alpha;
      ctx.strokeStyle = PALETTE.track;
      ctx.lineWidth = Math.max(1, size * 0.14);
      ctx.beginPath();
      ctx.arc(cx, cy, size * ring.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy);

    if (scale !== 1) {
      ctx.scale(scale, scale);
    }

    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(0, size / 2);
    ctx.lineTo(-size / 2, 0);
    ctx.closePath();

    if (index < alive) {
      ctx.globalAlpha = HEADER_ALPHA;
      ctx.fillStyle = PALETTE.track;
      ctx.fill();
    } else {
      ctx.globalAlpha = pulsing
        ? 0.55 + 0.4 * (1 - progress)
        : EMPTY_LIFE_ALPHA;
      ctx.strokeStyle = PALETTE.track;
      ctx.lineWidth = Math.max(1, size * 0.16);
      ctx.stroke();
    }

    ctx.restore();
  }

  ctx.restore();
}

/** Superfície de um botão do HUD: preenchido (primário) ou contornado. */
function drawButtonSurface(
  ctx: CanvasRenderingContext2D,
  rect: Rect,
  primary: boolean,
  accent?: string,
): void {
  const radius = rect.height * 0.3;

  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);

  if (primary) {
    ctx.fillStyle = accent ?? PALETTE.track;
    ctx.fill();
  } else {
    ctx.fillStyle = PALETTE.background;
    ctx.fill();
    ctx.strokeStyle = PALETTE.track;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  rect: Rect,
  label: string,
  primary: boolean,
  enabled: boolean,
  accent?: string,
): void {
  ctx.save();
  ctx.globalAlpha = enabled ? 1 : 0.42;
  drawButtonSurface(ctx, rect, primary, accent);

  ctx.fillStyle = primary ? PALETTE.background : PALETTE.track;
  ctx.font = `600 ${layout.buttonFontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    label,
    rect.x + rect.width / 2,
    rect.y + rect.height / 2 + 0.5,
    rect.width * 0.86,
  );
  ctx.restore();
}

/**
 * «Resgatar · preço» (D28): botão de meia-largura com acento dourado da moeda.
 *
 * A superfície é contornada (como o «Desistir» ao lado), mas a borda e o glifo
 * usam o ouro do `COIN_COLOR` — o custo é econômico, não uma ação de turno.
 * Indisponível (sem carteira ou resgate da run já usado) fica opaco; o toque
 * pisca a superfície (família D3) sem executar nada.
 */
function drawRescueButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  rect: Rect,
  context: HudContext,
): void {
  const radius = rect.height * 0.3;
  const size = layout.buttonFontSize;
  const label = `Resgatar · ${context.rescuePrice}`;
  const cy = rect.y + rect.height / 2;

  ctx.save();
  ctx.globalAlpha = context.rescueEnabled ? 1 : 0.42;

  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fillStyle = PALETTE.background;
  ctx.fill();
  ctx.strokeStyle = COIN_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `600 ${size}px ${FONT_STACK}`;
  const textLimit = rect.width * 0.62;
  const textWidth = Math.min(textLimit, ctx.measureText(label).width);
  const coinRadius = Math.max(3.5, size * 0.34);
  const gap = Math.max(3, size * 0.26);
  const groupWidth = coinRadius * 2 + gap + textWidth;
  const left = rect.x + Math.max(0, (rect.width - groupWidth) / 2);

  drawCoinGlyph(ctx, left + coinRadius, cy, coinRadius);

  ctx.fillStyle = PALETTE.track;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, left + coinRadius * 2 + gap, cy + 0.5, textLimit);
  ctx.restore();

  if (context.rescueDeniedAt === null) {
    return;
  }

  const elapsed = context.now - context.rescueDeniedAt;

  if (!(elapsed >= 0) || elapsed >= CELL_FLASH_MS) {
    return;
  }

  const intensity = 1 - elapsed / CELL_FLASH_MS;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  ctx.globalAlpha = 0.16 * intensity;
  ctx.fillStyle = PALETTE.track;
  ctx.fill();
  ctx.restore();
}

/**
 * Botão-ferramenta do seletor CW/CCW (D22/D25).
 *
 * Mesma superfície contornada do «Recomeçar»; o conteúdo é só o glifo de seta
 * circular grande na cor estrutural do HUD. O pulso de escala (`selectorPulseMs`)
 * confirma a troca de sentido sem avançar passo — é ferramenta, não turno (D26).
 *
 * D24: na fase que apresenta o seletor, um anel respira em volta do botão na
 * mesma família/ritmo do halo D6 (`firstHintPulseMs`/`hintPulseIntensity`).
 * Ele nasce depois da primeira interação com um Y e para no primeiro uso do
 * seletor; é um hint de apresentação, não o `firstHint` das peças.
 */
function drawRotationButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  context: HudContext,
): void {
  const rect = layout.rotationButton;
  const hint = context.selectorHintActive
    ? hintPulseIntensity(context.now)
    : 0;

  ctx.save();
  drawButtonSurface(ctx, rect, false);

  if (hint > 0) {
    const expand = rect.height * (0.05 + 0.05 * hint);
    const radius = Math.max(6, rect.height * 0.24 + expand);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(
      rect.x - expand,
      rect.y - expand,
      Math.max(1, rect.width + expand * 2),
      Math.max(1, rect.height + expand * 2),
      radius,
    );
    ctx.globalAlpha = 0.16 + 0.3 * hint;
    ctx.strokeStyle = PALETTE.track;
    ctx.lineWidth = Math.max(2, rect.height * 0.045);
    ctx.stroke();
    ctx.restore();
  }

  const scale =
    selectorPulseScale(context.selectorPulseAt, context.now) *
    (1 + 0.08 * hint);
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.27;

  drawRotationGlyph(ctx, cx, cy, radius, context.rotationDirection, scale);
  ctx.restore();
}

/**
 * Intensidade do pulso do seletor, em escala (1 = repouso).
 *
 * Mesma curva da família dos pulses (seno de 0 a π): sobe e volta uma vez na
 * janela `selectorPulseMs`. Janela desligada/vencida = repouso.
 */
function selectorPulseScale(pulseAt: number | null, now: number): number {
  const duration = TUNING.selectorPulseMs;

  if (pulseAt === null || !(duration > 0)) {
    return 1;
  }

  const elapsed = now - pulseAt;

  if (!(elapsed >= 0) || elapsed >= duration) {
    return 1;
  }

  return 1 + 0.2 * Math.sin(Math.PI * (elapsed / duration));
}

/**
 * «⟲ preço» — Time-travel (M5/D29).
 *
 * Botão compacto contornado, ao lado do seletor. A seta de retorno fica à
 * esquerda e o preço pequeno à direita; na compra o glifo pulsa na família
 * `selectorPulseMs`, confirmando a reversão sem texto. Indisponível (passo 0,
 * carteira curta ou run encerrada) fica opaco; o toque pisca a superfície (D3)
 * sem comprar.
 */
function drawTimeTravelButton(
  ctx: CanvasRenderingContext2D,
  layout: SceneLayout,
  context: HudContext,
): void {
  const rect = layout.timeTravelButton;

  if (rect.width <= 0) {
    return;
  }

  const scale = selectorPulseScale(context.timeTravelPulseAt, context.now);
  const gx = rect.x + rect.width * 0.33;
  const cy = rect.y + rect.height / 2;
  const radius = Math.min(rect.width, rect.height) * 0.21;
  const priceSize = Math.max(10, layout.buttonFontSize * 0.72);

  ctx.save();
  ctx.globalAlpha = context.timeTravelEnabled ? 1 : 0.42;
  drawButtonSurface(ctx, rect, false);

  drawTimeTravelGlyph(ctx, gx, cy, radius, scale);

  ctx.fillStyle = PALETTE.track;
  ctx.font = `600 ${priceSize}px ${FONT_STACK}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    String(context.timeTravelPrice),
    rect.x + rect.width * 0.52,
    cy + 0.5,
    rect.width * 0.4,
  );
  ctx.restore();

  if (context.timeTravelDeniedAt === null) {
    return;
  }

  const elapsed = context.now - context.timeTravelDeniedAt;

  if (!(elapsed >= 0) || elapsed >= CELL_FLASH_MS) {
    return;
  }

  const intensity = 1 - elapsed / CELL_FLASH_MS;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    rect.height * 0.3,
  );
  ctx.globalAlpha = 0.16 * intensity;
  ctx.fillStyle = PALETTE.track;
  ctx.fill();
  ctx.restore();
}

/**
 * Seta de retorno do Time-travel, desenhada por código.
 *
 * Traço em U: sobe pela direita, curva no topo e desce pela esquerda, com a
 * cabeça apontando para baixo — «voltar atrás». Distinta da seta circular do
 * seletor (que indica o sentido do giro) e sem dependência de fonte externa.
 */
function drawTimeTravelGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  scale: number,
): void {
  if (radius <= 0) {
    return;
  }

  const lineWidth = Math.max(1.5, radius * 0.24);
  const xr = radius * 0.7;
  const top = -radius * 0.8;
  const bottom = radius * 0.75;
  const head = radius * 0.45;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(xr, bottom);
  ctx.lineTo(xr, top);
  ctx.quadraticCurveTo(xr, top - radius * 0.55, 0, top - radius * 0.55);
  ctx.quadraticCurveTo(-xr, top - radius * 0.55, -xr, top);
  ctx.lineTo(-xr, bottom);
  ctx.stroke();

  // Cabeça na ponta esquerda, apontando para baixo (o retorno).
  ctx.beginPath();
  ctx.moveTo(-xr - head, bottom - head * 1.2);
  ctx.lineTo(-xr, bottom);
  ctx.lineTo(-xr + head, bottom - head * 1.2);
  ctx.stroke();
  ctx.restore();
}

/**
 * Glifo de três barras empilhadas (volta para a lista de fases).
 *
 * Desenhado por código, como todos os ícones do HUD; ocupa só a faixa do
 * cabeçalho enquanto o alvo de toque de 44 pt vive no `SceneLayout`.
 */
function drawListGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
): void {
  if (size <= 0) {
    return;
  }

  const width = size;
  const barHeight = Math.max(1.5, size * 0.16);
  const step = barHeight * 2.1;

  ctx.save();
  ctx.globalAlpha = 0.78;
  ctx.fillStyle = PALETTE.track;

  for (const offset of [-1, 0, 1]) {
    ctx.beginPath();
    ctx.roundRect(
      cx - width / 2,
      cy + offset * step - barHeight / 2,
      width,
      barHeight,
      barHeight / 2,
    );
    ctx.fill();
  }

  ctx.restore();
}

/**
 * Seta circular do seletor, desenhada por código (arcos + cabeça de seta).
 *
 * O anel tem uma abertura no topo; a cabeça fica na ponta do sentido ativo e
 * aponta para dentro da abertura, então ↻ e ↺ são a mesma geometria com a seta
 * de um lado ou do outro — sem fonte, glifo de texto ou dependência externa.
 * `scale` é o pulso de alternância, aplicado só ao glifo.
 */
function drawRotationGlyph(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  direction: RotationDirection,
  scale: number,
): void {
  if (radius <= 0) {
    return;
  }

  const gapHalf = 0.32;
  const start = -Math.PI / 2 + gapHalf;
  const end = -Math.PI / 2 - gapHalf + Math.PI * 2;
  const lineWidth = Math.max(1.5, radius * 0.2);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = PALETTE.track;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(0, 0, radius, start, end);
  ctx.stroke();

  // CW: cabeça na ponta esquerda do anel (o traço chega por baixo e aponta
  // para a direita, no sentido horário). CCW: cabeça na ponta direita,
  // espelhada. Nos dois casos a ponta mira a abertura do topo.
  const angle = direction === 'cw' ? end : start;
  const tangent = direction === 'cw' ? 1 : -1;
  const tipX = Math.cos(angle) * radius;
  const tipY = Math.sin(angle) * radius;
  // Vetor da ponta para trás do arco, para onde as duas farpas abrem.
  const backX = Math.sin(angle) * tangent;
  const backY = -Math.cos(angle) * tangent;
  const head = radius * 0.48;
  const spread = 0.62;

  for (const side of [-1, 1]) {
    const cos = Math.cos(side * spread);
    const sin = Math.sin(side * spread);
    const x = backX * cos - backY * sin;
    const y = backX * sin + backY * cos;

    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(tipX + x * head, tipY + y * head);
    ctx.stroke();
  }

  ctx.restore();
}
