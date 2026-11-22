/**
 * Geometria da lista de fases (M2): 2 colunas, alvo ≥ 44 pt e até 16 fases sem
 * scroll no shell portrait. O desenho usa o mesmo layout do hit-test — testar
 * aqui é o que impede um card «bonito» mas intocável.
 */

import { describe, expect, it } from 'vitest';
import { P0_LEVEL } from '../../src/level/p0';
import {
  computeLayout,
  computePhaseListLayout,
  hudTargetAtPoint,
  phaseCardAtPoint,
  type PhaseListLayout,
} from '../../src/render/layout';

const MIN_TOUCH = 44;

function expectCardsUsable(layout: PhaseListLayout): void {
  expect(layout.columns).toBe(2);
  expect(layout.rows).toBe(8);
  expect(layout.cards).toHaveLength(16);

  for (const [index, card] of layout.cards.entries()) {
    expect(card.width).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(card.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(card.x).toBeGreaterThanOrEqual(0);
    expect(card.y).toBeGreaterThanOrEqual(0);
    expect(card.x + card.width).toBeLessThanOrEqual(layout.width + 0.001);
    expect(card.y + card.height).toBeLessThanOrEqual(layout.height + 0.001);

    for (const other of layout.cards.slice(index + 1)) {
      const overlapsX =
        card.x < other.x + other.width && other.x < card.x + card.width;
      const overlapsY =
        card.y < other.y + other.height && other.y < card.y + card.height;

      expect(overlapsX && overlapsY).toBe(false);
    }
  }
}

describe('lista de fases — layout', () => {
  it('cabe 16 fases em 2 colunas no shell 360×640, cada card ≥ 44 pt', () => {
    expectCardsUsable(computePhaseListLayout(360, 640, 16));
  });

  it('continua cabendo no menor shell jogável conhecido (320×568)', () => {
    expectCardsUsable(computePhaseListLayout(320, 568, 16));
  });

  it('com 5 fases usa 3 linhas e não deixa card vazio na grade', () => {
    const layout = computePhaseListLayout(360, 640, 5);

    expect(layout.rows).toBe(3);
    expect(layout.cards).toHaveLength(5);
    expect(layout.cards[0]?.x).toBe(layout.header.x);
    expect(layout.cards[1]?.x).toBeGreaterThan(layout.cards[0]?.x ?? 0);
    expect(layout.cards[2]?.y).toBeGreaterThan(layout.cards[0]?.y ?? 0);
  });

  it('o hit-test de cada card devolve o índice certo pelo centro', () => {
    const layout = computePhaseListLayout(360, 640, 5);

    for (const [index, card] of layout.cards.entries()) {
      expect(
        phaseCardAtPoint(
          layout,
          card.x + card.width / 2,
          card.y + card.height / 2,
        ),
      ).toBe(index);
    }

    expect(phaseCardAtPoint(layout, 0, 0)).toBeNull();
  });
});

describe('HUD — glifo de volta para a lista', () => {
  it('o alvo do cabeçalho tem 44 pt e é reconhecido antes da grade', () => {
    const layout = computeLayout(360, 640, P0_LEVEL.board);
    const { listButton } = layout;

    expect(listButton.width).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(listButton.height).toBeGreaterThanOrEqual(MIN_TOUCH);
    expect(listButton.x).toBeGreaterThanOrEqual(0);
    expect(listButton.y).toBeGreaterThanOrEqual(0);
    expect(listButton.x + listButton.width).toBeLessThanOrEqual(layout.width);
    expect(listButton.y + listButton.height).toBeLessThanOrEqual(layout.height);
    expect(
      hudTargetAtPoint(
        layout,
        listButton.x + listButton.width / 2,
        listButton.y + listButton.height / 2,
      ),
    ).toBe('list');
  });

  it('os três alvos da fileira inferior continuam intactos', () => {
    const layout = computeLayout(360, 640, P0_LEVEL.board);

    for (const [target, rect] of [
      ['pass', layout.passButton],
      ['rotation', layout.rotationButton],
      ['reset', layout.resetButton],
    ] as const) {
      expect(
        hudTargetAtPoint(layout, rect.x + rect.width / 2, rect.y + rect.height / 2),
      ).toBe(target);
    }
  });
});

describe('HUD — prompt de resgate (M4/D28)', () => {
  it('os dois botões dividem a fileira em metades ≥ 44 pt, sem sobrepor', () => {
    for (const [width, height] of [
      [360, 640],
      [320, 568],
    ] as const) {
      const layout = computeLayout(width, height, P0_LEVEL.board);
      const { rescueButton, surrenderButton } = layout;

      for (const rect of [rescueButton, surrenderButton]) {
        expect(rect.height).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(rect.width).toBeGreaterThanOrEqual(MIN_TOUCH);
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.y).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(layout.width + 0.001);
        expect(rect.y + rect.height).toBeLessThanOrEqual(layout.height + 0.001);
      }

      expect(rescueButton.x + rescueButton.width).toBeLessThan(
        surrenderButton.x,
      );
      expect(rescueButton.x).toBe(layout.passButton.x);
      expect(surrenderButton.x + surrenderButton.width).toBe(
        layout.resetButton.x + layout.resetButton.width,
      );
    }
  });

  it('no prompt o hit-test devolve rescue/surrender; fora dele, os três alvos normais', () => {
    const layout = computeLayout(360, 640, P0_LEVEL.board);

    for (const [target, rect] of [
      ['rescue', layout.rescueButton],
      ['surrender', layout.surrenderButton],
    ] as const) {
      expect(
        hudTargetAtPoint(
          layout,
          rect.x + rect.width / 2,
          rect.y + rect.height / 2,
          { rescuePrompt: true },
        ),
      ).toBe(target);
    }

    // No prompt, o centro da fileira é resgatar (não «Passar turno»).
    expect(
      hudTargetAtPoint(
        layout,
        layout.passButton.x + layout.passButton.width / 2,
        layout.passButton.y + layout.passButton.height / 2,
        { rescuePrompt: true },
      ),
    ).toBe('rescue');

    // Fora do prompt, os alvos normais seguem valendo.
    expect(
      hudTargetAtPoint(
        layout,
        layout.passButton.x + layout.passButton.width / 2,
        layout.passButton.y + layout.passButton.height / 2,
      ),
    ).toBe('pass');

    // O glifo da lista continua acessível nos dois modos.
    expect(
      hudTargetAtPoint(
        layout,
        layout.listButton.x + layout.listButton.width / 2,
        layout.listButton.y + layout.listButton.height / 2,
        { rescuePrompt: true },
      ),
    ).toBe('list');
  });
});
