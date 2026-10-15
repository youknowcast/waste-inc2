import { describe, expect, it } from 'vitest';
import { jokerDef } from '../src/data/jokers';
import { createRng } from '../src/game/rng';
import {
  canBuy,
  openShop,
  rerollCost,
  rerollShop,
  sellValue,
} from '../src/game/shop';

describe('openShop', () => {
  it('2枠を出す', () => {
    const shop = openShop(createRng('s'));
    expect(shop.offers).toHaveLength(2);
    expect(shop.rerolls).toBe(0);
  });
  it('同じショップに同じジョーカーは並ばない', () => {
    for (let i = 0; i < 300; i++) {
      const shop = openShop(createRng(`s${i}`));
      expect(new Set(shop.offers.map((o) => o.defId)).size).toBe(
        shop.offers.length,
      );
    }
  });
  it('価格がレア度と一致する（不法投棄の噂は0万円）', () => {
    for (let i = 0; i < 200; i++) {
      for (const o of openShop(createRng(`p${i}`)).offers) {
        const def = jokerDef(o.defId);
        expect(o.price).toBe(def.special ? 0 : def.price);
      }
    }
  });
  it('同じシードなら同じ品揃えになる', () => {
    expect(openShop(createRng('same')).offers).toEqual(
      openShop(createRng('same')).offers,
    );
  });
});

describe('rerollCost / sellValue', () => {
  it('リロールは3万円から1回ごとに+1万円、割引は下限0', () => {
    expect(rerollCost({ offers: [], rerolls: 0 }, 0)).toBe(3);
    expect(rerollCost({ offers: [], rerolls: 2 }, 0)).toBe(5);
    expect(rerollCost({ offers: [], rerolls: 2 }, 1)).toBe(4);
    expect(rerollCost({ offers: [], rerolls: 0 }, 99)).toBe(0);
  });
  it('売却額は購入額の半分 + 売却ボーナス', () => {
    expect(sellValue(jokerDef('truck-2t'), 0)).toBe(2);
    expect(sellValue(jokerDef('truck-2t'), 2)).toBe(4);
  });
});

describe('rerollShop', () => {
  it('リロール回数を増やし、品揃えを引き直す', () => {
    const shop = openShop(createRng('init'));
    rerollShop(createRng('reroll'), shop);
    expect(shop.rerolls).toBe(1);
    expect(shop.offers).toHaveLength(2);
  });
  it('同じシードならopenShopと同じ品揃えになる', () => {
    const shop = openShop(createRng('init'));
    rerollShop(createRng('same'), shop);
    expect(shop.offers).toEqual(openShop(createRng('same')).offers);
  });
});

describe('canBuy', () => {
  it('所持金が価格以上で、ジョーカー枠に空きがあれば購入できる', () => {
    expect(
      canBuy(
        { money: 3, day: 1, blindIndex: 0, jokers: [] },
        { defId: 'truck-2t', price: 3 },
      ),
    ).toBe(true);
  });
  it('所持金が足りなければ購入できない', () => {
    expect(
      canBuy(
        { money: 2, day: 1, blindIndex: 0, jokers: [] },
        { defId: 'truck-2t', price: 3 },
      ),
    ).toBe(false);
  });
  it('ジョーカー枠がいっぱいなら購入できない', () => {
    expect(
      canBuy(
        {
          money: 10,
          day: 1,
          blindIndex: 0,
          jokers: [
            { defId: 'a', counters: {} },
            { defId: 'b', counters: {} },
            { defId: 'c', counters: {} },
            { defId: 'd', counters: {} },
            { defId: 'e', counters: {} },
          ],
        },
        { defId: 'truck-2t', price: 3 },
      ),
    ).toBe(false);
  });
});
