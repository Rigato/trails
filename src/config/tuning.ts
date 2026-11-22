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
  /**
   * Água das células de rio. Teal escolhido para não competir com o azul:
   * P1 e P2 usam `pairs[1]` = `#3b82f6`; a água fica no eixo ciano-verde,
   * distante dele.
   */
  readonly river: string;
  /**
   * Massa da montanha (P3/D17): terra-pedra, longe do teal da água e do cinza
   * do trilho. A montanha é um bloco, não um símbolo de peça.
   */
  readonly mountain: string;
  /**
   * Boca do túnel (P3/D18): o vão escuro do portal, na cor do trilho. A forma
   * de arco com moldura é o que separa a boca de um traço de trilho comum.
   */
  readonly tunnel: string;
  /**
   * Cores default dos pares trem/estação por fase (P1+). A fase traz as cores
   * no dado; `pairs[0]` substitui o antigo `palette.pair` (F-01 continua
   * válido: o P0 lê a cor daqui).
   */
  readonly pairs: readonly [string, string];
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
  /** Swing da agulha do Y na troca de ponta ativa. Limitado por `stepDurationMs` (o giro nunca sobrevive ao passo). */
  readonly yToggleMs: number;
  /** Pausa extra entre passos drenados do buffer. */
  readonly bufferedStepGapMs: number;
  /** Teto do buffer FIFO de ações durante a animação. */
  readonly maxBufferedActions: number;
  /** Período da «marcha» dos pontinhos da previsão. */
  readonly predictionDashMs: number;
  /**
   * Horizonte visível da previsão em células — D21; o core calcula o caminho
   * inteiro, o render trunca e esmaece no corte.
   */
  readonly predictionVisibleSteps: number;
  /** Teto de células simuladas pela previsão antes de parar por segurança. */
  readonly predictionSafetyCapSteps: number;
  /** Corpo do trem relativo à célula. */
  readonly trainSizeRatio: number;
  /** Espessura do trilho relativa à célula. */
  readonly trackWidthRatio: number;
  /** Tamanho visual da estação relativo à célula. */
  readonly stationInsetRatio: number;
  /** Diâmetro visual da moeda relativo à célula (anel; overlay sobre o trilho). */
  readonly coinRatio: number;
  /** Feedback de coleta da moeda (E13). */
  readonly coinPulseMs: number;
  /** Tamanho do símbolo de forma (trem e estação) relativo à célula. */
  readonly symbolSizeRatio: number;
  /** Alvo de toque mínimo por célula, em pt CSS. */
  readonly cellMinCssPt: number;
  /** Alvo mínimo dos botões do HUD, em pt CSS. */
  readonly buttonMinCssPt: number;
  /**
   * Folga lateral da grade na viewport (fração da largura). `0.80` (V-4,
   * 19/11/2026) reserva margem para o trem `waiting` aparecer fora da grade
   * nas entradas laterais; o piso `cellMinCssPt` protege o alvo de 44 pt.
   */
  readonly boardMaxWidthRatio: number;
  /** Feedback de entrega (D5). */
  readonly deliverPulseMs: number;
  readonly deliverPulseScale: number;
  /**
   * Bônus por trem entregue na vitória (D27) — tabela fixa n×(n−1).
   *
   * O ÍNDICE É O NÚMERO DE TRENS ENTREGUES, não o de trens da fase:
   * 1 → +0, 2 → +2, 3 → +6, 4 → +12. O índice 0 existe para a leitura
   * direta (`table[delivered]`) e vale 0; um índice fora da tabela também
   * vira 0 no lookup seguro da economia. Os valores são tuning; a fórmula é
   * fechada.
   */
  readonly bonusPerTrainTable: readonly number[];
  /** Pulse na marca de vida perdida no HUD (P1/D7). */
  readonly lifeLostPulseMs: number;
  /**
   * Pulso de escala do glifo do seletor CW/CCW ao alternar o sentido (D25).
   * Ferramenta, não turno: o pulso confirma a troca sem avançar passo.
   */
  readonly selectorPulseMs: number;
  /** Saída visual do trem descarrilado (D1). */
  readonly derailExitMs: number;
  /** Fade de entrada/saída do trem no túnel (E18); 160 ms truncado por `stepDurationMs` — nunca sobrevive ao passo, como `yToggleMs`. */
  readonly tunnelFadeMs: number;
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
  yToggleMs: 120,
  bufferedStepGapMs: 0,
  maxBufferedActions: 12,
  predictionDashMs: 1200,
  predictionVisibleSteps: 6,
  predictionSafetyCapSteps: 24,
  trainSizeRatio: 0.6,
  trackWidthRatio: 0.16,
  stationInsetRatio: 0.74,
  coinRatio: 0.22,
  coinPulseMs: 300,
  symbolSizeRatio: 0.28,
  cellMinCssPt: 44,
  buttonMinCssPt: 44,
  boardMaxWidthRatio: 0.8,
  deliverPulseMs: 450,
  deliverPulseScale: 1.25,
  /** D27, índice = trens entregues: 1→+0, 2→+2, 3→+6, 4→+12. */
  bonusPerTrainTable: [0, 0, 2, 6, 12],
  lifeLostPulseMs: 350,
  selectorPulseMs: 350,
  derailExitMs: 300,
  tunnelFadeMs: 160,
  firstHintPulseMs: 900,
  nullTouchFlash: 'cellFlash',
  blockedTouchFlash: 'cellFlash',
  palette: {
    background: '#f4f1ea',
    track: '#3a3f44',
    river: '#2f8f9d',
    mountain: '#8a7a5c',
    tunnel: '#3a3f44',
    pairs: ['#d64545', '#3b82f6'],
    predictionAlpha: 0.55,
  },
};
