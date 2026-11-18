import { describe, expect, it } from 'vitest';

// Placeholder do E0: garante `npm test` verde de fábrica. Os testes reais do
// core entram em `test/core/` a partir do E1.
describe('scaffold', () => {
  it('executa a suíte de testes', () => {
    expect(1 + 1).toBe(2);
  });
});
