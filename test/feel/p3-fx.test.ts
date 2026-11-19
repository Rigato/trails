import { describe, expect, it } from 'vitest';
import { resolveStep } from '../../src/core/step';
import type { TrainStatus } from '../../src/core/types';
import { TUNING } from '../../src/config/tuning';
import { P3_DRAFT } from '../../src/level/p3';
import {
  derailProgress,
  derailVisuals,
  isInsideTunnel,
  tunnelEmergeMix,
  tunnelEnterAlpha,
  tunnelMotion,
  type DerailExit,
} from '../../src/render/fx';
import {
  board,
  crossing,
  EMPTY,
  gameState,
  pos,
  RED,
  runningTrain,
  straight,
} from '../core/helpers';

describe('túnel — fade em dois tempos (E18)', () => {
  it('tunnelFadeMs é o default do plano §6', () => {
    expect(TUNING.tunnelFadeMs).toBe(160);
  });

  it('entrada: alpha 1 até o fade, cai para 0 no fim e ainda tem tinta perto da boca', () => {
    expect(tunnelEnterAlpha(0)).toBe(1);
    expect(tunnelEnterAlpha(0.05)).toBe(1);
    expect(tunnelEnterAlpha(0.9)).toBeGreaterThan(0.15);
    expect(tunnelEnterAlpha(1)).toBe(0);
  });

  it('entrada: nunca sobe e nunca fica negativa', () => {
    let previous = Infinity;

    for (let sample = 0; sample <= 200; sample += 1) {
      const alpha = tunnelEnterAlpha(sample / 200);
      expect(alpha).toBeLessThanOrEqual(previous + 1e-12);
      expect(alpha).toBeGreaterThanOrEqual(0);
      previous = alpha;
    }
  });

  it('emergência: começa em 0, chega a 1 em tunnelFadeMs e não volta', () => {
    expect(tunnelEmergeMix(0)).toBe(0);
    expect(tunnelEmergeMix(0.5)).toBeGreaterThan(0.75);
    expect(tunnelEmergeMix(160 / 180)).toBeCloseTo(1);
    expect(tunnelEmergeMix(1)).toBe(1);

    let previous = -Infinity;

    for (let sample = 0; sample <= 200; sample += 1) {
      const mix = tunnelEmergeMix(sample / 200);
      expect(mix).toBeGreaterThanOrEqual(previous - 1e-12);
      expect(mix).toBeLessThanOrEqual(1);
      previous = mix;
    }
  });
});

describe('túnel — classificação geométrica do movimento (E18)', () => {
  const level = P3_DRAFT;

  it('entrada, travessia e saída do par da Densidade', () => {
    expect(tunnelMotion(level.board, pos(0, 4), pos(1, 4))).toBe('enter');
    expect(tunnelMotion(level.board, pos(1, 4), pos(4, 4))).toBe('emerge');
    expect(tunnelMotion(level.board, pos(4, 4), pos(5, 4))).toBeNull();
  });

  it('entrada pela borda da grade também é entrada; movimento comum é null', () => {
    expect(tunnelMotion(level.board, null, pos(1, 4))).toBe('enter');
    expect(tunnelMotion(level.board, pos(2, 0), pos(2, 1))).toBeNull();
  });

  it('a travessia no sentido inverso também emerge', () => {
    expect(tunnelMotion(level.board, pos(4, 4), pos(1, 4))).toBe('emerge');
  });
});

describe('túnel — o trem fica escondido entre os dois tempos (E18)', () => {
  const level = P3_DRAFT;

  it('running sem justTunneled no portal = dentro do túnel', () => {
    const inside: TrainStatus = {
      kind: 'running',
      cell: pos(1, 4),
      incoming: 'east',
    };

    expect(isInsideTunnel(level.board, inside)).toBe(true);
  });

  it('justTunneled = já emergiu no parceiro, desenha', () => {
    const emerged: TrainStatus = {
      kind: 'running',
      cell: pos(4, 4),
      incoming: 'east',
      justTunneled: true,
    };

    expect(isInsideTunnel(level.board, emerged)).toBe(false);
  });

  it('fora de portal ou em espera, nunca esconde', () => {
    expect(
      isInsideTunnel(level.board, {
        kind: 'running',
        cell: pos(5, 4),
        incoming: 'east',
      }),
    ).toBe(false);
    expect(
      isInsideTunnel(level.board, {
        kind: 'waiting',
        cell: pos(1, 4),
        direction: 'east',
      }),
    ).toBe(false);
    expect(
      isInsideTunnel(level.board, { kind: 'delivered' }),
    ).toBe(false);
    expect(
      isInsideTunnel(level.board, { kind: 'derailed', reason: 'collision' }),
    ).toBe(false);
  });
});

describe('cruzamento — dois fantasmas, uma colisão (E18)', () => {
  it('os dois trens que colidem em X geram um collision e dois ghosts', () => {
    const red = runningTrain('red', RED, 'circle', pos(1, 0), 'south');
    const blue = runningTrain('blue', RED, 'circle', pos(0, 1), 'east');
    const state = gameState(
      board([
        [EMPTY, straight(0)],
        [straight(1), crossing()],
      ]),
      [red, blue],
      0,
      'playing',
      3,
    );
    const result = resolveStep(state);
    const collisions = result.events.filter(
      (event) => event.kind === 'collision',
    );
    const visual = derailVisuals(result.events, state.trains);

    expect(collisions).toHaveLength(1);
    expect(collisions[0]).toMatchObject({
      kind: 'collision',
      cells: [pos(1, 1)],
    });
    expect(visual).toHaveLength(2);
    expect(
      visual.every(
        (item) =>
          item.reason === 'collision' &&
          item.at.col === 1 &&
          item.at.row === 1,
      ),
    ).toBe(true);
    expect(result.state.lives).toBe(2);
  });
});

describe('montanha — o ghost respeita derailExitMs (E18)', () => {
  it('dura 300 ms e termina em 1, como os demais fantasmas', () => {
    const exit: DerailExit = {
      train: runningTrain('red', RED, 'circle', pos(1, 0), 'east'),
      cell: pos(4, 3),
      direction: 'east',
      reason: 'mountain',
      startedAt: 1000,
    };

    expect(TUNING.derailExitMs).toBe(300);
    expect(derailProgress(exit, 1000)).toBe(0);
    expect(derailProgress(exit, 1150)).toBeCloseTo(0.5);
    expect(derailProgress(exit, 1300)).toBe(1);
    expect(derailProgress(exit, 1400)).toBe(1);
  });
});
