import { describe, expect, it } from 'vitest';
import { evaluateHand, scoringCards } from '../src/game/hands';
import type { Card, Rank, Suit } from '../src/game/types';

const c = (suit: Suit, ...ranks: Rank[]): Card[] =>
  ranks.map((r, i) => ({ id: `${suit}-${r}-${i}`, suit, rank: r }));

describe('evaluateHand', () => {
  it('1枚は単発搬入', () => expect(evaluateHand(c('kenpai', 2))).toBe('high'));
  it('同品目ペア', () => expect(evaluateHand(c('kenpai', 9, 9))).toBe('pair'));
  it('品目ペア2組', () =>
    expect(evaluateHand(c('kenpai', 9, 9, 3, 3))).toBe('twoPair'));
  it('三点積み', () =>
    expect(evaluateHand(c('kenpai', 9, 9, 9))).toBe('three'));
  it('段積みは5枚', () =>
    expect(
      evaluateHand([
        ...c('kenpai', 5),
        ...c('odei', 6),
        ...c('shigen', 7),
        ...c('tokkan', 8),
        ...c('kenpai', 9),
      ]),
    ).toBe('straight'));
  it('A は 1 としても使える（A2345）', () =>
    expect(
      evaluateHand([
        ...c('kenpai', 14),
        ...c('odei', 2),
        ...c('shigen', 3),
        ...c('tokkan', 4),
        ...c('kenpai', 5),
      ]),
    ).toBe('straight'));
  it('同分類の A2345 は分別段積み（特級一括搬入ではない）', () =>
    expect(evaluateHand(c('kenpai', 14, 2, 3, 4, 5))).toBe('straightFlush'));
  it('同一分類の 10JQKA は特級一括搬入', () =>
    expect(evaluateHand(c('shigen', 10, 11, 12, 13, 14))).toBe('royalFlush'));
  it('10JQKA でも分類が混ざれば段積み', () =>
    expect(
      evaluateHand([
        ...c('kenpai', 10),
        ...c('odei', 11),
        ...c('shigen', 12),
        ...c('tokkan', 13),
        ...c('kenpai', 14),
      ]),
    ).toBe('straight'));
  it('分別搬入（同一分類5枚）', () =>
    expect(evaluateHand(c('odei', 2, 5, 9, 11, 13))).toBe('flush'));
  it('三点＋二点', () =>
    expect(evaluateHand(c('kenpai', 7, 7, 7, 2, 2))).toBe('fullHouse'));
  it('四点積み', () =>
    expect(evaluateHand(c('kenpai', 7, 7, 7, 7))).toBe('four'));
  it('分別段積み', () =>
    expect(evaluateHand(c('shigen', 5, 6, 7, 8, 9))).toBe('straightFlush'));
  it('空配列は throw する', () => expect(() => evaluateHand([])).toThrow());
});

describe('scoringCards', () => {
  it('ペアなら2枚だけを返す（残り3枚は重さを持たない）', () => {
    const cards = c('kenpai', 9, 9, 4, 5, 6);
    const sc = scoringCards(cards, 'pair');
    expect(sc).toHaveLength(2);
    expect(sc.every((x) => x.rank === 9)).toBe(true);
  });
  it('単発搬入なら一番強い1枚', () => {
    expect(
      scoringCards(c('kenpai', 3, 4, 11), 'high').map((x) => x.rank),
    ).toEqual([11]);
  });
  it('分別搬入なら5枚すべて', () => {
    expect(scoringCards(c('odei', 2, 5, 9, 11, 13), 'flush')).toHaveLength(5);
  });
});
