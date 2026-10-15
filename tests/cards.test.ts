import { describe, expect, it } from 'vitest';
import { ITEMS } from '../src/data/items';
import {
  createDeck,
  itemName,
  itemNameFor,
  RANKS,
  rankLabel,
  rankValue,
  SUITS,
  shuffleDeck,
} from '../src/game/cards';
import { createRng } from '../src/game/rng';

describe('deck', () => {
  it('52枚で、id が重複しない', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });
  it('分類ごとに13枚ずつある', () => {
    const deck = createDeck();
    for (const s of SUITS)
      expect(deck.filter((c) => c.suit === s)).toHaveLength(13);
  });
  it('シャッフルしても52枚のまま', () => {
    expect(shuffleDeck(createDeck(), createRng('x'))).toHaveLength(52);
  });
});

describe('rankValue', () => {
  it('2〜10 はそのまま、J/Q/K は 10、A は 11', () => {
    expect(rankValue(2)).toBe(2);
    expect(rankValue(10)).toBe(10);
    expect(rankValue(11)).toBe(10);
    expect(rankValue(13)).toBe(10);
    expect(rankValue(14)).toBe(11);
  });
  it('rankLabel は J/Q/K/A を返す', () => {
    expect([
      rankLabel(10),
      rankLabel(11),
      rankLabel(13),
      rankLabel(14),
    ]).toEqual(['10', 'J', 'K', 'A']);
  });
});

describe('items', () => {
  it('4分類13ランクすべてに品目名があり、空でない', () => {
    for (const s of SUITS)
      for (const r of RANKS) expect(ITEMS[s][r].length).toBeGreaterThan(0);
  });
  it('spec の品目名が入っている（抜き取り）', () => {
    expect(itemNameFor('kenpai', 9)).toBe('コンクリートがれき');
    expect(itemNameFor('odei', 13)).toBe('脱水ケーキ');
    expect(itemNameFor('shigen', 10)).toBe('銅線くず');
    expect(itemNameFor('tokkan', 14)).toBe('PCB廃棄物');
  });
  it('itemName はカードから品目名を引く', () => {
    expect(itemName({ id: 'kenpai-9', suit: 'kenpai', rank: 9 })).toBe(
      'コンクリートがれき',
    );
  });
});
