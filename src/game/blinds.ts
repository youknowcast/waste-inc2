import type { BlindDef } from '../data/blinds.ts';
import { type BossRules, NO_BOSS } from './score.ts';

export function bossRules(def: BlindDef): BossRules {
  switch (def.bossId) {
    case 'inspection':
      return {
        debuffedSuits: ['tokkan'],
        baseMultMultiplier: 1,
        handSizeMod: 0,
      };
    case 'haggling':
      return { debuffedSuits: [], baseMultMultiplier: 0.5, handSizeMod: 0 };
    case 'storm':
      return { debuffedSuits: [], baseMultMultiplier: 1, handSizeMod: -1 };
    default:
      return { ...NO_BOSS, debuffedSuits: [] };
  }
}
