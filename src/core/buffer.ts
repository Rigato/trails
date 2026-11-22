/**
 * Buffer FIFO de input do core (GDD §3.3).
 *
 * A animação pertence à apresentação; este buffer só guarda `Action` na ordem
 * de chegada. No dreno, cada ação é entregue de volta ao motor no momento de
 * aplicar — é aí que a revalidação de D4 acontece. Uma ação enfileirada que
 * virou inválida (célula ocupada, toque nulo, jogo terminado) é descartada
 * pelo resultado `advanced === false`, sem avançar passo.
 *
 * D26: o sentido (`Action.turn`) é capturado no enqueue e viaja DENTRO da
 * ação. O dreno revalida só a validez — nunca o sentido: uma peça enfileirada
 * para girar CCW continua CCW mesmo que o seletor mude antes de ela sair da
 * fila.
 *
 * Teto parametrizável: rajadas acima da capacidade descartam as ações mais
 * novas (as primeiras da fila são preservadas).
 */

import type { Action, ApplyResult } from './types';

/** Capacidade default do buffer (plano §6: `maxBufferedActions`). */
export const DEFAULT_BUFFER_CAPACITY = 12;

/** Callback de aplicação: normalmente `game.apply`, revalidando a ação. */
export type ApplyBufferedAction = (action: Action) => ApplyResult;

export class ActionBuffer {
  /** Teto de ações simultâneas na fila. */
  readonly capacity: number;

  private readonly actions: Action[] = [];

  constructor(capacity = DEFAULT_BUFFER_CAPACITY) {
    this.capacity = Number.isFinite(capacity)
      ? Math.max(1, Math.floor(capacity))
      : DEFAULT_BUFFER_CAPACITY;
  }

  /** Número de ações na fila. */
  get size(): number {
    return this.actions.length;
  }

  /** A fila está vazia? */
  get isEmpty(): boolean {
    return this.actions.length === 0;
  }

  /**
   * Enfileira no fim. Devolve `false` e descarta a ação nova se a fila estiver
   * cheia (o teto protege a fila de rajadas absurdas).
   */
  enqueue(action: Action): boolean {
    if (this.actions.length >= this.capacity) {
      return false;
    }

    this.actions.push(action);
    return true;
  }

  /** Remove e devolve a ação mais antiga. */
  dequeue(): Action | undefined {
    return this.actions.shift();
  }

  /** Espia a ação mais antiga sem removê-la. */
  peek(): Action | undefined {
    return this.actions[0];
  }

  /** Esvazia a fila (ex.: recomeço da fase). */
  clear(): void {
    this.actions.length = 0;
  }

  /**
   * Drena uma ação e a aplica.
   *
   * A ação sai da fila antes da aplicação; se o motor a classificar como
   * nula/bloqueada/ignorada, ela não avança o passo (D4). Devolve `undefined`
   * quando a fila está vazia.
   */
  drainNext(apply: ApplyBufferedAction): ApplyResult | undefined {
    const action = this.dequeue();

    if (action === undefined) {
      return undefined;
    }

    return apply(action);
  }

  /** Drena a fila inteira, em ordem, revalidando cada ação no dreno. */
  drain(apply: ApplyBufferedAction): readonly ApplyResult[] {
    const results: ApplyResult[] = [];
    let result = this.drainNext(apply);

    while (result !== undefined) {
      results.push(result);
      result = this.drainNext(apply);
    }

    return results;
  }
}
