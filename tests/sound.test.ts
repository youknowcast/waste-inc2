// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadSoundOn,
  playSound,
  saveSoundOn,
  unlockAudio,
} from '../src/ui/sound.ts';

describe('sound', () => {
  const makeStorage = (): Storage => {
    const store = new Map<string, string>();
    return {
      getItem: (key: string) =>
        store.has(key) ? (store.get(key) ?? null) : null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      get length() {
        return store.size;
      },
      key: (index: number) => {
        const keys = Array.from(store.keys());
        return keys[index] ?? null;
      },
    };
  };

  beforeEach(() => {
    vi.stubGlobal('localStorage', makeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it('既定は ON、保存したら読み戻せる', () => {
    expect(loadSoundOn()).toBe(true);
    saveSoundOn(false);
    expect(loadSoundOn()).toBe(false);
  });
  it('AudioContext が無くても playSound は例外を投げない', () => {
    unlockAudio();
    expect(() => playSound('deal')).not.toThrow();
  });
  it('未解錠でも例外を投げない', () => {
    expect(() => playSound('clear')).not.toThrow();
  });
});
