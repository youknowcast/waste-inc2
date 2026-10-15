import { ITEMS } from '../data/items.ts';
import type { Card, Rank, Rng, Suit } from './types.ts';

export const SUITS: readonly Suit[] = ['kenpai', 'odei', 'shigen', 'tokkan'];

export const RANKS: readonly Rank[] = [
  2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
];

export const SUIT_LABEL: Record<Suit, string> = {
  kenpai: '建廃',
  odei: '汚泥',
  shigen: '資源',
  tokkan: '特管',
};

export const SUIT_MARK: Record<Suit, string> = {
  kenpai: '🧱',
  odei: '💧',
  shigen: '♻️',
  tokkan: '☣️',
};

export const SUIT_COLOR: Record<Suit, string> = {
  kenpai: '#b5502a',
  odei: '#6b7a3a',
  shigen: '#2f7fa8',
  tokkan: '#7a3fa0',
};

export function rankValue(rank: Rank): number {
  if (rank >= 2 && rank <= 10) return rank;
  if (rank <= 13) return 10;
  return 11;
}

export function rankLabel(rank: Rank): string {
  if (rank === 11) return 'J';
  if (rank === 12) return 'Q';
  if (rank === 13) return 'K';
  if (rank === 14) return 'A';
  return String(rank);
}

export function itemNameFor(suit: Suit, rank: Rank): string {
  return ITEMS[suit][rank];
}

export function itemName(card: Card): string {
  return itemNameFor(card.suit, card.rank);
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${suit}-${rank}`, suit, rank });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], rng: Rng): Card[] {
  return rng.shuffle(deck);
}
