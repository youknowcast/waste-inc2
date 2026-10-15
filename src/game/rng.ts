import type { Rng } from './types.ts';

function xmur3(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): Rng {
  const hash = xmur3(seed);
  const next = mulberry32(hash());

  return {
    next,
    int(maxExclusive: number): number {
      return Math.floor(next() * maxExclusive);
    },
    shuffle<T>(xs: T[]): T[] {
      const arr = xs.slice();
      for (let i = arr.length - 1; i > 0; i--) {
        const j = this.int(i + 1);
        const a = arr[i];
        const b = arr[j];
        if (a !== undefined && b !== undefined) {
          arr[i] = b;
          arr[j] = a;
        }
      }
      return arr;
    },
  };
}
