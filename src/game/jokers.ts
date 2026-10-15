import { jokerDef } from '../data/jokers.ts';
import type {
  JokerRunView,
  ScoreAcc,
  ScoreContext,
  ScoreEnv,
} from './score.ts';

export function applyScoreJokers(
  ctx: ScoreContext,
  env: ScoreEnv,
  acc: ScoreAcc,
): void {
  for (const joker of env.jokers) {
    jokerDef(joker.defId).onScore?.(ctx, acc, joker, env);
  }
}

function sumField(
  run: JokerRunView,
  field:
    | 'handSizeMod'
    | 'interestRate'
    | 'interestCap'
    | 'sellBonus'
    | 'rerollDiscount',
): number {
  return run.jokers.reduce(
    (sum, j) => sum + (jokerDef(j.defId)[field] ?? 0),
    0,
  );
}

export function jokerHandSizeMod(run: JokerRunView): number {
  return sumField(run, 'handSizeMod');
}

export function jokerInterestRate(run: JokerRunView): number {
  return sumField(run, 'interestRate');
}

export function jokerInterestCap(run: JokerRunView): number {
  return sumField(run, 'interestCap');
}

export function jokerSellBonus(run: JokerRunView): number {
  return sumField(run, 'sellBonus');
}

export function jokerRerollDiscount(run: JokerRunView): number {
  return sumField(run, 'rerollDiscount');
}
