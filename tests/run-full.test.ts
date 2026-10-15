import { describe, expect, it } from 'vitest';
import {
  advanceBlind,
  playHand,
  settleBlind,
  startBlind,
  startRun,
  toggleSelect,
} from '../src/game/run';

describe('ラン全体のスモークテスト', () => {
  it('ランの最初から最後まで、例外を出さずに必ず終わる', () => {
    const run = startRun('full-run');
    let guard = 0;
    while (run.result === 'playing' && guard++ < 100) {
      const blind = startBlind(run);
      while (blind.status === 'playing') {
        const best = blind.hand.slice(0, 5).map((c) => c.id);
        for (const id of best) toggleSelect(blind, id);
        if (!playHand(run, blind)) break;
      }
      if (blind.status === 'failed') {
        run.result = 'lost';
        break;
      }
      settleBlind(run, blind);
      advanceBlind(run);
    }
    expect(['won', 'lost']).toContain(run.result);
  });
});
