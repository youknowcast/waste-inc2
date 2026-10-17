import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initGame, useGame } from '../src/ui/store';

describe('store', () => {
  beforeEach(() => {
    initGame('s');
  });

  it('dispatch でリアクティブな状態が更新される（toggleSound で反転）', () => {
    const { state, dispatch } = useGame();
    const before = state.soundOn;

    dispatch({ kind: 'toggleSound' });

    expect(state.soundOn).toBe(!before);
  });

  it('useGame は同じ state を返し、dispatch の変更がそこに残る', () => {
    const { state, dispatch } = useGame();

    dispatch({ kind: 'newRun', seed: 's' });
    dispatch({ kind: 'openBlind' });
    expect(state.screen).toBe('board');
    expect(state.blind).not.toBeNull();

    // 続く操作でも blind は保持され、選択だけが更新される（作り直されない）。
    const blind = state.blind;
    const cardId = state.blind?.hand[0]?.id ?? '';
    dispatch({ kind: 'toggleCard', cardId });
    expect(state.blind).toBe(blind);
    expect(state.blind?.selected).toEqual([cardId]);
  });

  it('initGame の前に useGame を呼ぶと例外を投げる', async () => {
    vi.resetModules();
    const fresh = await import('../src/ui/store');

    expect(() => fresh.useGame()).toThrow();
  });
});
