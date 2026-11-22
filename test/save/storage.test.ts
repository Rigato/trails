/**
 * StorageService — a fronteira única de save (M2/spec §7).
 *
 * Testes em node, sem DOM: o backend é um `Map` injetável. O que importa aqui
 * é o contrato de degradação — save ausente, corrompido ou de outra versão
 * NUNCA derruba o boot; o reset de QA limpa sem depender de `window`.
 */

import { describe, expect, it } from 'vitest';
import {
  SAVE_KEY,
  SAVE_VERSION,
  clearSave,
  createBrowserStorageBackend,
  createMemoryBackend,
  createStorageService,
  defaultSaveState,
  type SaveState,
  type StorageBackend,
} from '../../src/save/storage';

interface TestBackend {
  readonly backend: StorageBackend;
  readonly data: Map<string, string>;
}

function testBackend(initial?: Readonly<Record<string, string>>): TestBackend {
  const data = new Map<string, string>(Object.entries(initial ?? {}));

  return {
    data,
    backend: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => {
        data.set(key, value);
      },
      removeItem: (key) => {
        data.delete(key);
      },
    },
  };
}

function serviceOn(
  { backend }: TestBackend,
  warnings: string[] = [],
  maxUnlockedIndex = 4,
) {
  return createStorageService({
    backend,
    maxUnlockedIndex,
    onWarning: (message) => warnings.push(message),
  });
}

describe('StorageService — save entre sessões', () => {
  it('sem save devolve null e o default seguro tem fase 1 e carteira 0', () => {
    const fixture = testBackend();
    const service = serviceOn(fixture);

    expect(service.load()).toBeNull();
    expect(defaultSaveState()).toEqual({
      version: SAVE_VERSION,
      unlockedIndex: 0,
      seals: [],
      wallet: 0,
    });
  });

  it('persist → load faz round-trip do schema versionado na chave trails-save', () => {
    const fixture = testBackend();
    const service = serviceOn(fixture);
    const state: SaveState = {
      version: SAVE_VERSION,
      unlockedIndex: 2,
      seals: ['p0', 'p1'],
      wallet: 9,
    };

    expect(service.persist(state)).toBe(true);

    const raw = fixture.data.get(SAVE_KEY);

    expect(raw).toBeDefined();
    expect(JSON.parse(raw ?? 'null')).toEqual({
      version: 1,
      unlockedIndex: 2,
      seals: ['p0', 'p1'],
      wallet: 9,
    });
    expect(service.load()).toEqual(state);
  });

  it('clampa unlockedIndex ao último índice no load e no persist', () => {
    const fixture = testBackend({
      [SAVE_KEY]: JSON.stringify({
        version: SAVE_VERSION,
        unlockedIndex: 99,
        seals: [],
        wallet: 0,
      }),
    });
    const service = serviceOn(fixture);

    expect(service.load()?.unlockedIndex).toBe(4);

    service.persist({
      version: SAVE_VERSION,
      unlockedIndex: 42,
      seals: [],
      wallet: 0,
    });

    expect(JSON.parse(fixture.data.get(SAVE_KEY) ?? '{}').unlockedIndex).toBe(4);
  });

  it('JSON corrompido descarta o save, avisa e limpa a chave', () => {
    const fixture = testBackend({ [SAVE_KEY]: '{"version":1,' });
    const warnings: string[] = [];
    const service = serviceOn(fixture, warnings);

    expect(service.load()).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('JSON inválido');
    expect(fixture.data.has(SAVE_KEY)).toBe(false);
  });

  it('versão incompatível descarta o save em vez de arriscar migração implícita', () => {
    const fixture = testBackend({
      [SAVE_KEY]: JSON.stringify({
        version: 2,
        unlockedIndex: 3,
        seals: [],
        wallet: 50,
      }),
    });
    const warnings: string[] = [];
    const service = serviceOn(fixture, warnings);

    expect(service.load()).toBeNull();
    expect(warnings[0]).toContain('schema incompatível');
    expect(fixture.data.has(SAVE_KEY)).toBe(false);
  });

  it.each([
    ['objeto nulo', null],
    ['sem versão', { unlockedIndex: 1, seals: [], wallet: 0 }],
    ['índice negativo', { version: 1, unlockedIndex: -1, seals: [], wallet: 0 }],
    ['índice fracionário', { version: 1, unlockedIndex: 1.5, seals: [], wallet: 0 }],
    ['seals não-array', { version: 1, unlockedIndex: 1, seals: 'p0', wallet: 0 }],
    ['seal não-string', { version: 1, unlockedIndex: 1, seals: [1], wallet: 0 }],
    ['carteira negativa', { version: 1, unlockedIndex: 1, seals: [], wallet: -2 }],
    ['carteira fracionária', { version: 1, unlockedIndex: 1, seals: [], wallet: 0.5 }],
  ])('schema torto (%s) descarta o save inteiro', (_label, payload) => {
    const fixture = testBackend({
      [SAVE_KEY]: JSON.stringify(payload),
    });
    const warnings: string[] = [];
    const service = serviceOn(fixture, warnings);

    expect(service.load()).toBeNull();
    expect(warnings).toHaveLength(1);
    expect(fixture.data.has(SAVE_KEY)).toBe(false);
  });

  it('aceita campos extras da mesma versão (compatibilidade aditiva)', () => {
    const fixture = testBackend({
      [SAVE_KEY]: JSON.stringify({
        version: SAVE_VERSION,
        unlockedIndex: 1,
        seals: ['p0'],
        wallet: 3,
        futureField: true,
      }),
    });

    expect(serviceOn(fixture).load()).toEqual({
      version: SAVE_VERSION,
      unlockedIndex: 1,
      seals: ['p0'],
      wallet: 3,
    });
  });

  it('backend que lança na leitura não trava o boot e avisa', () => {
    const backend: StorageBackend = {
      getItem: () => {
        throw new Error('storage bloqueado');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    const warnings: string[] = [];
    const service = createStorageService({
      backend,
      onWarning: (message) => warnings.push(message),
    });

    expect(service.load()).toBeNull();
    expect(warnings[0]).toContain('Storage indisponível');
  });

  it('backend que lança na escrita devolve false em vez de propagar', () => {
    const backend: StorageBackend = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota cheia');
      },
      removeItem: () => undefined,
    };
    const warnings: string[] = [];
    const service = createStorageService({
      backend,
      onWarning: (message) => warnings.push(message),
    });

    expect(service.persist(defaultSaveState())).toBe(false);
    expect(warnings[0]).toContain('Falha ao gravar');
  });

  it('clearSave é a lógica pura do ?resetSave=1: remove e nunca lança', () => {
    const fixture = testBackend({
      [SAVE_KEY]: JSON.stringify(defaultSaveState()),
    });

    clearSave(fixture.backend);
    expect(fixture.data.has(SAVE_KEY)).toBe(false);

    const throwing: StorageBackend = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => {
        throw new Error('bloqueado');
      },
    };

    expect(() => clearSave(throwing)).not.toThrow();
  });

  it('o backend em memória funciona como fallback fora do browser', () => {
    const backend = createMemoryBackend();
    const service = createStorageService({ backend });

    expect(service.persist(defaultSaveState())).toBe(true);
    expect(service.load()?.wallet).toBe(0);

    // Em node o adapter de browser cai para memória (sem tocar em window).
    const fallback = createBrowserStorageBackend();

    fallback.setItem('x', '1');
    expect(fallback.getItem('x')).toBe('1');
    fallback.removeItem('x');
    expect(fallback.getItem('x')).toBeNull();
  });
});
