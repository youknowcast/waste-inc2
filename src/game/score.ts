import { rankValue } from './cards.ts';
import { HAND_LABEL, HAND_TABLE } from './hands.ts';
import type { Card, HandType, JokerInstance, Suit } from './types.ts';

export type BossRules = {
  debuffedSuits: Suit[];
  baseMultMultiplier: number;
  handSizeMod: number;
};

export const NO_BOSS: BossRules = {
  debuffedSuits: [],
  baseMultMultiplier: 1,
  handSizeMod: 0,
};

export type ScoreEnv = {
  jokers: JokerInstance[];
};

export type JokerRunView = {
  money: number;
  day: number;
  blindIndex: number;
  jokers: JokerInstance[];
};

export type ScoreContext = {
  handType: HandType;
  played: Card[];
  scoring: Card[];
  remainingHands: number;
  remainingDiscards: number;
  boss: BossRules;
};

export type ScoreLine = {
  label: string;
  kind: 'weight' | 'mult';
  value: number;
};

export type ScoreAcc = {
  weightAdd: number;
  xWeight: number;
  multAdd: number;
  xMult: number;
  lines: ScoreLine[];
};

export type ScoreBreakdown = {
  baseWeight: number;
  cardWeight: number;
  weightAdd: number;
  xWeight: number;
  weight: number;
  baseMult: number;
  multAdd: number;
  xMult: number;
  mult: number;
  revenue: number;
  lines: ScoreLine[];
};

export function scorePlay(ctx: ScoreContext, _env: ScoreEnv): ScoreBreakdown {
  const acc: ScoreAcc = {
    weightAdd: 0,
    xWeight: 1,
    multAdd: 0,
    xMult: 1,
    lines: [],
  };

  const baseWeight = HAND_TABLE[ctx.handType].baseWeight;
  const cardWeight = ctx.scoring
    .filter((c) => !ctx.boss.debuffedSuits.includes(c.suit))
    .reduce((sum, c) => sum + rankValue(c.rank), 0);
  const baseMult = Math.ceil(
    HAND_TABLE[ctx.handType].baseMult * ctx.boss.baseMultMultiplier,
  );

  // Task 4 will insert the joker loop here.

  const weight = Math.floor(
    (baseWeight + cardWeight + acc.weightAdd) * acc.xWeight,
  );
  const mult = Math.round((baseMult + acc.multAdd) * acc.xMult * 100) / 100;
  const revenue = Math.floor(weight * mult);

  const lines: ScoreLine[] = [
    { label: HAND_LABEL[ctx.handType], kind: 'weight', value: baseWeight },
    { label: '搬入物', kind: 'weight', value: cardWeight },
    { label: HAND_LABEL[ctx.handType], kind: 'mult', value: baseMult },
  ];

  if (acc.weightAdd !== 0) {
    lines.push({ label: '重さ加算', kind: 'weight', value: acc.weightAdd });
  }
  if (acc.xWeight !== 1) {
    lines.push({ label: '重さ倍率', kind: 'weight', value: acc.xWeight });
  }
  if (acc.multAdd !== 0) {
    lines.push({ label: '単価加算', kind: 'mult', value: acc.multAdd });
  }
  if (acc.xMult !== 1) {
    lines.push({ label: '単価倍率', kind: 'mult', value: acc.xMult });
  }

  return {
    baseWeight,
    cardWeight,
    weightAdd: acc.weightAdd,
    xWeight: acc.xWeight,
    weight,
    baseMult,
    multAdd: acc.multAdd,
    xMult: acc.xMult,
    mult,
    revenue,
    lines,
  };
}
