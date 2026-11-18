/**
 * Tuning do jogo — arquivo único, só dados (plano de implementação §6).
 *
 * Nenhuma lógica vive aqui: render, input e o futuro loop de animação leem
 * estes valores. Mudar o ritmo, o tamanho ou a paleta do protótipo é editar
 * este arquivo, sem tocar em regra nem em desenho.
 *
 * Parâmetros que o E2 ainda não consome (animação, buffer e feedbacks são do
 * E3) ficam declarados como contrato do jogo inteiro — é de propósito: o
 * arquivo é a tabela completa do plano, não só o recorte do épico atual.
 */

/** Curva de animação de um passo (implementada pelo E3). */
export type StepEasing = 'linear' | 'easeOutQuad' | 'easeInOutQuad' | 'easeOutCubic';

/** Estilo de flash de toque sem ação (D3). `none` desliga o feedback. */
export type TouchFlashStyle = 'cellFlash' | 'none';

/**
 * Paleta do protótipo (feio-e-funcional: legibilidade > beleza).
 *
 * A previsão não tem cor própria: é a cor do trem a `predictionAlpha`, para a
 * rota pertencer visualmente à locomotiva (GDD §3.8).
 */
export interface Palette {
  /** Fundo da área de jogo. */
  readonly background: string;
  /** Trilho e traços estruturais (grade, ícones do HUD). */
  readonly track: string;
  /** Cor do par trem/estação do P0 (a fase traz a cor no dado; isto é o default documentado). */
  readonly pair: string;
  /** Opacidade da previsão sobre a cor do trem. */
  readonly predictionAlpha: number;
}

/** Contrato completo de tuning (tabela do plano §6). */
export interface Tuning {
  /** Duração da animação de um passo — a duração É o ritmo do jogo. */
  readonly stepDurationMs: number;
  readonly stepEasing: StepEasing;
  /** Duração do giro da peça. */
  readonly rotationMs: number;
  /** Sobregiro leve ao parar (leitura de direção). */
  readonly rotationOvershoot: number;
  /** Pausa extra entre passos drenados do buffer. */
  readonly bufferedStepGapMs: number;
  /** Teto do buffer FIFO de ações durante a animação. */
  readonly maxBufferedActions: number;
  /** Período da «marcha» dos pontinhos da previsão. */
  readonly predictionDashMs: number;
  /** Teto de células simuladas pela previsão antes de parar por segurança. */
  readonly predictionSafetyCapSteps: number;
  /** Corpo do trem relativo à célula. */
  readonly trainSizeRatio: number;
  /** Espessura do trilho relativa à célula. */
  readonly trackWidthRatio: number;
  /** Tamanho visual da estação relativo à célula. */
  readonly stationInsetRatio: number;
  /** Tamanho do símbolo de forma (trem e estação) relativo à célula. */
  readonly symbolSizeRatio: number;
  /** Alvo de toque mínimo por célula, em pt CSS. */
  readonly cellMinCssPt: number;
  /** Alvo mínimo dos botões do HUD, em pt CSS. */
  readonly buttonMinCssPt: number;
  /** Folga da grade na viewport (fração da largura). */
  readonly boardMaxWidthRatio: number;
  /** Feedback de entrega (D5). */
  readonly deliverPulseMs: number;
  readonly deliverPulseScale: number;
  /** Saída visual do trem descarrilado (D1). */
  readonly derailExitMs: number;
  /** Pulso contínuo na peça do primeiro giro (D6), até a primeira ação. */
  readonly firstHintPulseMs: number;
  /** Flash discreto em toque nulo (D3). */
  readonly nullTouchFlash: TouchFlashStyle;
  /** Flash discreto em giro bloqueado por trem (D3). */
  readonly blockedTouchFlash: TouchFlashStyle;
  readonly palette: Palette;
}

/** Defaults de protótipo do plano §6 — não são decisão de design fechada. */
export const TUNING: Tuning = {
  stepDurationMs: 180,
  stepEasing: 'easeOutQuad',
  rotationMs: 110,
  rotationOvershoot: 1.08,
  bufferedStepGapMs: 0,
  maxBufferedActions: 12,
  predictionDashMs: 1200,
  predictionSafetyCapSteps: 24,
  trainSizeRatio: 0.6,
  trackWidthRatio: 0.16,
  stationInsetRatio: 0.74,
  symbolSizeRatio: 0.28,
  cellMinCssPt: 44,
  buttonMinCssPt: 44,
  boardMaxWidthRatio: 0.92,
  deliverPulseMs: 450,
  deliverPulseScale: 1.25,
  derailExitMs: 300,
  firstHintPulseMs: 900,
  nullTouchFlash: 'cellFlash',
  blockedTouchFlash: 'cellFlash',
  palette: {
    background: '#f4f1ea',
    track: '#3a3f44',
    pair: '#d64545',
    predictionAlpha: 0.55,
  },
};
