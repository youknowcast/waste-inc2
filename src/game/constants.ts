import { BLINDS } from '../data/blinds.ts';
import type { Rarity } from './types.ts';

export const START_MONEY = 4;
export const HAND_SIZE = 8;
export const HANDS_PER_BLIND = 4;
export const DISCARDS_PER_BLIND = 3;
export const MAX_JOKERS = 5;
export const HAND_BONUS_PER_HAND = 1;
export const INTEREST_UNIT = 5;
export const INTEREST_RATE = 1;
export const INTEREST_CAP = 5;
export const REROLL_BASE = 3;
export const REROLL_STEP = 1;
export const SHOP_SLOTS = 2;
export const SPECIAL_CHANCE = 0.1;

// リザルトのランク境界（総売上・万円）。
// RANK_A_MIN は目標金額の合計。これを下回る＝完走できていない（B）。
export const RANK_A_MIN = BLINDS.reduce((sum, b) => sum + b.goal, 0);
// RANK_S_MIN は S の閾値。ビルドが刺さったと言える総売上。
export const RANK_S_MIN = 300000;

export const RARITY_PRICE: Record<Rarity, number> = {
  COMMON: 4,
  UNCOMMON: 6,
  RARE: 8,
};

export const RARITY_WEIGHT: Record<Rarity, number> = {
  COMMON: 60,
  UNCOMMON: 30,
  RARE: 10,
};
