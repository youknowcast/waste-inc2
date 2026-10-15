import type { JokerDef } from '../data/jokers.ts';
import { JOKERS, jokerDef, SPECIAL_JOKER_ID } from '../data/jokers.ts';
import {
  MAX_JOKERS,
  RARITY_WEIGHT,
  REROLL_BASE,
  REROLL_STEP,
  SHOP_SLOTS,
  SPECIAL_CHANCE,
} from './constants.ts';
import type { JokerRunView } from './score.ts';
import type { Rarity, Rng } from './types.ts';

export type ShopOffer = {
  defId: string;
  price: number;
};

export type ShopState = {
  offers: ShopOffer[];
  rerolls: number;
};

const RARITY_ORDER: Rarity[] = ['COMMON', 'UNCOMMON', 'RARE'];

function drawRarity(rng: Rng): Rarity {
  const roll = rng.int(100);
  let cumulative = 0;
  for (const rarity of RARITY_ORDER) {
    cumulative += RARITY_WEIGHT[rarity];
    if (roll < cumulative) {
      return rarity;
    }
  }
  return RARITY_ORDER[RARITY_ORDER.length - 1];
}

function buildOffer(def: JokerDef): ShopOffer {
  return {
    defId: def.id,
    price: def.special ? 0 : def.price,
  };
}

function generateOffers(rng: Rng): ShopOffer[] {
  const chosen = new Set<string>();
  const offers: ShopOffer[] = [];

  for (let i = 0; i < SHOP_SLOTS; i++) {
    const rarity = drawRarity(rng);
    let pool = JOKERS.filter(
      (j) => j.rarity === rarity && !j.special && !chosen.has(j.id),
    );
    if (pool.length === 0) {
      pool = JOKERS.filter((j) => !j.special && !chosen.has(j.id));
    }
    if (pool.length === 0) {
      break;
    }
    const def = pool[rng.int(pool.length)];
    chosen.add(def.id);
    offers.push(buildOffer(def));
  }

  if (offers.length > 0 && rng.next() < SPECIAL_CHANCE) {
    const slot = rng.int(offers.length);
    offers[slot] = buildOffer(jokerDef(SPECIAL_JOKER_ID));
  }

  return offers;
}

export function openShop(rng: Rng): ShopState {
  return {
    offers: generateOffers(rng),
    rerolls: 0,
  };
}

export function rerollCost(shop: ShopState, discount: number): number {
  return Math.max(0, REROLL_BASE + REROLL_STEP * shop.rerolls - discount);
}

export function rerollShop(rng: Rng, shop: ShopState, _discount: number): void {
  shop.rerolls += 1;
  shop.offers = generateOffers(rng);
}

export function sellValue(def: JokerDef, sellBonus: number): number {
  return Math.floor(def.price / 2) + sellBonus;
}

export function canBuy(view: JokerRunView, offer: ShopOffer): boolean {
  return view.money >= offer.price && view.jokers.length < MAX_JOKERS;
}
