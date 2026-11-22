/**
 * Persistência entre sessões — a ÚNICA fronteira de save do jogo (spec §7).
 *
 * O jogo nunca chama `localStorage` diretamente: `main.ts` conversa só com
 * `StorageService`, e o backend é injetável. Em produção o adapter é
 * `window.localStorage`; nos testes é um `Map` em memória, então o core do
 * serviço não depende de DOM global.
 *
 * Contrato:
 * - `load()` devolve `SaveState` ou `null` (sem save / save descartado);
 * - `persist(state)` devolve `true` quando o backend aceitou a escrita;
 * - save ausente = do zero (default seguro);
 * - save corrompido (JSON inválido ou schema incompatível) é DESCARTADO com
 *   `console.warn` e o boot continua do zero — nunca trava o jogo;
 * - `version` é o schema versionado: só a versão conhecida é aceita; um save
 *   de outra versão é descartado (migração futura entra aqui, sem tocar no
 *   resto do jogo);
 * - `unlockedIndex` é clampado ao último índice de fase no load e no persist.
 *
 * Reset explícito de QA: `main.ts` lê `?resetSave=1` e chama `clear()` ANTES
 * do primeiro `load()` — a lógica de limpeza vive aqui (`clearSave`) e é
 * testável sem browser. A flag não é salva; recarregar sem ela mantém o novo
 * progresso.
 */

/** Chave única do save no backend (tuning de persistência, plano §5). */
export const SAVE_KEY = 'trails-save';

/** Versão do schema. Subir só com migração explícita (spec §7). */
export const SAVE_VERSION = 1;

/**
 * Progresso persistido entre sessões.
 *
 * `unlockedIndex` = menor índice de fase ainda não vencido (a fase
 * recomendada); `seals` = ids de fase com selo de perfeição (D30/M3);
 * `wallet` = saldo da carteira (M3). M2 só lê e exibe selos/carteira.
 */
export interface SaveState {
  readonly version: typeof SAVE_VERSION;
  readonly unlockedIndex: number;
  readonly seals: readonly string[];
  readonly wallet: number;
}

/**
 * Backend mínimo de armazenamento.
 *
 * `window.localStorage` satisfaz esta interface estruturalmente; um `Map` ou
 * uma implementação de teste também. Os métodos podem lançar — o serviço
 * captura e degrada para «sem save», sem derrubar o boot.
 */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface StorageServiceOptions {
  readonly backend: StorageBackend;
  /** Chave; default `SAVE_KEY`. */
  readonly key?: string;
  /** Último índice de fase válido; saves além disso são clampados. */
  readonly maxUnlockedIndex?: number;
  /** Destino do aviso de save descartado; default `console.warn`. */
  readonly onWarning?: (message: string) => void;
}

export interface StorageService {
  load(): SaveState | null;
  persist(state: SaveState): boolean;
  clear(): void;
}

/** Save inicial: tudo do zero, com a primeira fase desbloqueada. */
export function defaultSaveState(): SaveState {
  const seals: readonly string[] = Object.freeze([]);

  return Object.freeze({
    version: SAVE_VERSION,
    unlockedIndex: 0,
    seals,
    wallet: 0,
  });
}

/**
 * Clampa um índice de fase a `[0, max]`.
 *
 * O save é dado externo: um índice maior que a sequência atual (fase removida,
 * save de outra build) não pode desbloquear uma fase inexistente.
 */
function clampUnlockedIndex(value: number, maxUnlockedIndex: number): number {
  const ceiling = Math.max(0, Math.trunc(maxUnlockedIndex));

  return Math.min(ceiling, Math.max(0, Math.trunc(value)));
}

/**
 * Valida o objeto cru do JSON e devolve um `SaveState` imutável, ou `null`
 * quando o schema não é compatível.
 *
 * Aceita campos extras de mesma versão (compatibilidade aditiva), mas exige
 * todos os campos conhecidos com os tipos certos. Qualquer violação descarta o
 * save inteiro: um progresso parcial silencioso é pior que recomeçar.
 */
function parseSaveState(
  raw: unknown,
  maxUnlockedIndex: number,
): SaveState | null {
  if (typeof raw !== 'object' || raw === null) {
    return null;
  }

  const candidate = raw as Record<string, unknown>;

  if (candidate.version !== SAVE_VERSION) {
    return null;
  }

  const { unlockedIndex, seals, wallet } = candidate;

  if (
    typeof unlockedIndex !== 'number' ||
    !Number.isInteger(unlockedIndex) ||
    unlockedIndex < 0
  ) {
    return null;
  }

  if (
    !Array.isArray(seals) ||
    !seals.every((seal) => typeof seal === 'string')
  ) {
    return null;
  }

  if (typeof wallet !== 'number' || !Number.isInteger(wallet) || wallet < 0) {
    return null;
  }

  return Object.freeze({
    version: SAVE_VERSION,
    unlockedIndex: clampUnlockedIndex(unlockedIndex, maxUnlockedIndex),
    seals: Object.freeze([...seals] as string[]),
    wallet,
  });
}

/** Cria o serviço de save sobre um backend injetável. */
export function createStorageService(
  options: StorageServiceOptions,
): StorageService {
  const backend = options.backend;
  const key = options.key ?? SAVE_KEY;
  const maxUnlockedIndex =
    options.maxUnlockedIndex ?? Number.MAX_SAFE_INTEGER;
  const warn = (message: string): void => {
    if (options.onWarning !== undefined) {
      options.onWarning(message);
      return;
    }

    console.warn(message);
  };

  /** Remove o lixo e avisa; devolve `null` para o chamador seguir do zero. */
  const discard = (reason: string): null => {
    warn(`[trails] Save descartado (${reason}); recomeçando do zero.`);
    clearSave(backend, key);
    return null;
  };

  return {
    load(): SaveState | null {
      let raw: string | null;

      try {
        raw = backend.getItem(key);
      } catch {
        warn('[trails] Storage indisponível na leitura; começando sem save.');
        return null;
      }

      if (raw === null) {
        return null;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(raw);
      } catch {
        return discard('JSON inválido');
      }

      const state = parseSaveState(parsed, maxUnlockedIndex);

      if (state === null) {
        return discard('schema incompatível');
      }

      return state;
    },

    persist(next: SaveState): boolean {
      // Revalida a saída: clampa o índice e impede gravar um schema torto caso
      // algum chamador futuro monte o objeto à mão.
      const safe = parseSaveState(
        {
          version: next.version,
          unlockedIndex: next.unlockedIndex,
          seals: [...next.seals],
          wallet: next.wallet,
        },
        maxUnlockedIndex,
      );

      if (safe === null) {
        warn('[trails] Estado inválido recusado na escrita.');
        return false;
      }

      try {
        backend.setItem(key, JSON.stringify(safe));
        return true;
      } catch {
        warn('[trails] Falha ao gravar o save; progresso só em memória.');
        return false;
      }
    },

    clear(): void {
      clearSave(backend, key);
    },
  };
}

/**
 * Limpa o save de forma explícita (QA `?resetSave=1`, menu futuro ou debug).
 *
 * Silencioso por contrato: limpar não é erro, mesmo quando o backend está
 * indisponível ou a chave já não existe.
 */
export function clearSave(
  backend: StorageBackend,
  key: string = SAVE_KEY,
): void {
  try {
    backend.removeItem(key);
  } catch {
    // Storage bloqueado: não há o que limpar, e o boot segue sem save.
  }
}

/**
 * Backend em memória — fallback do browser e ferramenta de teste.
 *
 * `initial` permite semear um save cru (inclusive corrompido) sem DOM.
 */
export function createMemoryBackend(
  initial?: Readonly<Record<string, string>>,
): StorageBackend {
  const data = new Map<string, string>(Object.entries(initial ?? {}));

  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

/**
 * Adapter fino para o browser: `localStorage` quando acessível.
 *
 * Em iframes/bloqueios/modais de privacidade o acesso pode lançar; nesse caso
 * caímos para memória (o jogo continua jogável, mas o progresso dura só a
 * sessão) e avisamos no console. A costura real com `window.localStorage` fica
 * limitada a esta função — o serviço e os testes não conhecem DOM.
 */
export function createBrowserStorageBackend(): StorageBackend {
  if (typeof window !== 'undefined') {
    try {
      const storage = window.localStorage;
      const probe = '__trails-storage-probe__';

      storage.setItem(probe, '1');
      storage.removeItem(probe);
      return storage;
    } catch {
      console.warn(
        '[trails] localStorage indisponível; progresso só em memória nesta sessão.',
      );
    }
  }

  return createMemoryBackend();
}
