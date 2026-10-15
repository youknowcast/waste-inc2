import { RARITY_PRICE } from '../game/constants.ts';
import type {
  JokerRunView,
  ScoreAcc,
  ScoreContext,
  ScoreEnv,
  ScoreLine,
} from '../game/score.ts';
import type { JokerInstance, Rarity } from '../game/types.ts';

export type JokerDef = {
  id: string;
  name: string;
  rarity: Rarity;
  text: string;
  price: number;
  special?: boolean;
  onScore?: (
    ctx: ScoreContext,
    acc: ScoreAcc,
    self: JokerInstance,
    env: ScoreEnv,
  ) => void;
  onDiscard?: (run: JokerRunView, self: JokerInstance) => void;
  onBlindCleared?: (run: JokerRunView, self: JokerInstance) => void;
  onAcquire?: (run: JokerRunView) => void;
  handSizeMod?: number;
  interestRate?: number;
  interestCap?: number;
  sellBonus?: number;
  rerollDiscount?: number;
};

function weightLine(label: string, value: number): ScoreLine {
  return { label, kind: 'weight', value };
}

function multLine(label: string, value: number): ScoreLine {
  return { label, kind: 'mult', value };
}

function countSuit(ctx: ScoreContext, suit: string): number {
  return ctx.played.filter((c) => c.suit === suit).length;
}

export const JOKERS: readonly JokerDef[] = [
  // 🚚 積載（重さを盛る）
  {
    id: 'truck-2t',
    name: '2t 軽トラ',
    rarity: 'COMMON',
    text: '重さ +30',
    price: RARITY_PRICE.COMMON,
    onScore(_ctx, acc) {
      acc.weightAdd += 30;
      acc.lines.push(weightLine('2t 軽トラ', 30));
    },
  },
  {
    id: 'truck-4t',
    name: '4t 平ボディ',
    rarity: 'COMMON',
    text: '重さ +70',
    price: RARITY_PRICE.COMMON,
    onScore(_ctx, acc) {
      acc.weightAdd += 70;
      acc.lines.push(weightLine('4t 平ボディ', 70));
    },
  },
  {
    id: 'truck-8t',
    name: '8t 深ダンプ',
    rarity: 'UNCOMMON',
    text: '重さ +120',
    price: RARITY_PRICE.UNCOMMON,
    onScore(_ctx, acc) {
      acc.weightAdd += 120;
      acc.lines.push(weightLine('8t 深ダンプ', 120));
    },
  },
  {
    id: 'unic',
    name: 'ユニック車',
    rarity: 'UNCOMMON',
    text: '3枚以上出したら 重さ ×1.25',
    price: RARITY_PRICE.UNCOMMON,
    onScore(ctx, acc) {
      if (ctx.played.length >= 3) {
        acc.xWeight *= 1.25;
        acc.lines.push(weightLine('ユニック車', 1.25));
      }
    },
  },
  {
    id: 'armroll',
    name: 'アームロール車',
    rarity: 'UNCOMMON',
    text: '捨て札1回ごとに 重さ +10（累積）',
    price: RARITY_PRICE.UNCOMMON,
    onScore(_ctx, acc, self) {
      const w = self.counters.weight ?? 0;
      if (w !== 0) {
        acc.weightAdd += w;
        acc.lines.push(weightLine('アームロール車', w));
      }
    },
  },
  {
    id: 'trailer',
    name: 'トレーラー',
    rarity: 'RARE',
    text: '5枚出したら 重さ +150',
    price: RARITY_PRICE.RARE,
    onScore(ctx, acc) {
      if (ctx.played.length === 5) {
        acc.weightAdd += 150;
        acc.lines.push(weightLine('トレーラー', 150));
      }
    },
  },

  // 📋 交渉・許可（単価を盛る）
  {
    id: 'pipe',
    name: '元請とのパイプ',
    rarity: 'COMMON',
    text: '残り手札1枚につき 単価 +0.3',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      const add = 0.3 * ctx.remainingHands;
      acc.multAdd += add;
      acc.lines.push(multLine('元請とのパイプ', add));
    },
  },
  {
    id: 'transship',
    name: '積替保管施設',
    rarity: 'COMMON',
    text: '5枚出した役は 単価 +4',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      if (ctx.played.length === 5) {
        acc.multAdd += 4;
        acc.lines.push(multLine('積替保管施設', 4));
      }
    },
  },
  {
    id: 'bulk-sub',
    name: '一括下請け契約',
    rarity: 'COMMON',
    text: '出した枚数 ×0.5 を単価に加算',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      const add = 0.5 * ctx.played.length;
      acc.multAdd += add;
      acc.lines.push(multLine('一括下請け契約', add));
    },
  },
  {
    id: 'manifest',
    name: 'マニフェスト管理',
    rarity: 'UNCOMMON',
    text: '採点するたび 単価 +0.2（累積）',
    price: RARITY_PRICE.UNCOMMON,
    onScore(_ctx, acc, self) {
      const m = self.counters.mult ?? 0;
      if (m !== 0) {
        acc.multAdd += m;
        acc.lines.push(multLine('マニフェスト管理', m));
      }
    },
  },
  {
    id: 'sorting-master',
    name: '分別の達人',
    rarity: 'RARE',
    text: '同一分類5枚（分別搬入）で 単価 ×1.5',
    price: RARITY_PRICE.RARE,
    onScore(ctx, acc) {
      if (ctx.handType === 'flush') {
        acc.xMult *= 1.5;
        acc.lines.push(multLine('分別の達人', 1.5));
      }
    },
  },

  // 🧱💧♻️☣️ 分類シナジー
  {
    id: 'demolition',
    name: '解体現場の常連',
    rarity: 'COMMON',
    text: '建廃3枚以上で 重さ +80',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      if (countSuit(ctx, 'kenpai') >= 3) {
        acc.weightAdd += 80;
        acc.lines.push(weightLine('解体現場の常連', 80));
      }
    },
  },
  {
    id: 'dehydrator',
    name: '脱水機',
    rarity: 'COMMON',
    text: '汚泥3枚以上で 重さ +60 と 単価 +2',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      if (countSuit(ctx, 'odei') >= 3) {
        acc.weightAdd += 60;
        acc.multAdd += 2;
        acc.lines.push(weightLine('脱水機', 60));
        acc.lines.push(multLine('脱水機', 2));
      }
    },
  },
  {
    id: 'sorting-line',
    name: '選別ライン',
    rarity: 'COMMON',
    text: '資源3枚以上で 単価 +3',
    price: RARITY_PRICE.COMMON,
    onScore(ctx, acc) {
      if (countSuit(ctx, 'shigen') >= 3) {
        acc.multAdd += 3;
        acc.lines.push(multLine('選別ライン', 3));
      }
    },
  },
  {
    id: 'tokkan-truck',
    name: '特管の専用車両',
    rarity: 'RARE',
    text: '特管を含む役は 重さ +40 と 単価 +2',
    price: RARITY_PRICE.RARE,
    onScore(ctx, acc) {
      if (ctx.played.some((c) => c.suit === 'tokkan')) {
        acc.weightAdd += 40;
        acc.multAdd += 2;
        acc.lines.push(weightLine('特管の専用車両', 40));
        acc.lines.push(multLine('特管の専用車両', 2));
      }
    },
  },
  {
    id: 'asbestos',
    name: 'アスベスト除去作業員',
    rarity: 'RARE',
    text: '特管3枚以上で 単価 ×2／手札 -1',
    price: RARITY_PRICE.RARE,
    handSizeMod: -1,
    onScore(ctx, acc) {
      if (countSuit(ctx, 'tokkan') >= 3) {
        acc.xMult *= 2;
        acc.lines.push(multLine('アスベスト除去作業員', 2));
      }
    },
  },

  // 💰 経済・一発系
  {
    id: 'shareholder',
    name: '中間処理場の株主',
    rarity: 'COMMON',
    text: '利息が 所持金5万円ごとに +2万円（上限 +10万円）',
    price: RARITY_PRICE.COMMON,
    interestRate: 2,
    interestCap: 10,
  },
  {
    id: 'recycle-shop',
    name: 'リサイクルショップ',
    rarity: 'COMMON',
    text: 'ジョーカー売却額 +2万円／リロール -1万円',
    price: RARITY_PRICE.COMMON,
    sellBonus: 2,
    rerollDiscount: 1,
  },
  {
    id: 'big-client',
    name: '大型案件の常連',
    rarity: 'COMMON',
    text: '締切の元請を突破するごとに +20万円',
    price: RARITY_PRICE.COMMON,
    onBlindCleared(run, _self) {
      if (run.blindIndex === 2) {
        run.money += 20;
      }
    },
  },
  {
    id: 'fuhou-touki',
    name: '不法投棄の噂',
    rarity: 'COMMON',
    text: 'ショップに稀に出る。価格 0万円だが、購入時に所持金を全額失う。以後ずっと 単価 ×3',
    price: 0,
    special: true,
    onAcquire(run) {
      run.money = 0;
    },
    onScore(_ctx, acc) {
      acc.xMult *= 3;
      acc.lines.push(multLine('不法投棄の噂', 3));
    },
  },
];

export function jokerDef(id: string): JokerDef {
  const def = JOKERS.find((j) => j.id === id);
  if (!def) {
    throw new Error(`Unknown joker: ${id}`);
  }
  return def;
}

export const SPECIAL_JOKER_ID = 'fuhou-touki';
