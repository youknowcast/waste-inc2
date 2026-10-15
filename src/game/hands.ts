import type { Card, HandType } from './types.ts';

export const HAND_TYPES: readonly HandType[] = [
  'high',
  'pair',
  'twoPair',
  'three',
  'straight',
  'flush',
  'fullHouse',
  'four',
  'straightFlush',
  'royalFlush',
];

export const HAND_TABLE: Record<
  HandType,
  { baseWeight: number; baseMult: number }
> = {
  high: { baseWeight: 5, baseMult: 1 },
  pair: { baseWeight: 10, baseMult: 2 },
  twoPair: { baseWeight: 20, baseMult: 2 },
  three: { baseWeight: 30, baseMult: 3 },
  straight: { baseWeight: 30, baseMult: 4 },
  flush: { baseWeight: 35, baseMult: 4 },
  fullHouse: { baseWeight: 40, baseMult: 4 },
  four: { baseWeight: 60, baseMult: 7 },
  straightFlush: { baseWeight: 100, baseMult: 8 },
  royalFlush: { baseWeight: 100, baseMult: 8 },
};

export const HAND_LABEL: Record<HandType, string> = {
  high: '単発搬入',
  pair: '同品目ペア',
  twoPair: '品目ペア2組',
  three: '三点積み',
  straight: '段積み',
  flush: '分別搬入',
  fullHouse: '三点＋二点',
  four: '四点積み',
  straightFlush: '分別段積み',
  royalFlush: '特級一括搬入',
};

export function handRank(type: HandType): number {
  return HAND_TYPES.indexOf(type);
}

function isFlush(cards: Card[]): boolean {
  return cards.length === 5 && new Set(cards.map((c) => c.suit)).size === 1;
}

function isStraight(cards: Card[]): boolean {
  if (cards.length !== 5) return false;
  const ranks = [...new Set(cards.map((c) => c.rank))];
  if (ranks.length !== 5) return false;
  const sorted = [...ranks].sort((a, b) => a - b);
  if (sorted[4] - sorted[0] === 4) return true;
  // A as low: A-2-3-4-5
  if (sorted[0] === 2 && sorted[3] === 5 && sorted[4] === 14) return true;
  return false;
}

function rankCounts(cards: Card[]): Record<number, number> {
  const counts: Record<number, number> = {};
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] ?? 0) + 1;
  }
  return counts;
}

export function evaluateHand(cards: Card[]): HandType {
  if (cards.length === 0) {
    throw new Error('Empty hand');
  }

  const flush = isFlush(cards);
  const straight = isStraight(cards);
  const ranks = cards.map((c) => c.rank);

  const counts = rankCounts(cards);
  const values = Object.values(counts);
  const hasFour = values.includes(4);
  const hasThree = values.includes(3);
  const pairCount = values.filter((n) => n === 2).length;

  if (flush && straight) {
    const sortedRanks = [...ranks].sort((a, b) => a - b);
    const isRoyal =
      sortedRanks[0] === 10 &&
      sortedRanks[1] === 11 &&
      sortedRanks[2] === 12 &&
      sortedRanks[3] === 13 &&
      sortedRanks[4] === 14;
    return isRoyal ? 'royalFlush' : 'straightFlush';
  }
  if (hasFour) return 'four';
  if (hasThree && pairCount >= 1) return 'fullHouse';
  if (flush) return 'flush';
  if (straight) return 'straight';
  if (hasThree) return 'three';
  if (pairCount === 2) return 'twoPair';
  if (pairCount === 1) return 'pair';

  return 'high';
}

export function scoringCards(cards: Card[], type: HandType): Card[] {
  if (cards.length === 0) return [];

  switch (type) {
    case 'high': {
      const maxRank = Math.max(...cards.map((c) => c.rank));
      const found = cards.find((c) => c.rank === maxRank);
      return found ? [found] : [];
    }
    case 'pair':
    case 'twoPair':
    case 'three':
    case 'four': {
      const counts = rankCounts(cards);
      const threshold =
        type === 'pair' ? 2 : type === 'twoPair' ? 2 : type === 'three' ? 3 : 4;
      const targetRanks = Object.entries(counts)
        .filter(([, count]) => count >= threshold)
        .map(([rank]) => Number(rank));
      return cards.filter((c) => targetRanks.includes(c.rank));
    }
    case 'fullHouse':
    case 'straight':
    case 'flush':
    case 'straightFlush':
    case 'royalFlush':
      return [...cards];
    default:
      return [...cards];
  }
}
