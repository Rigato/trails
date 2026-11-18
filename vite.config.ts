import { defineConfig } from 'vitest/config';

// `base: './'` mantém todos os caminhos relativos no build: requisito da spec
// de publicação (Pages serve em subpasta e portais servem em iframe).
export default defineConfig({
  base: './',
  test: {
    // O core é puro, sem DOM. Testes de render/input, quando existirem, definem
    // o ambiente deles no próprio arquivo.
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
