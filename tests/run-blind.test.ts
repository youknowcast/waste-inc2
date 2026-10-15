import { describe, expect, it } from 'vitest';
import { HAND_SIZE, START_MONEY } from '../src/game/constants';
import {
  discardSelected,
  playHand,
  startBlind,
  startRun,
  toggleSelect,
} from '../src/game/run';

describe('startRun / startBlind', () => {
  it('開始資金4万円、1日目の午前便から', () => {
    const run = startRun('s');
    expect(run.money).toBe(START_MONEY);
    expect(run.day).toBe(1);
    expect(run.blindIndex).toBe(0);
    expect(run.result).toBe('playing');
  });
  it('手札8枚、手札4回・捨て札3回で始まる', () => {
    const blind = startBlind(startRun('s'));
    expect(blind.hand).toHaveLength(HAND_SIZE);
    expect(blind.handsLeft).toBe(4);
    expect(blind.discardsLeft).toBe(3);
    expect(blind.status).toBe('playing');
  });
  it('大雨警報の便は手札が7枚（3日目の締切）', () => {
    const run = startRun('s');
    run.day = 3;
    run.blindIndex = 2;
    expect(startBlind(run).hand).toHaveLength(HAND_SIZE - 1);
  });
});

describe('選択と搬入', () => {
  it('5枚を超えて選べない', () => {
    const blind = startBlind(startRun('s'));
    for (const c of blind.hand) toggleSelect(blind, c.id);
    expect(blind.selected).toHaveLength(5);
  });
  it('選択していないと搬入できない', () => {
    expect(playHand(startRun('s'), startBlind(startRun('s')))).toBeNull();
  });
  it('搬入すると売上に足され、手札が1回減り、引き直して8枚に戻る', () => {
    const run = startRun('s');
    const blind = startBlind(run);
    toggleSelect(blind, blind.hand[0].id);
    const score = playHand(run, blind)!;
    expect(score.revenue).toBeGreaterThan(0);
    expect(blind.revenue).toBe(score.revenue);
    expect(blind.handsLeft).toBe(3);
    expect(blind.hand).toHaveLength(HAND_SIZE);
    expect(blind.selected).toHaveLength(0);
  });
  it('捨てると捨て札が1回減り、手札は引き直される', () => {
    const run = startRun('s');
    const blind = startBlind(run);
    toggleSelect(blind, blind.hand[0].id);
    discardSelected(run, blind);
    expect(blind.discardsLeft).toBe(2);
    expect(blind.hand).toHaveLength(HAND_SIZE);
  });
});

describe('突破と失敗', () => {
  it('目標に届いたら cleared', () => {
    const run = startRun('s');
    const blind = startBlind(run);
    blind.revenue = blind.def.goal - 1; // あと1万円
    toggleSelect(blind, blind.hand[0].id); // 1枚でも必ず7万円以上になる
    playHand(run, blind);
    expect(blind.revenue).toBeGreaterThanOrEqual(blind.def.goal);
    expect(blind.status).toBe('cleared');
  });
  it('手札を使い切って未達なら failed', () => {
    const run = startRun('s');
    const blind = startBlind(run); // 1日目午前便の目標は300万円
    for (let i = 0; i < 4; i++) {
      toggleSelect(blind, blind.hand[0].id);
      playHand(run, blind);
    }
    expect(blind.handsLeft).toBe(0);
    expect(blind.revenue).toBeLessThan(blind.def.goal); // 1枚ずつでは到底届かない
    expect(blind.status).toBe('failed');
  });
});

describe('デッキ切れ', () => {
  it('山が尽きたら捨て山を再シャッフルして、手札8枚を保つ', () => {
    const run = startRun('s');
    const blind = startBlind(run);
    blind.discardsLeft = 60; // 意図的に山を枯らせるようにする
    for (let i = 0; i < 50; i++) {
      toggleSelect(blind, blind.hand[0].id);
      discardSelected(run, blind);
      expect(blind.hand).toHaveLength(HAND_SIZE);
    }
  });
});
