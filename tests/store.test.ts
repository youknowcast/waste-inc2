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

  it('dispatch の先頭で fx がクリアされ、次の操作では演出が残らない', () => {
    const { state, dispatch } = useGame();

    dispatch({ kind: 'newRun', seed: 's' });
    dispatch({ kind: 'openBlind' });
    expect(state.fx).toBe('deal');

    const cardId = state.blind?.hand[0]?.id ?? '';
    dispatch({ kind: 'toggleCard', cardId });

    expect(state.fx).toBeNull();
  });

  it('initGame の前に useGame を呼ぶと例外を投げる', async () => {
    vi.resetModules();
    const fresh = await import('../src/ui/store');

    expect(() => fresh.useGame()).toThrow();
  });
});
