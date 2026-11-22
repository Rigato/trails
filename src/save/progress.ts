/**
 * Regra pura de progresso entre sessões (D30/D31, M2).
 *
 * Separada de `main.ts` para ser testável sem browser e sem canvas: a vitória
 * numa fase desbloqueia a SUCESSORA, nunca regride o que já estava aberto e
 * nunca aponta para fora de `PHASES`.
 *
 * `unlockedIndex` é o menor índice ainda não vencido — a fase recomendada
 * (D6: o card que pulsa na lista). Com o save vazio, vale 0 (fase 1).
 */

/** Último índice válido de uma sequência de `phaseCount` fases (ou 0). */
function lastPhaseIndex(phaseCount: number): number {
  if (!Number.isFinite(phaseCount) || phaseCount < 1) {
    return 0;
  }

  return Math.max(0, Math.trunc(phaseCount) - 1);
}

/** Clampa um índice qualquer ao intervalo `[0, last]`. */
function clampIndex(value: number, last: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(last, Math.max(0, Math.trunc(value)));
}

/**
 * Índice desbloqueado após vencer a fase `wonIndex`.
 *
 * - vitória em `i` abre `i + 1`;
 * - a última fase não abre índice inexistente (clamp no último);
 * - re-vencer uma fase antiga não regride o progresso (`max`).
 */
export function nextUnlockedIndex(
  current: number,
  wonIndex: number,
  phaseCount: number,
): number {
  const last = lastPhaseIndex(phaseCount);
  const unlocked = clampIndex(current, last);

  if (!Number.isFinite(wonIndex) || wonIndex < 0) {
    return unlocked;
  }

  const target = Math.min(last, Math.trunc(wonIndex) + 1);

  return Math.max(unlocked, target);
}

/**
 * Fase recomendada (card com pulso D6): o menor índice desbloqueado ainda sem
 * vitória registrada. Ao completar a sequência, recomenda a última fase para
 * rejogar — nunca um índice inexistente.
 */
export function recommendedPhaseIndex(
  unlockedIndex: number,
  phaseCount: number,
): number {
  return clampIndex(unlockedIndex, lastPhaseIndex(phaseCount));
}
