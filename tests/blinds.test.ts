import { describe, expect, it } from 'vitest';
import { BLINDS, blindAt, bossLabel, bossText } from '../src/data/blinds';
import { bossRules } from '../src/game/blinds';

describe('BLINDS', () => {
  it('3日 × 3便 = 9件', () => expect(BLINDS).toHaveLength(9));
  it('目標金額が spec のとおり', () => {
    expect(blindAt(1, 0).goal).toBe(300);
    expect(blindAt(2, 2).goal).toBe(1600);
    expect(blindAt(3, 2).goal).toBe(5000);
  });
  it('締切だけが元請で、報酬は 3/4/5万円', () => {
    expect(blindAt(1, 0).bossId).toBeUndefined();
    expect(bossLabel('inspection')).toBe('抜き打ち立入検査');
    expect(bossText('storm')).toContain('手札');
    expect([
      blindAt(1, 0).reward,
      blindAt(1, 1).reward,
      blindAt(1, 2).reward,
    ]).toEqual([3, 4, 5]);
  });
});

describe('bossRules', () => {
  it('抜き打ち検査は特管を無効にする（役の成立には数える）', () => {
    const r = bossRules(blindAt(1, 2));
    expect(r.debuffedSuits).toEqual(['tokkan']);
    expect(r.baseMultMultiplier).toBe(1);
    expect(r.handSizeMod).toBe(0);
  });
  it('元請の値切りは基礎単価が半減', () => {
    expect(bossRules(blindAt(2, 2)).baseMultMultiplier).toBe(0.5);
  });
  it('大雨警報は手札が1枚減る', () => {
    expect(bossRules(blindAt(3, 2)).handSizeMod).toBe(-1);
  });
  it('通常の便には縛りが無い', () => {
    const r = bossRules(blindAt(2, 1));
    expect(r.debuffedSuits).toEqual([]);
    expect(r.baseMultMultiplier).toBe(1);
    expect(r.handSizeMod).toBe(0);
  });
});
