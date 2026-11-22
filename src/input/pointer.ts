/**
 * Entrada unificada por Pointer Events: mouse, toque e caneta no mesmo build.
 *
 * O input não conhece regra de jogo: ele traduz um ponto do canvas em célula ou
 * botão e entrega `Action` do contrato (`tap`/`pass`) para a costura. Toque
 * nulo e célula ocupada também viram `tap` — quem classifica é o core, o que
 * mantém «1 ação = 1 passo» concentrado numa única autoridade.
 *
 * D22/D26: o botão do seletor alterna o sentido IMEDIATAMENTE (`onRotationToggle`),
 * sem `Action` e sem buffer — é ferramenta, não turno. Cada `tap` de célula
 * captura o sentido ativo no instante do toque (`turn`), que o buffer preserva
 * até o dreno.
 *
 * M2: o input também conhece o MODO DE TELA. Na lista, um card vira
 * `onPhaseCardTap(index)` (quem decide bloqueado/desbloqueado é o `main.ts`);
 * em jogo, o glifo do cabeçalho vira `onListBack()`. O modo entra por callback
 * — o input continua sem guardar estado de jogo.
 */

import type { Action, RotationDirection } from '../core/types';
import { fullWidthHudButton } from '../render/hud';
import {
  cellAtPoint,
  hudTargetAtPoint,
  phaseCardAtPoint,
  type PhaseListLayout,
  type Rect,
  type SceneLayout,
} from '../render/layout';

/** Modo de tela do shell: home (lista) ou partida. */
export type ScreenMode = 'list' | 'game';

/** O que a costura em `main.ts` fornece ao input. */
export interface PointerInputHandlers {
  /** Layout do quadro atual (recalculado a cada resize). */
  readonly getLayout: () => SceneLayout;
  /** Modo atual; ausente = `'game'` (retrocompatível). */
  readonly getScreenMode?: () => ScreenMode;
  /** Layout da lista de fases; ausente quando o shell não a tem. */
  readonly getPhaseListLayout?: () => PhaseListLayout | null;
  /** Toque num card da lista; o índice é o da fase em `PHASES`. */
  readonly onPhaseCardTap?: (index: number) => void;
  /** Glifo do cabeçalho: abandona a run e volta para a lista. */
  readonly onListBack?: () => void;
  /** Ação do contrato pronta para `game.apply`. */
  readonly onAction: (action: Action) => void;
  /** «Recomeçar»: restaura o estado inicial do layout. */
  readonly onReset: () => void;
  /** Sentido ativo do seletor, capturado em cada `tap` (default CW). */
  readonly getRotationDirection: () => RotationDirection;
  /**
   * Alterna o sentido do seletor (D25/D26). Executa na hora: não enfileira
   * ação, não avança passo e sobrevive a reset/troca de fase.
   */
  readonly onRotationToggle: () => void;
  /**
   * Ação do botão único de fim de run (D1/D5/D10). `main.ts` decide entre
   * carregar a próxima fase (vitória com sucessora), rejogar ou recomeçar a
   * fase atual. Sem callback, cai no reset.
   */
  readonly onFinishedAction?: () => void;
  /**
   * A run terminou? Quando sim, o HUD mostra um único botão de largura total
   * (D1/D5) e qualquer toque dentro dele executa a ação de fim — inclusive no
   * vão central.
   */
  readonly isFinished?: () => boolean;
}

function containsPoint(rect: Rect, x: number, y: number): boolean {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

/**
 * Liga os Pointer Events ao canvas e devolve a função de limpeza.
 *
 * Usa `pointerdown` (resposta imediata, sem esperar o dedo sair) e aceita
 * apenas o ponteiro primário: um segundo dedo apoiado não dispara uma ação
 * extra. `touch-action: none` no CSS impede scroll/zoom acidental.
 */
export function attachPointerInput(
  canvas: HTMLCanvasElement,
  handlers: PointerInputHandlers,
): () => void {
  function onPointerDown(event: PointerEvent): void {
    if (!event.isPrimary || event.button !== 0) {
      return;
    }

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const layout = handlers.getLayout();
    const x = (event.clientX - rect.left) * (layout.width / rect.width);
    const y = (event.clientY - rect.top) * (layout.height / rect.height);

    if (handlers.getScreenMode?.() === 'list') {
      const listLayout = handlers.getPhaseListLayout?.();

      if (listLayout !== undefined && listLayout !== null) {
        const index = phaseCardAtPoint(listLayout, x, y);

        if (index !== null) {
          handlers.onPhaseCardTap?.(index);
        }
      }

      return;
    }

    if (handlers.isFinished?.() && containsPoint(fullWidthHudButton(layout), x, y)) {
      (handlers.onFinishedAction ?? handlers.onReset)();
      return;
    }

    const hudTarget = hudTargetAtPoint(layout, x, y);

    if (hudTarget === 'list') {
      handlers.onListBack?.();
      return;
    }

    if (hudTarget === 'reset') {
      handlers.onReset();
      return;
    }

    if (hudTarget === 'rotation') {
      handlers.onRotationToggle();
      return;
    }

    if (hudTarget === 'pass') {
      handlers.onAction({ kind: 'pass' });
      return;
    }

    const cell = cellAtPoint(layout, x, y);

    if (cell !== null) {
      handlers.onAction({
        kind: 'tap',
        cell,
        turn: handlers.getRotationDirection(),
      });
    }
  }

  function onContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  canvas.addEventListener('pointerdown', onPointerDown, { passive: false });
  canvas.addEventListener('contextmenu', onContextMenu);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('contextmenu', onContextMenu);
  };
}
