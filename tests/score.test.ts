import { describe, expect, it } from 'vitest';
import { evaluateHand, scoringCards } from '../src/game/hands';
import { NO_BOSS, scorePlay } from '../src/game/score';
import type { Card, Rank, Suit } from '../src/game/types';

const c = (suit: Suit, ...ranks: Rank[]): Card[] =>
  ranks.map((r, i) => ({ id: `${suit}-${r}-${i}`, suit, rank: r }));
const env = { jokers: [] };
const play = (cards: Card[], boss = NO_BOSS) => {
  const handType = evaluateHand(cards);
  return scorePlay(
    {
      handType,
      played: cards,
      scoring: scoringCards(cards, handType),
      remainingHands: 3,
      remainingDiscards: 3,
      boss,
    },
    env,
  );
};

describe('scorePlay', () => {
  it('単発搬入: (基礎5 + 重さ2) × 単価1 = 7万円', () => {
    const s = play(c('kenpai', 2));
    expect(s.baseWeight).toBe(5);
    expect(s.cardWeight).toBe(2);
    expect(s.weight).toBe(7);
    expect(s.baseMult).toBe(1);
    expect(s.revenue).toBe(7);
  });
  it('役に使われないカードは重さを持たない（5枚出してペアなら2枚分だけ）', () => {
    const s = play([
      ...c('kenpai', 9, 9),
      ...c('odei', 4),
      ...c('shigen', 5),
      ...c('tokkan', 6),
    ]);
    expect(s.cardWeight).toBe(18);
    expect(s.weight).toBe(28);
    expect(s.revenue).toBe(56);
  });
  it('J/Q/K は 10、A は 11 として重さに乗る', () => {
    expect(play(c('kenpai', 11, 11)).cardWeight).toBe(20);
    expect(play(c('kenpai', 14, 14)).cardWeight).toBe(22);
  });
  it('抜き打ち検査: 特管は役に数えるが重さに乗らない', () => {
    const boss = {
      debuffedSuits: ['tokkan'] as Suit[],
      baseMultMultiplier: 1,
      handSizeMod: 0,
    };
    const s = play([...c('tokkan', 7), ...c('tokkan', 7)], boss);
    expect(s.baseWeight).toBe(10); // ペアは成立している
    expect(s.cardWeight).toBe(0); // でも重さは0
    expect(s.weight).toBe(10);
  });
  it('値切り: 基礎単価が半減（端数は切り上げ）', () => {
    const boss = {
      debuffedSuits: [] as Suit[],
      baseMultMultiplier: 0.5,
      handSizeMod: 0,
    };
    expect(play(c('kenpai', 7, 7, 7, 7), boss).baseMult).toBe(4); // 7 → 3.5 → 4
  });
  it('基礎単価に小数の補正がかかっても ceil で整数になる', () => {
    const s = play(c('kenpai', 3, 3), {
      debuffedSuits: [],
      baseMultMultiplier: 1.1,
      handSizeMod: 0,
    });
    expect(s.baseMult).toBe(3); // ceil(2 × 1.1) = ceil(2.2)
  });
});
