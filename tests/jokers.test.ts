import { describe, expect, it } from 'vitest';
import { JOKERS, jokerDef } from '../src/data/jokers';
import { evaluateHand, scoringCards } from '../src/game/hands';
import { NO_BOSS, scorePlay } from '../src/game/score';
import type { ScoreAcc } from '../src/game/score';
import type { Card, JokerInstance, Rank, Suit } from '../src/game/types';

const c = (suit: Suit, ...ranks: Rank[]): Card[] =>
  ranks.map((r, i) => ({ id: `${suit}-${r}-${i}`, suit, rank: r }));
const jk = (...ids: string[]): JokerInstance[] =>
  ids.map((defId) => ({ defId, counters: {} }));
const play = (cards: Card[], jokers: JokerInstance[] = [], boss = NO_BOSS) => {
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
    { jokers },
  );
};

describe('ジョーカーの一覧', () => {
  it('20枚あり、id が重複しない', () => {
    expect(JOKERS).toHaveLength(20);
    expect(new Set(JOKERS.map((j) => j.id)).size).toBe(20);
  });
  it('spec の名前が入っている', () => {
    expect(jokerDef('truck-8t').name).toBe('8t 深ダンプ');
    expect(jokerDef('asbestos').name).toBe('アスベスト除去作業員');
    expect(jokerDef('fuhou-touki').name).toBe('不法投棄の噂');
  });
});

describe('採点に効くジョーカー', () => {
  it('8t 深ダンプは重さ +120', () => {
    const a = play(c('kenpai', 2));
    const b = play(c('kenpai', 2), jk('truck-8t'));
    expect(b.weight - a.weight).toBe(120);
  });
  it('ユニック車は3枚以上で 重さ ×1.25', () => {
    const s = play(c('kenpai', 14, 14, 4), jk('unic'));
    expect(s.xWeight).toBe(1.25);
    expect(s.weight).toBe(Math.floor((10 + 22) * 1.25));
  });
  it('分別の達人は分別搬入で 単価 ×1.5', () => {
    expect(play(c('odei', 2, 5, 9, 11, 13), jk('sorting-master')).xMult).toBe(
      1.5,
    );
    expect(play(c('kenpai', 9, 9), jk('sorting-master')).xMult).toBe(1);
  });
  it('乗算補正は掛け算で合成される（ユニック車 × 分別の達人 = ×1.875）', () => {
    const cards = c('odei', 2, 5, 7, 9, 11);
    const s = play(cards, jk('unic', 'sorting-master'));
    expect(s.xWeight).toBe(1.25);
    expect(s.xMult).toBe(1.5);
  });
  it('脱水機は汚泥3枚以上で 重さ +60 と 単価 +2', () => {
    const s = play(c('odei', 3, 4, 5), jk('dehydrator'));
    expect(s.weightAdd).toBe(60);
    expect(s.multAdd).toBe(2);
  });
  it('特管の専用車両は特管を含む役に +40t / +2', () => {
    const s = play([...c('tokkan', 7), ...c('kenpai', 7)], jk('tokkan-truck'));
    expect(s.weightAdd).toBe(40);
    expect(s.multAdd).toBe(2);
  });
  it('積替保管施設は5枚出したときだけ 単価 +4', () => {
    expect(play(c('odei', 2, 5, 9, 11, 13), jk('transship')).multAdd).toBe(4);
    expect(play(c('odei', 9, 9), jk('transship')).multAdd).toBe(0);
  });
  it('一括下請け契約は出した枚数 × 0.5', () => {
    expect(play(c('kenpai', 9, 9, 4, 5), jk('bulk-sub')).multAdd).toBe(2);
  });
  it('元請とのパイプは残り手札1枚につき +0.3', () => {
    const cards = c('kenpai', 9, 9);
    const handType = evaluateHand(cards);
    const s = scorePlay(
      {
        handType,
        played: cards,
        scoring: scoringCards(cards, handType),
        remainingHands: 2,
        remainingDiscards: 3,
        boss: NO_BOSS,
      },
      { jokers: jk('pipe') },
    );
    expect(s.multAdd).toBe(0.6);
  });
  it('累積カウンタを渡すと効く（アームロール車 / マニフェスト管理）', () => {
    const cards = c('kenpai', 9, 9);
    const handType = evaluateHand(cards);
    const armed: JokerInstance[] = [
      { defId: 'armroll', counters: { weight: 30 } },
      { defId: 'manifest', counters: { mult: 0.6 } },
    ];
    const s = scorePlay(
      {
        handType,
        played: cards,
        scoring: scoringCards(cards, handType),
        remainingHands: 3,
        remainingDiscards: 3,
        boss: NO_BOSS,
      },
      { jokers: armed },
    );
    expect(s.weightAdd).toBe(30);
    expect(s.multAdd).toBeCloseTo(0.8);
  });
  it('同じジョーカーを2枚持てば2回効く', () => {
    const a = play(c('kenpai', 2), jk('truck-8t'));
    const b = play(c('kenpai', 2), jk('truck-8t', 'truck-8t'));
    expect(b.weightAdd - a.weightAdd).toBe(120);
  });
  it('不法投棄の噂は 単価 ×3', () => {
    expect(play(c('kenpai', 2), jk('fuhou-touki')).xMult).toBe(3);
  });
  it('売上は搬入ごとに floor される（端数のある単価で確認）', () => {
    // 同品目ペア: 重さ 28 / 単価 2 + (0.3 × 残り手札3) = 2.9 → 28 × 2.9 = 81.2 → 81
    const s = play(c('kenpai', 9, 9), jk('pipe'));
    expect(s.mult).toBeCloseTo(2.9);
    expect(s.revenue).toBe(81);
  });
});

describe('累積ジョーカーの成長', () => {
  it('アームロール車は捨て札ごとに重さカウンタが +10 される', () => {
    const jokers = jk('armroll');
    const run = { money: 0, day: 1, blindIndex: 0, jokers };
    const self = jokers[0];
    const def = jokerDef('armroll');
    for (let i = 0; i < 3; i++) {
      def.onDiscard?.(run, self);
    }
    expect(self.counters.weight).toBe(30);
  });
  it('マニフェスト管理は採点ごとに単価カウンタが +0.2 され、加算にも乗る', () => {
    const jokers = jk('manifest');
    const self = jokers[0];
    const def = jokerDef('manifest');
    const cards = c('kenpai', 9, 9);
    const handType = evaluateHand(cards);
    const ctx = {
      handType,
      played: cards,
      scoring: scoringCards(cards, handType),
      remainingHands: 3,
      remainingDiscards: 3,
      boss: NO_BOSS,
    };
    const acc1: ScoreAcc = {
      weightAdd: 0,
      xWeight: 1,
      multAdd: 0,
      xMult: 1,
      lines: [],
    };
    def.onScore?.(ctx, acc1, self, { jokers });
    expect(self.counters.mult).toBeCloseTo(0.2);
    expect(acc1.multAdd).toBeCloseTo(0.2);

    const acc2: ScoreAcc = {
      weightAdd: 0,
      xWeight: 1,
      multAdd: 0,
      xMult: 1,
      lines: [],
    };
    def.onScore?.(ctx, acc2, self, { jokers });
    expect(self.counters.mult).toBeCloseTo(0.4);
    expect(acc2.multAdd).toBeCloseTo(0.4);
  });
});
