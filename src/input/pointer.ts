/**
 * Entrada unificada por Pointer Events: mouse, toque e caneta no mesmo build.
 *
 * O input não conhece regra de jogo: ele traduz um ponto do canvas em célula ou
 * botão e entrega `Action` do contrato (`tap`/`pass`) para a costura. Toque
 * nulo e célula ocupada também viram `tap` — quem classifica é o core, o que
 * mantém «1 ação = 1 passo» concentrado numa única autoridade.
 */

import type { Action } from '../core/types';
import {
  cellAtPoint,
  hudTargetAtPoint,
  type SceneLayout,
} from '../render/layout';

/** O que a costura em `main.ts` fornece ao input. */
export interface PointerInputHandlers {
  /** Layout do quadro atual (recalculado a cada resize). */
  readonly getLayout: () => SceneLayout;
  /** Ação do contrato pronta para `game.apply`. */
  readonly onAction: (action: Action) => void;
  /** «Recomeçar»: restaura o estado inicial do layout. */
  readonly onReset: () => void;
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

    const hudTarget = hudTargetAtPoint(layout, x, y);

    if (hudTarget === 'reset') {
      handlers.onReset();
      return;
    }

    if (hudTarget === 'pass') {
      handlers.onAction({ kind: 'pass' });
      return;
    }

    const cell = cellAtPoint(layout, x, y);

    if (cell !== null) {
      handlers.onAction({ kind: 'tap', cell });
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
