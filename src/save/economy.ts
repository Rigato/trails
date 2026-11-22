/**
 * Economia da vitória (M3/D27/D30/D31) — regra pura, sem DOM e sem canvas.
 *
 * O banco só acontece na VITÓRIA: a run que morre ou é abandonada descarta as
 * moedas e não toca no save (derrota barata entre tentativas). Aqui vivem as
 * duas decisões testáveis sem browser:
 *
 * - `victoryBanking` aplica o bônus superlinear por trem entregue (D27) sobre
 *   as moedas coletadas e devolve a carteira resultante;
 * - `sealCondition` decide o selo de perfeição (D30): todos os trens, todas as
 *   moedas e nenhum consumível na run;
 * - `addSeal` grava o selo no máximo UMA vez por fase (D31): re-vitória
 *   perfeita não duplica a estrela;
 * - `spendFromWallet` é a compra de consumível (M4/D28): deduz o preço ou
 *   recusa sem inventar saldo negativo.
 *
 * A carteira pode repetir o banco em re-vitórias (farm aceito, D31); o selo,
 * não. `main.ts` persiste o resultado uma única vez, junto do desbloqueio.
 */

/** Entrada do banco de uma vitória. */
export interface VictoryBankingInput {
  /** Trens com status `delivered` no snapshot final. */
  readonly delivered: number;
  /** Moedas coletadas na run (`coinsCollected.length`). */
  readonly coins: number;
  /** Saldo persistente antes do banco. */
  readonly wallet: number;
  /** Tabela de bônus (D27): índice = trens entregues. */
  readonly table: readonly number[];
}

/** Resultado do banco de uma vitória, já pronto para o HUD/painel. */
export interface VictoryBanking {
  /** Moedas coletadas na run (eco da entrada). */
  readonly coins: number;
  /** Bônus da tabela para o número de trens entregues. */
  readonly bonus: number;
  /** Total creditado nesta vitória: moedas + bônus. */
  readonly banked: number;
  /** Carteira depois do banco. */
  readonly walletAfter: number;
}

/** Entrada do selo de perfeição (D30). */
export interface SealConditionInput {
  /** Trens com status `delivered` no snapshot final. */
  readonly delivered: number;
  /** Trens da fase (`LevelLayout.trains.length`). */
  readonly trainTotal: number;
  /** Moedas coletadas na run. */
  readonly coins: number;
  /** Moedas da fase; `0` = fase sem moedas (condição trivialmente satisfeita). */
  readonly coinsTotal: number;
  /** A run usou algum consumível (resgate/time-travel, M4/M5)? */
  readonly consumableUsed: boolean;
}

/** Efeito de gravar um selo: a lista nova e se ele é inédito. */
export interface SealUpdate {
  /** Ids com selo; a mesma referência quando o id já estava gravado. */
  readonly seals: readonly string[];
  /** `true` somente na primeira vez que a fase recebe o selo. */
  readonly sealNew: boolean;
}

/**
 * Bônus da tabela para `delivered`, com lookup seguro.
 *
 * Índice não inteiro, negativo ou fora da tabela devolve 0 — save/estado
 * externo nunca pode inventar bônus. A tabela é tuning e pode crescer (5+
 * trens fica fora do MVP2); o índice 0 é o caso «nenhum trem entregue».
 */
export function bonusForDelivered(
  delivered: number,
  table: readonly number[],
): number {
  if (
    !Number.isInteger(delivered) ||
    delivered < 0 ||
    delivered >= table.length
  ) {
    return 0;
  }

  const bonus = table[delivered];

  return bonus !== undefined && Number.isFinite(bonus) ? bonus : 0;
}

/**
 * Banco de uma vitória: moedas coletadas + bônus por trens entregues (D27).
 *
 * `banked = coins + bonus` e `walletAfter = wallet + banked`. Nada aqui
 * persiste ou desenha: a decisão de quando chamar é do shell, e só a vitória
 * chama.
 */
export function victoryBanking(input: VictoryBankingInput): VictoryBanking {
  const bonus = bonusForDelivered(input.delivered, input.table);
  const banked = input.coins + bonus;

  return {
    coins: input.coins,
    bonus,
    banked,
    walletAfter: input.wallet + banked,
  };
}

/**
 * Selo de perfeição da run (D30): todos os trens + todas as moedas + run limpa.
 *
 * Fase sem moedas (`coinsTotal === 0`) satisfaz a parte das moedas de forma
 * trivial (0 === 0). Usar qualquer consumível bloqueia o selo nesta run; o
 * selo eventualmente já gravado de uma run anterior permanece no save.
 */
export function sealCondition(input: SealConditionInput): boolean {
  return (
    input.delivered === input.trainTotal &&
    input.coins === input.coinsTotal &&
    input.consumableUsed === false
  );
}

/**
 * Grava `levelId` na lista de selos no máximo uma vez (set, D31).
 *
 * Re-vitória perfeita devolve a MESMA lista e `sealNew: false`: o selo não é
 * farmável e não re-pulsa como conquista. Quem decide persistir é o shell.
 */
export function addSeal(
  seals: readonly string[],
  levelId: string,
): SealUpdate {
  if (seals.includes(levelId)) {
    return { seals, sealNew: false };
  }

  return { seals: Object.freeze([...seals, levelId]), sealNew: true };
}

/**
 * Deduz o preço de um consumível da carteira (M4/D28).
 *
 * Devolve o saldo novo ou `null` quando a compra não é possível: saldo
 * insuficiente ou valores inválidos (não inteiros/negativos). A função é pura
 * — persistir a dedução imediatamente é decisão do shell, porque a carteira é
 * um valor ENTRE sessões e a compra não pode depender do fim da run.
 *
 * Preço `0` é válido e devolve o mesmo saldo; o tuning é quem decide o valor.
 */
export function spendFromWallet(wallet: number, price: number): number | null {
  if (
    !Number.isInteger(wallet) ||
    wallet < 0 ||
    !Number.isInteger(price) ||
    price < 0
  ) {
    return null;
  }

  if (wallet < price) {
    return null;
  }

  return wallet - price;
}
