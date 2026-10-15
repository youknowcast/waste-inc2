export type Suit = 'kenpai' | 'odei' | 'shigen' | 'tokkan';

export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
};

export type HandType =
  | 'high'
  | 'pair'
  | 'twoPair'
  | 'three'
  | 'straight'
  | 'flush'
  | 'fullHouse'
  | 'four'
  | 'straightFlush'
  | 'royalFlush';

export type Rarity = 'COMMON' | 'UNCOMMON' | 'RARE';

export type JokerInstance = {
  defId: string;
  counters: Record<string, number>;
};

export type Rng = {
  next(): number;
  int(maxExclusive: number): number;
  shuffle<T>(xs: T[]): T[];
};
