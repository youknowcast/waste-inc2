import { type BlindDef, blindAt } from '../data/blinds.ts';
import { jokerDef } from '../data/jokers.ts';
import { bossRules } from './blinds.ts';
import { createDeck, shuffleDeck } from './cards.ts';
import {
  DISCARDS_PER_BLIND,
  HAND_SIZE,
  HANDS_PER_BLIND,
  START_MONEY,
} from './constants.ts';
import { evaluateHand, scoringCards } from './hands.ts';
import { jokerHandSizeMod } from './jokers.ts';
import { createRng } from './rng.ts';
import { type BossRules, type ScoreBreakdown, scorePlay } from './score.ts';
import type { Card, JokerInstance, Rng } from './types.ts';

export type RunState = {
  seed: string;
  rng: Rng;
  money: number;
  day: number;
  blindIndex: number;
  jokers: JokerInstance[];
  result: 'playing' | 'won' | 'lost';
  totalRevenue: number;
};

export type BlindState = {
  def: BlindDef;
  boss: BossRules;
  hand: Card[];
  drawPile: Card[];
  discardPile: Card[];
  selected: string[];
  handsLeft: number;
  discardsLeft: number;
  revenue: number;
  lastScore: ScoreBreakdown | null;
  status: 'playing' | 'cleared' | 'failed';
};

export function startRun(seed: string): RunState {
  return {
    seed,
    rng: createRng(seed),
    money: START_MONEY,
    day: 1,
    blindIndex: 0,
    jokers: [],
    result: 'playing',
    totalRevenue: 0,
  };
}

export function handSizeFor(run: RunState, boss: BossRules): number {
  return HAND_SIZE + boss.handSizeMod + jokerHandSizeMod(run);
}

export function startBlind(run: RunState): BlindState {
  const def = blindAt(run.day, run.blindIndex as 0 | 1 | 2);
  const boss = bossRules(def);
  const size = handSizeFor(run, boss);

  const deck = shuffleDeck(createDeck(), run.rng);
  const hand = deck.slice(0, size);
  const drawPile = deck.slice(size);

  return {
    def,
    boss,
    hand,
    drawPile,
    discardPile: [],
    selected: [],
    handsLeft: HANDS_PER_BLIND,
    discardsLeft: DISCARDS_PER_BLIND,
    revenue: 0,
    lastScore: null,
    status: 'playing',
  };
}

export function toggleSelect(blind: BlindState, cardId: string): void {
  if (blind.status !== 'playing') return;

  const index = blind.selected.indexOf(cardId);
  if (index >= 0) {
    blind.selected.splice(index, 1);
  } else if (blind.selected.length < 5) {
    blind.selected.push(cardId);
  }
}

export function drawUpTo(blind: BlindState, size: number, rng: Rng): void {
  while (blind.hand.length < size) {
    if (blind.drawPile.length === 0) {
      if (blind.discardPile.length === 0) break;
      blind.drawPile = shuffleDeck(blind.discardPile, rng);
      blind.discardPile = [];
    }
    const card = blind.drawPile.shift();
    if (card) {
      blind.hand.push(card);
    }
  }
}

export function playHand(
  run: RunState,
  blind: BlindState,
): ScoreBreakdown | null {
  if (blind.status !== 'playing') return null;
  if (blind.selected.length === 0) return null;
  if (blind.handsLeft <= 0) return null;

  const played = blind.hand.filter((c) => blind.selected.includes(c.id));
  const handType = evaluateHand(played);
  const scoring = scoringCards(played, handType);

  const score = scorePlay(
    {
      handType,
      played,
      scoring,
      remainingHands: blind.handsLeft - 1,
      remainingDiscards: blind.discardsLeft,
      boss: blind.boss,
    },
    { jokers: run.jokers },
  );

  blind.discardPile.push(...played);
  blind.hand = blind.hand.filter((c) => !blind.selected.includes(c.id));
  blind.selected = [];
  blind.handsLeft--;
  blind.revenue += score.revenue;
  blind.lastScore = score;

  drawUpTo(blind, handSizeFor(run, blind.boss), run.rng);

  if (blind.revenue >= blind.def.goal) {
    blind.status = 'cleared';
  } else if (blind.handsLeft === 0) {
    blind.status = 'failed';
  }

  return score;
}

export function discardSelected(run: RunState, blind: BlindState): void {
  if (blind.status !== 'playing') return;
  if (blind.selected.length === 0) return;
  if (blind.discardsLeft <= 0) return;

  const discarded = blind.hand.filter((c) => blind.selected.includes(c.id));
  blind.discardPile.push(...discarded);
  blind.hand = blind.hand.filter((c) => !blind.selected.includes(c.id));
  blind.selected = [];
  blind.discardsLeft--;

  for (const j of run.jokers) {
    jokerDef(j.defId).onDiscard?.(run, j);
  }

  drawUpTo(blind, handSizeFor(run, blind.boss), run.rng);
}
