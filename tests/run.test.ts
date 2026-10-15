import { describe, expect, it } from 'vitest';
import {
  addJoker,
  advanceBlind,
  discardSelected,
  payoutFor,
  removeJoker,
  settleBlind,
  startBlind,
  startRun,
  toggleSelect,
} from '../src/game/run';
import { HAND_SIZE, MAX_JOKERS, START_MONEY } from '../src/game/constants';

describe('payoutFor', () => {
  it('報酬 + 残り手札 × 1 + 利息（所持金5万円ごとに1万円、上限5万円）', () => {
    const run = startRun('s');
    run.money = 23;
    const blind = startBlind(run); // 1日目午前便: 報酬3万円
    blind.handsLeft = 2;
    const p = payoutFor(run, blind);
    expect(p.reward).toBe(3);
    expect(p.handBonus).toBe(2);
    expect(p.interest).toBe(4); // floor(23/5)=4
    expect(p.total).toBe(9);
  });
  it('利息には上限5万円がかかる', () => {
    const run = startRun('s');
    run.money = 1000;
    expect(payoutFor(run, startBlind(run)).interest).toBe(5);
  });
  it('中間処理場の株主があると利息が2倍・上限10万円', () => {
    const run = startRun('s');
    run.money = 1000;
    addJoker(run, 'shareholder');
    expect(payoutFor(run, startBlind(run)).interest).toBe(10);
  });
});

describe('settleBlind / advanceBlind', () => {
  it('報酬が所持金に入り、総売上に積まれる', () => {
    const run = startRun('s');
    const blind = startBlind(run);
    blind.revenue = 300;
    blind.status = 'cleared';
    const before = run.money;
    const p = settleBlind(run, blind);
    expect(run.money).toBe(before + p.total);
    expect(run.totalRevenue).toBe(300);
  });
  it('大型案件の常連は締切を突破したときだけ +20万円', () => {
    const run = startRun('s');
    addJoker(run, 'big-client');
    run.day = 1;
    run.blindIndex = 2; // 締切
    const blind = startBlind(run);
    blind.status = 'cleared';
    blind.revenue = 600;
    const p = settleBlind(run, blind);
    expect(run.money).toBe(START_MONEY + p.total + 20);

    const run2 = startRun('s');
    addJoker(run2, 'big-client');
    run2.day = 1;
    run2.blindIndex = 1; // 午後便
    const blind2 = startBlind(run2);
    blind2.status = 'cleared';
    blind2.revenue = 450;
    const p2 = settleBlind(run2, blind2);
    expect(run2.money).toBe(START_MONEY + p2.total); // ボーナスは乗らない
  });
  it('便を進めると 1日目午前 → 午後 → 締切 → 2日目午前', () => {
    const run = startRun('s');
    advanceBlind(run);
    expect([run.day, run.blindIndex]).toEqual([1, 1]);
    advanceBlind(run);
    expect([run.day, run.blindIndex]).toEqual([1, 2]);
    advanceBlind(run);
    expect([run.day, run.blindIndex]).toEqual([2, 0]);
  });
  it('3日目の締切を終えると勝利', () => {
    const run = startRun('s');
    run.day = 3;
    run.blindIndex = 2;
    advanceBlind(run);
    expect(run.result).toBe('won');
  });
});

describe('ジョーカーの出し入れ', () => {
  it('枠は5つまで', () => {
    const run = startRun('s');
    for (let i = 0; i < 8; i++) addJoker(run, 'truck-2t');
    expect(run.jokers).toHaveLength(MAX_JOKERS);
  });
  it('不法投棄の噂は買った瞬間に所持金を0にする', () => {
    const run = startRun('s');
    run.money = 40;
    addJoker(run, 'fuhou-touki');
    expect(run.money).toBe(0);
  });
  it('売却すると購入額の半分が戻る', () => {
    const run = startRun('s');
    addJoker(run, 'truck-2t');
    expect(removeJoker(run, 0)).toBe(2);
  });
});

describe('累積カウンタは便をまたいで残る', () => {
  it('アームロール車は捨て札のたびに +10 を積み、次の便でも効く', () => {
    const run = startRun('s');
    addJoker(run, 'armroll');
    const b1 = startBlind(run);
    // 20回引いても落ちない
    for (let i = 0; i < 20; i++) {
      if (b1.status !== 'playing') break;
      toggleSelect(b1, b1.hand[0].id);
      discardSelected(run, b1);
    }
    const after = run.jokers[0].counters.weight;
    expect(after).toBeGreaterThan(0);
    run.blindIndex = 1;
    expect(run.jokers[0].counters.weight).toBe(after); // 便をまたいでも残る
  });
});
