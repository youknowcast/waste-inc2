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
  it('localStorage プロパティへのアクセス自体が失敗しても例外を投げない', () => {
    const prev = Object.getOwnPropertyDescriptor(window, 'localStorage');
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('Storage access denied');
      },
    });
    try {
      expect(loadSoundOn()).toBe(true);
      expect(() => saveSoundOn(false)).not.toThrow();
    } finally {
      if (prev) {
        Object.defineProperty(window, 'localStorage', prev);
      }
    }
  });
  it('AudioContext が無くても unlockAudio は例外を投げない', () => {
    const prev = Object.getOwnPropertyDescriptor(window, 'AudioContext');
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    try {
      expect(() => unlockAudio()).not.toThrow();
    } finally {
      if (prev) {
        Object.defineProperty(window, 'AudioContext', prev);
      }
    }
  });
});
