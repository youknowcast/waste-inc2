import { describe, expect, it } from 'vitest';
import { createRng } from '../src/game/rng';

describe('createRng', () => {
  it('同じシードなら同じ数列を返す', () => {
    const a = createRng('s1');
    const b = createRng('s1');
    expect([a.next(), a.next(), a.next()]).toEqual([
      b.next(),
      b.next(),
      b.next(),
    ]);
  });
  it('違うシードなら違う数列を返す', () => {
    expect(createRng('s1').next()).not.toBe(createRng('s2').next());
  });
  it('int(n) は 0 以上 n 未満の整数を返す', () => {
    const r = createRng('s');
    for (let i = 0; i < 200; i++) {
      const v = r.int(5);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
  it('shuffle は元の配列を壊さず、要素を落とさない', () => {
    const src = [1, 2, 3, 4, 5];
    const out = createRng('s').shuffle(src);
    expect(src).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
