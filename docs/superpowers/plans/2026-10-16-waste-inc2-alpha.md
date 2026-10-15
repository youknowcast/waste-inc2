# waste-inc2 アルファ版 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 産廃の世界観で Balatro の骨格を遊ぶブラウザゲーム（3営業日・1プレイ10〜15分）を、ブラウザで通しで遊べる状態まで作る。

**Architecture:** ゲームロジックは `src/game/` の DOM 非依存モジュールに閉じる。`RunState` / `BlindState` という1つの状態オブジェクトを関数が書き換え、UI は毎回それを HTML 文字列に描き直す（差分更新はしない）。乱数は状態が持つシード可能 PRNG から引くので、同じシードなら同じランが再現する。バランスの数値は `src/game/constants.ts` に集約する。

**Tech Stack:** TypeScript (strict) / Vite / Vitest / Biome。Node 20 以上（確認済み: v25.2.1）。外部依存はこれだけ。効果音は WebAudio で合成し、音源ファイルを持たない。

**Spec:** `docs/superpowers/specs/2026-10-16-waste-inc2-design.md`

## Global Constraints

- `src/game/` と `src/data/` は **DOM API を一切参照しない**（`document` / `window` / `localStorage` / `AudioContext` 禁止）。UI でのみ使う
- 金額の単位はすべて **万円**。重さは **t**、単価は **万円/t**、売上は **万円**
- **丸め**: 重さは `Math.floor`、単価は小数第2位に丸め（`Math.round(x * 100) / 100`）、売上は `Math.floor(重さ * 単価)`。ブラインドの達成判定に使うのは、搬入ごとに floor した売上の合計
- **乗算補正は最後にまとめて掛け算で合成する**（×1.25 と ×1.5 が効いていれば ×1.875）
- 重さに乗るのは **役を構成したカードだけ**。ただしジョーカーの「3枚以上出したら」「5枚出したら」は **出した枚数（1〜5）** で数える
- 「累積」と書かれたジョーカーは、**ランの間ずっと積み上がる**（便をまたいで保持する）
- 同じジョーカーを **複数所持できる**（プールは減らない）。同一ショップ内での重複だけ防ぐ
- 画面に出す文言はすべて日本語。品目名・ジョーカー名・役の呼称は spec の表のとおりに書く
- 画像アセットを追加しない（絵文字と CSS のみ）。音源ファイルを追加しない
- コミットは Conventional Commits（`feat:` / `test:` / `chore:` / `docs:`）

## Review Focus

spec が想定していて、どのタスクのテストも素通りしやすい5点。それぞれ担当タスクにテストを置く。

1. **役に使われないカードは重さを持たない**（5枚出してペアなら、重さはペアの2枚分だけ）— Task 3
2. **乗算補正の合成と丸め**（×1.25 と ×1.5 で ×1.875。売上は搬入ごとに floor）— Task 4
3. **元請の縛り**（抜き打ち検査は特管を「役には数えるが重さ0」、値切りは基礎単価を `Math.ceil` で半減）— Task 5
4. **デッキが尽きたら捨て山を再シャッフルして引き続ける**（8枚を保てず落ちない）— Task 7
5. **累積カウンタが便をまたいで残る**（アームロール車が9便ぶん積み上がる）— Task 8

---

### Task 1: ツールチェーンとカードの土台

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `biome.json`, `index.html`, `src/main.ts`, `src/ui/style.css`
- Create: `src/game/types.ts`, `src/game/constants.ts`, `src/game/rng.ts`, `src/game/cards.ts`, `src/data/items.ts`
- Test: `tests/rng.test.ts`, `tests/cards.test.ts`

**Interfaces:**
- Consumes: なし
- Produces:
  - `types.ts`: `type Suit = 'kenpai'|'odei'|'shigen'|'tokkan'` / `type Rank = 2|3|4|5|6|7|8|9|10|11|12|13|14` / `type Card = { id: string; suit: Suit; rank: Rank }` / `type HandType = 'high'|'pair'|'twoPair'|'three'|'straight'|'flush'|'fullHouse'|'four'|'straightFlush'|'royalFlush'` / `type Rarity = 'COMMON'|'UNCOMMON'|'RARE'` / `type JokerInstance = { defId: string; counters: Record<string, number> }` / `type Rng = { next(): number; int(maxExclusive: number): number; shuffle<T>(xs: T[]): T[] }`
  - `constants.ts`: `START_MONEY = 4` / `HAND_SIZE = 8` / `HANDS_PER_BLIND = 4` / `DISCARDS_PER_BLIND = 3` / `MAX_JOKERS = 5` / `HAND_BONUS_PER_HAND = 1` / `INTEREST_UNIT = 5` / `INTEREST_RATE = 1` / `INTEREST_CAP = 5` / `REROLL_BASE = 3` / `REROLL_STEP = 1` / `SHOP_SLOTS = 2` / `SPECIAL_CHANCE = 0.1` / `RARITY_PRICE: Record<Rarity, number>` = `{ COMMON: 4, UNCOMMON: 6, RARE: 8 }` / `RARITY_WEIGHT: Record<Rarity, number>` = `{ COMMON: 60, UNCOMMON: 30, RARE: 10 }`
  - `rng.ts`: `createRng(seed: string): Rng`
  - `cards.ts`: `SUITS: readonly Suit[]` / `RANKS: readonly Rank[]` / `SUIT_LABEL: Record<Suit,string>`（建廃/汚泥/資源/特管）/ `SUIT_MARK`（🧱/💧/♻️/☣️）/ `SUIT_COLOR`（`#b5502a`/`#6b7a3a`/`#2f7fa8`/`#7a3fa0`）/ `rankValue(rank: Rank): number` / `rankLabel(rank: Rank): string` / `itemNameFor(suit: Suit, rank: Rank): string` / `itemName(card: Card): string` / `createDeck(): Card[]` / `shuffleDeck(deck: Card[], rng: Rng): Card[]`
  - `data/items.ts`: `ITEMS: Record<Suit, Record<Rank, string>>`（52品目。spec の表をそのまま）

- [ ] **Step 1: ツールチェーンを入れる**

`npm init -y` のあと `npm i -D vite typescript vitest @biomejs/biome`。`package.json` に scripts を置く:
`dev` = `vite`／`build` = `tsc --noEmit && vite build`／`test` = `vitest run`／`lint` = `biome check .`／`typecheck` = `tsc --noEmit`。
`vite.config.ts` は `base: './'` と `test: { environment: 'node' }`（UI のテストは Task 9 で jsdom を足す）。
`index.html` は `<div id="app"></div>` と `<script type="module" src="/src/main.ts"></script>` だけ。
`src/main.ts` は `app.textContent = 'waste-inc2'` の仮実装。`tsconfig.json` は `strict: true`。

- [ ] **Step 2: rng のテストを書く**

```ts
// tests/rng.test.ts
import { describe, expect, it } from 'vitest'
import { createRng } from '../src/game/rng'

describe('createRng', () => {
  it('同じシードなら同じ数列を返す', () => {
    const a = createRng('s1'); const b = createRng('s1')
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()])
  })
  it('違うシードなら違う数列を返す', () => {
    expect(createRng('s1').next()).not.toBe(createRng('s2').next())
  })
  it('int(n) は 0 以上 n 未満の整数を返す', () => {
    const r = createRng('s')
    for (let i = 0; i < 200; i++) { const v = r.int(5); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(5); expect(Number.isInteger(v)).toBe(true) }
  })
  it('shuffle は元の配列を壊さず、要素を落とさない', () => {
    const src = [1,2,3,4,5]; const out = createRng('s').shuffle(src)
    expect(src).toEqual([1,2,3,4,5]); expect([...out].sort()).toEqual([1,2,3,4,5])
  })
})
```

- [ ] **Step 3: テストが落ちることを確認する**

Run: `npm test`
Expected: FAIL（`src/game/rng.ts` が無い）

- [ ] **Step 4: `src/game/rng.ts` と `src/game/types.ts` と `src/game/constants.ts` を書く**

`rng.ts` は文字列シードを xmur3 で 32bit に潰し、mulberry32 で `next()` を作る（他ファイルに依存しない自己完結な実装）。

- [ ] **Step 5: rng のテストを通す**

Run: `npm test -- tests/rng.test.ts`
Expected: PASS

- [ ] **Step 6: cards と items のテストを書く**

```ts
// tests/cards.test.ts
import { describe, expect, it } from 'vitest'
import { ITEMS } from '../src/data/items'
import { RANKS, SUITS, createDeck, itemName, itemNameFor, rankLabel, rankValue, shuffleDeck } from '../src/game/cards'
import { createRng } from '../src/game/rng'

describe('deck', () => {
  it('52枚で、id が重複しない', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    expect(new Set(deck.map(c => c.id)).size).toBe(52)
  })
  it('分類ごとに13枚ずつある', () => {
    const deck = createDeck()
    for (const s of SUITS) expect(deck.filter(c => c.suit === s)).toHaveLength(13)
  })
  it('シャッフルしても52枚のまま', () => {
    expect(shuffleDeck(createDeck(), createRng('x'))).toHaveLength(52)
  })
})

describe('rankValue', () => {
  it('2〜10 はそのまま、J/Q/K は 10、A は 11', () => {
    expect(rankValue(2)).toBe(2); expect(rankValue(10)).toBe(10)
    expect(rankValue(11)).toBe(10); expect(rankValue(13)).toBe(10); expect(rankValue(14)).toBe(11)
  })
  it('rankLabel は J/Q/K/A を返す', () => {
    expect([rankLabel(10), rankLabel(11), rankLabel(13), rankLabel(14)]).toEqual(['10','J','K','A'])
  })
})

describe('items', () => {
  it('4分類13ランクすべてに品目名があり、空でない', () => {
    for (const s of SUITS) for (const r of RANKS) expect(ITEMS[s][r].length).toBeGreaterThan(0)
  })
  it('spec の品目名が入っている（抜き取り）', () => {
    expect(itemNameFor('kenpai', 9)).toBe('コンクリートがれき')
    expect(itemNameFor('odei', 13)).toBe('脱水ケーキ')
    expect(itemNameFor('shigen', 10)).toBe('銅線くず')
    expect(itemNameFor('tokkan', 14)).toBe('PCB廃棄物')
  })
  it('itemName はカードから品目名を引く', () => {
    expect(itemName({ id: 'kenpai-9', suit: 'kenpai', rank: 9 })).toBe('コンクリートがれき')
  })
})
```

- [ ] **Step 7: テストが落ちることを確認してから実装する**

Run: `npm test -- tests/cards.test.ts` → FAIL を確認。
`src/data/items.ts` に spec の52品目をそのまま書き、`src/game/cards.ts` を実装する。`itemNameFor(suit, rank)` は `ITEMS[suit][rank]` を返すだけ。

- [ ] **Step 8: 全体を通す**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: すべて成功

- [ ] **Step 9: コミット**

```bash
git add -A
git commit -m "feat: add toolchain, seeded rng, and the 52-item deck"
```

---

### Task 2: 役の判定

**Files:**
- Create: `src/game/hands.ts`
- Test: `tests/hands.test.ts`

**Interfaces:**
- Consumes: `types.ts` の `Card` / `HandType`
- Produces:
  - `HAND_TYPES: readonly HandType[]`（弱い順: high → ... → royalFlush）
  - `HAND_TABLE: Record<HandType, { baseWeight: number; baseMult: number }>` = spec の役テーブルそのまま（high 5/1, pair 10/2, twoPair 20/2, three 30/3, straight 30/4, flush 35/4, fullHouse 40/4, four 60/7, straightFlush 100/8, royalFlush 100/8）
  - `HAND_LABEL: Record<HandType, string>`（単発搬入/同品目ペア/品目ペア2組/三点積み/段積み/分別搬入/三点＋二点/四点積み/分別段積み/特級一括搬入）
  - `handRank(type: HandType): number`（`HAND_TYPES.indexOf`）
  - `evaluateHand(cards: Card[]): HandType` — 1〜5枚。空配列は throw
  - `scoringCards(cards: Card[], type: HandType): Card[]` — 重さに寄与するカードだけを返す

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/hands.test.ts
import { describe, expect, it } from 'vitest'
import type { Card, Rank, Suit } from '../src/game/types'
import { evaluateHand, scoringCards } from '../src/game/hands'

const c = (suit: Suit, ...ranks: Rank[]): Card[] =>
  ranks.map(r => ({ id: `${suit}-${r}`, suit, rank: r }))

describe('evaluateHand', () => {
  it('1枚は単発搬入', () => expect(evaluateHand(c('kenpai', 2))).toBe('high'))
  it('同品目ペア', () => expect(evaluateHand(c('kenpai', 9, 9))).toBe('pair'))
  it('品目ペア2組', () => expect(evaluateHand(c('kenpai', 9, 9, 3, 3))).toBe('twoPair'))
  it('三点積み', () => expect(evaluateHand(c('kenpai', 9, 9, 9))).toBe('three'))
  it('段積みは5枚', () => expect(evaluateHand(c('kenpai', 5, 6, 7, 8, 9))).toBe('straight'))
  it('A は 1 としても使える（A2345）', () => expect(evaluateHand([
    ...c('kenpai', 14), ...c('odei', 2), ...c('shigen', 3), ...c('tokkan', 4), ...c('kenpai', 5),
  ])).toBe('straight'))
  it('10JQKA は特級一括搬入', () => expect(evaluateHand([
    ...c('kenpai', 10), ...c('odei', 11), ...c('shigen', 12), ...c('tokkan', 13), ...c('kenpai', 14),
  ])).toBe('royalFlush'))
  it('分別搬入（同一分類5枚）', () => expect(evaluateHand(c('odei', 2, 5, 9, 11, 13))).toBe('flush'))
  it('三点＋二点', () => expect(evaluateHand(c('kenpai', 7, 7, 7, 2, 2))).toBe('fullHouse'))
  it('四点積み', () => expect(evaluateHand(c('kenpai', 7, 7, 7, 7))).toBe('four'))
  it('分別段積み', () => expect(evaluateHand(c('shigen', 5, 6, 7, 8, 9))).toBe('straightFlush'))
  it('空配列は throw する', () => expect(() => evaluateHand([])).toThrow())
})

describe('scoringCards', () => {
  it('ペアなら2枚だけを返す（残り3枚は重さを持たない）', () => {
    const cards = c('kenpai', 9, 9, 4, 5, 6)
    const sc = scoringCards(cards, 'pair')
    expect(sc).toHaveLength(2)
    expect(sc.every(x => x.rank === 9)).toBe(true)
  })
  it('単発搬入なら一番強い1枚', () => {
    expect(scoringCards(c('kenpai', 3, 4, 11), 'high').map(x => x.rank)).toEqual([11])
  })
  it('分別搬入なら5枚すべて', () => {
    expect(scoringCards(c('odei', 2, 5, 9, 11, 13), 'flush')).toHaveLength(5)
  })
})
```

- [ ] **Step 2: 落ちることを確認する**

Run: `npm test -- tests/hands.test.ts`
Expected: FAIL（`src/game/hands.ts` が無い）

- [ ] **Step 3: `src/game/hands.ts` を実装する**

`evaluateHand` は rank のカウントと同分類判定とストレート判定をし、当てはまる中で一番強い役を返す。ストレートは「5枚が連続（重複なし）」または「14,2,3,4,5」。`straightFlush` は同分類かつストレート、そのうち最強が 14 なら `royalFlush`。

- [ ] **Step 4: テストを通す**

Run: `npm test -- tests/hands.test.ts`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add hand evaluation for the ten 積載パターン"
```

---

### Task 3: 採点（ジョーカー抜き）

**Files:**
- Create: `src/game/score.ts`
- Test: `tests/score.test.ts`

**Interfaces:**
- Consumes: `HAND_TABLE` / `scoringCards`（Task 2）、`rankValue`（Task 1）
- Produces:
  - `type BossRules = { debuffedSuits: Suit[]; baseMultMultiplier: number; handSizeMod: number }`
  - `const NO_BOSS: BossRules = { debuffedSuits: [], baseMultMultiplier: 1, handSizeMod: 0 }`
  - `type ScoreEnv = { jokers: JokerInstance[] }`
  - `type ScoreContext = { handType: HandType; played: Card[]; scoring: Card[]; remainingHands: number; remainingDiscards: number; boss: BossRules }`
  - `type ScoreLine = { label: string; kind: 'weight' | 'mult'; value: number }`
  - `type ScoreAcc = { weightAdd: number; xWeight: number; multAdd: number; xMult: number; lines: ScoreLine[] }`
  - `type ScoreBreakdown = { baseWeight: number; cardWeight: number; weightAdd: number; xWeight: number; weight: number; baseMult: number; multAdd: number; xMult: number; mult: number; revenue: number; lines: ScoreLine[] }`
  - `scorePlay(ctx: ScoreContext, env: ScoreEnv): ScoreBreakdown`（Task 3 では `env.jokers` を無視してよい。ループの差し込みは Task 4 で行う）

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/score.test.ts
import { describe, expect, it } from 'vitest'
import { NO_BOSS, scorePlay } from '../src/game/score'
import { evaluateHand, scoringCards } from '../src/game/hands'
import type { Card, Rank, Suit } from '../src/game/types'

const c = (suit: Suit, ...ranks: Rank[]): Card[] => ranks.map(r => ({ id: `${suit}-${r}`, suit, rank: r }))
const env = { jokers: [] }
const play = (cards: Card[], boss = NO_BOSS) => {
  const handType = evaluateHand(cards)
  return scorePlay({ handType, played: cards, scoring: scoringCards(cards, handType), remainingHands: 3, remainingDiscards: 3, boss }, env)
}

describe('scorePlay', () => {
  it('単発搬入: (基礎5 + 重さ2) × 単価1 = 7万円', () => {
    const s = play(c('kenpai', 2))
    expect(s.baseWeight).toBe(5); expect(s.cardWeight).toBe(2); expect(s.weight).toBe(7)
    expect(s.baseMult).toBe(1); expect(s.revenue).toBe(7)
  })
  it('役に使われないカードは重さを持たない（5枚出してペアなら2枚分だけ）', () => {
    const s = play(c('kenpai', 9, 9, 4, 5, 6))
    expect(s.cardWeight).toBe(18)
    expect(s.weight).toBe(28)
    expect(s.revenue).toBe(56)
  })
  it('J/Q/K は 10、A は 11 として重さに乗る', () => {
    expect(play(c('kenpai', 11, 11)).cardWeight).toBe(20)
    expect(play(c('kenpai', 14, 14)).cardWeight).toBe(22)
  })
  it('抜き打ち検査: 特管は役に数えるが重さに乗らない', () => {
    const boss = { debuffedSuits: ['tokkan'] as Suit[], baseMultMultiplier: 1, handSizeMod: 0 }
    const s = play([...c('tokkan', 7), ...c('tokkan', 7)], boss)
    expect(s.baseWeight).toBe(10)          // ペアは成立している
    expect(s.cardWeight).toBe(0)           // でも重さは0
    expect(s.weight).toBe(10)
  })
  it('値切り: 基礎単価が半減（端数は切り上げ）', () => {
    const boss = { debuffedSuits: [] as Suit[], baseMultMultiplier: 0.5, handSizeMod: 0 }
    expect(play(c('kenpai', 7, 7, 7, 7), boss).baseMult).toBe(4)  // 7 → 3.5 → 4
  })
  it('基礎単価に小数の補正がかかっても ceil で整数になる', () => {
    const s = play(c('kenpai', 3, 3), { debuffedSuits: [], baseMultMultiplier: 1.1, handSizeMod: 0 })
    expect(s.baseMult).toBe(3)   // ceil(2 × 1.1) = ceil(2.2)
  })
})
```

- [ ] **Step 2: 落ちることを確認する**

Run: `npm test -- tests/score.test.ts` → FAIL

- [ ] **Step 3: `src/game/score.ts` を実装する**

順序を守る: `cardWeight` は `scoring` のうち `boss.debuffedSuits` に含まれない分類の `rankValue` の合計。`baseMult = Math.ceil(HAND_TABLE[handType].baseMult * boss.baseMultMultiplier)`。`weight = Math.floor((baseWeight + cardWeight + weightAdd) * xWeight)`。`mult = Math.round((baseMult + multAdd) * xMult * 100) / 100`。`revenue = Math.floor(weight * mult)`。`lines` には「分別段積み」などの基本行と、加算・乗算の内訳を push する。

- [ ] **Step 4: テストを通す**

Run: `npm test -- tests/score.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add scoring (重さ × 単価 = 売上) without jokers"
```

---

### Task 4: ジョーカー20枚と採点フック

**Files:**
- Create: `src/data/jokers.ts`, `src/game/jokers.ts`
- Modify: `src/game/score.ts`（採点ループにジョーカーを差し込む）
- Test: `tests/jokers.test.ts`

**Interfaces:**
- Consumes: `ScoreContext` / `ScoreAcc` / `ScoreEnv` / `ScoreLine`（Task 3）、`RunState`（Task 7 で定義。それまでは `src/game/run.ts` の型が無くてもコンパイルできるよう、フックの引数は `import type` で受ける）
- Produces:
  - `data/jokers.ts`: `type JokerDef = { id: string; name: string; rarity: Rarity; text: string; price: number; special?: boolean; onScore?: (ctx: ScoreContext, acc: ScoreAcc, self: JokerInstance, env: ScoreEnv) => void; onDiscard?: (run: RunState, self: JokerInstance) => void; onBlindCleared?: (run: RunState, self: JokerInstance) => void; onAcquire?: (run: RunState) => void; handSizeMod?: number; interestRate?: number; interestCap?: number; sellBonus?: number; rerollDiscount?: number }` / `JOKERS: readonly JokerDef[]`（20枚）/ `jokerDef(id: string): JokerDef` / `SPECIAL_JOKER_ID = 'fuhou-touki'`
  - `jokers.ts`: `applyScoreJokers(ctx: ScoreContext, env: ScoreEnv, acc: ScoreAcc): void` / `jokerHandSizeMod(run: RunState): number` / `jokerInterestRate(run: RunState): number` / `jokerInterestCap(run: RunState): number` / `jokerSellBonus(run: RunState): number` / `jokerRerollDiscount(run: RunState): number`
  - 広告: ジョーカーID は `truck-2t` / `truck-4t` / `truck-8t` / `unic` / `armroll` / `trailer` / `pipe` / `transship` / `bulk-sub` / `manifest` / `sorting-master` / `demolition` / `dehydrator` / `sorting-line` / `tokkan-truck` / `asbestos` / `shareholder` / `recycle-shop` / `big-client` / `fuhou-touki`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/jokers.test.ts
import { describe, expect, it } from 'vitest'
import { JOKERS, jokerDef } from '../src/data/jokers'
import { NO_BOSS, scorePlay } from '../src/game/score'
import { evaluateHand, scoringCards } from '../src/game/hands'
import type { Card, JokerInstance, Rank, Suit } from '../src/game/types'

const c = (suit: Suit, ...ranks: Rank[]): Card[] => ranks.map(r => ({ id: `${suit}-${r}-${Math.random()}`, suit, rank: r }))
const jk = (...ids: string[]): JokerInstance[] => ids.map(defId => ({ defId, counters: {} }))
const play = (cards: Card[], jokers: JokerInstance[] = [], boss = NO_BOSS) => {
  const handType = evaluateHand(cards)
  return scorePlay({ handType, played: cards, scoring: scoringCards(cards, handType), remainingHands: 3, remainingDiscards: 3, boss },
    { jokers })
}

describe('ジョーカーの一覧', () => {
  it('20枚あり、id が重複しない', () => {
    expect(JOKERS).toHaveLength(20)
    expect(new Set(JOKERS.map(j => j.id)).size).toBe(20)
  })
  it('spec の名前が入っている', () => {
    expect(jokerDef('truck-8t').name).toBe('8t 深ダンプ')
    expect(jokerDef('asbestos').name).toBe('アスベスト除去作業員')
    expect(jokerDef('fuhou-touki').name).toBe('不法投棄の噂')
  })
})

describe('採点に効くジョーカー', () => {
  it('8t 深ダンプは重さ +120', () => {
    const a = play(c('kenpai', 2))
    const b = play(c('kenpai', 2), jk('truck-8t'))
    expect(b.weight - a.weight).toBe(120)
  })
  it('ユニック車は3枚以上で 重さ ×1.25', () => {
    const s = play(c('kenpai', 9, 9, 4), jk('unic'))
    expect(s.xWeight).toBe(1.25)
    expect(s.weight).toBe(Math.floor((10 + 22) * 1.25))
  })
  it('分別の達人は分別搬入で 単価 ×1.5', () => {
    expect(play(c('odei', 2, 5, 9, 11, 13), jk('sorting-master')).xMult).toBe(1.5)
    expect(play(c('kenpai', 9, 9), jk('sorting-master')).xMult).toBe(1)
  })
  it('乗算補正は掛け算で合成される（ユニック車 × 分別の達人 = ×1.875）', () => {
    const cards = c('odei', 9, 9, 9)
    const s = play(cards, jk('unic', 'sorting-master'))
    expect(s.xWeight).toBe(1.25)
    expect(s.xMult).toBe(1.5)
  })
  it('脱水機は汚泥3枚以上で 重さ +60 と 単価 +2', () => {
    const s = play(c('odei', 3, 4, 5), jk('dehydrator'))
    expect(s.weightAdd).toBe(60); expect(s.multAdd).toBe(2)
  })
  it('特管の専用車両は特管を含む役に +40t / +2', () => {
    const s = play([...c('tokkan', 7), ...c('kenpai', 7)], jk('tokkan-truck'))
    expect(s.weightAdd).toBe(40); expect(s.multAdd).toBe(2)
  })
  it('積替保管施設は5枚出したときだけ 単価 +4', () => {
    expect(play(c('odei', 2, 5, 9, 11, 13), jk('transship')).multAdd).toBe(4)
    expect(play(c('odei', 9, 9), jk('transship')).multAdd).toBe(0)
  })
  it('一括下請け契約は出した枚数 × 0.5', () => {
    expect(play(c('kenpai', 9, 9, 4, 5), jk('bulk-sub')).multAdd).toBe(2)
  })
  it('元請とのパイプは残り手札1枚につき +0.3', () => {
    const cards = c('kenpai', 9, 9)
    const handType = evaluateHand(cards)
    const s = scorePlay({ handType, played: cards, scoring: scoringCards(cards, handType), remainingHands: 2, remainingDiscards: 3, boss: NO_BOSS },
      { jokers: jk('pipe') })
    expect(s.multAdd).toBe(0.6)
  })
  it('累積カウンタを渡すと効く（アームロール車 / マニフェスト管理）', () => {
    const cards = c('kenpai', 9, 9)
    const handType = evaluateHand(cards)
    const armed = [{ defId: 'armroll', counters: { weight: 30 } }, { defId: 'manifest', counters: { mult: 0.6 } }]
    const s = scorePlay({ handType, played: cards, scoring: scoringCards(cards, handType), remainingHands: 3, remainingDiscards: 3, boss: NO_BOSS },
      { jokers: armed })
    expect(s.weightAdd).toBe(30); expect(s.multAdd).toBeCloseTo(0.6)
  })
  it('同じジョーカーを2枚持てば2回効く', () => {
    const a = play(c('kenpai', 2), jk('truck-8t'))
    const b = play(c('kenpai', 2), jk('truck-8t', 'truck-8t'))
    expect(b.weightAdd - a.weightAdd).toBe(120)
  })
  it('不法投棄の噂は 単価 ×3', () => {
    expect(play(c('kenpai', 2), jk('fuhou-touki')).xMult).toBe(3)
  })
  it('売上は搬入ごとに floor される（端数のある単価で確認）', () => {
    // 同品目ペア: 重さ 28 / 単価 2 + (0.3 × 残り手札3) = 2.9 → 28 × 2.9 = 81.2 → 81
    const s = play(c('kenpai', 9, 9), jk('pipe'))
    expect(s.mult).toBeCloseTo(2.9)
    expect(s.revenue).toBe(81)
  })
})
```

- [ ] **Step 2: 落ちることを確認する**

Run: `npm test -- tests/jokers.test.ts` → FAIL

- [ ] **Step 3: `src/data/jokers.ts` に20枚を書く**

spec の表のとおりに名前・レア度・`text`（画面に出す説明。spec の効果の文言をそのまま使う）・`price`（`RARITY_PRICE[rarity]`、不法投棄の噂だけ 0）・フックを書く。分類の枚数を数えるのは `ctx.played.filter(x => x.suit === 'odei').length >= 3` の形。

- [ ] **Step 4: `src/game/jokers.ts` を書く**

`applyScoreJokers` は `env.jokers` を順に回し、`jokerDef(j.defId).onScore?.(ctx, acc, j, env)` を呼ぶだけ。累積系は自分のカウンタを読む。`jokerHandSizeMod` などは所持ジョーカーの該当フィールドを合計する。

- [ ] **Step 5: `src/game/score.ts` にループを差し込む**

ジョーカー適用は `baseMult` を出したあと、`weight` / `mult` を確定する**前**に行う。

- [ ] **Step 6: テストを通す**

Run: `npm test -- tests/jokers.test.ts` → PASS

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: add the 20 jokers and hook them into scoring"
```

---

### Task 5: 目標金額と元請の縛り

**Files:**
- Create: `src/data/blinds.ts`, `src/game/blinds.ts`
- Test: `tests/blinds.test.ts`

**Interfaces:**
- Consumes: `BossRules` / `NO_BOSS`（Task 3）
- Produces:
  - `data/blinds.ts`: `type BossId = 'inspection' | 'haggling' | 'storm'` / `type BlindDef = { day: number; index: 0 | 1 | 2; name: string; goal: number; reward: number; bossId?: BossId }` / `BLINDS: readonly BlindDef[]`（9件）/ `bossLabel(id: BossId): string` / `bossText(id: BossId): string` / `blindAt(day: number, index: 0 | 1 | 2): BlindDef`
  - `blinds.ts`: `bossRules(def: BlindDef): BossRules`
  - 目標: 1日目 300/450/600、2日目 800/1200/1600、3日目 2000/3000/5000（万円）。報酬: 午前 3 / 午後 4 / 締切 5（万円）
  - 便の名前: 1日目 小口収集／量産現場／（元請）、2日目 解体現場／再開発現場／（元請）、3日目 大型土木／最終処分場搬入／（元請）。締切の `name` は元請名（抜き打ち立入検査／元請の値切り／大雨警報）にする

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/blinds.test.ts
import { describe, expect, it } from 'vitest'
import { BLINDS, blindAt, bossLabel, bossText } from '../src/data/blinds'
import { bossRules } from '../src/game/blinds'

describe('BLINDS', () => {
  it('3日 × 3便 = 9件', () => expect(BLINDS).toHaveLength(9))
  it('目標金額が spec のとおり', () => {
    expect(blindAt(1, 0).goal).toBe(300)
    expect(blindAt(2, 2).goal).toBe(1600)
    expect(blindAt(3, 2).goal).toBe(5000)
  })
  it('締切だけが元請で、報酬は 3/4/5万円', () => {
    expect(blindAt(1, 0).bossId).toBeUndefined()
    expect(bossLabel('inspection')).toBe('抜き打ち立入検査')
    expect(bossText('storm')).toContain('手札')
    expect([blindAt(1,0).reward, blindAt(1,1).reward, blindAt(1,2).reward]).toEqual([3,4,5])
  })
})

describe('bossRules', () => {
  it('抜き打ち検査は特管を無効にする（役の成立には数える）', () => {
    const r = bossRules(blindAt(1, 2))
    expect(r.debuffedSuits).toEqual(['tokkan'])
    expect(r.baseMultMultiplier).toBe(1); expect(r.handSizeMod).toBe(0)
  })
  it('元請の値切りは基礎単価が半減', () => {
    expect(bossRules(blindAt(2, 2)).baseMultMultiplier).toBe(0.5)
  })
  it('大雨警報は手札が1枚減る', () => {
    expect(bossRules(blindAt(3, 2)).handSizeMod).toBe(-1)
  })
  it('通常の便には縛りが無い', () => {
    const r = bossRules(blindAt(2, 1))
    expect(r.debuffedSuits).toEqual([]); expect(r.baseMultMultiplier).toBe(1); expect(r.handSizeMod).toBe(0)
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → Run: `npm test -- tests/blinds.test.ts` → FAIL

- [ ] **Step 3: 実装する**

`bossRules` は `def.bossId` から `BossRules` を組み立てる。`inspection` は `debuffedSuits: ['tokkan']`、`haggling` は `baseMultMultiplier: 0.5`、`storm` は `handSizeMod: -1`、`bossId` が無ければ `NO_BOSS` と同じ値を返す。

- [ ] **Step 4: テストを通す** → Run: `npm test -- tests/blinds.test.ts` → PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add the 9 blinds, their goals, and the 元請 rules"
```

---

### Task 6: ショップ

**Files:**
- Create: `src/game/shop.ts`
- Test: `tests/shop.test.ts`

**Interfaces:**
- Consumes: `JOKERS` / `jokerDef` / `SPECIAL_JOKER_ID`（Task 4）、`RARITY_PRICE` / `RARITY_WEIGHT` / `REROLL_BASE` / `REROLL_STEP` / `SHOP_SLOTS` / `SPECIAL_CHANCE` / `MAX_JOKERS`（Task 1）、`jokerSellBonus` / `jokerRerollDiscount`（Task 4）
- Produces:
  - `type ShopOffer = { defId: string; price: number }`
  - `type ShopState = { offers: ShopOffer[]; rerolls: number }`
  - `openShop(rng: Rng): ShopState` — `SHOP_SLOTS` 枠。レア度を重み付きで抽選。同じショップ内で同じ `defId` を2枚出さない。`SPECIAL_CHANCE` の確率で1枠が不法投棄の噂に置き換わる
  - `rerollCost(shop: ShopState, discount: number): number` — `max(0, REROLL_BASE + REROLL_STEP * shop.rerolls - discount)`
  - `rerollShop(rng: Rng, shop: ShopState, discount: number): void` — 所持金の判定は呼び出し側。成功したら `shop.rerolls++` して引き直す
  - `sellValue(def: JokerDef, sellBonus: number): number` — `Math.floor(def.price / 2) + sellBonus`
  - `canBuy(run: RunState, offer: ShopOffer): boolean` — 所持金が足りて、`run.jokers.length < MAX_JOKERS`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/shop.test.ts
import { describe, expect, it } from 'vitest'
import { jokerDef } from '../src/data/jokers'
import { createRng } from '../src/game/rng'
import { openShop, rerollCost, sellValue } from '../src/game/shop'

describe('openShop', () => {
  it('2枠を出す', () => {
    const shop = openShop(createRng('s'))
    expect(shop.offers).toHaveLength(2)
    expect(shop.rerolls).toBe(0)
  })
  it('同じショップに同じジョーカーは並ばない', () => {
    for (let i = 0; i < 300; i++) {
      const shop = openShop(createRng(`s${i}`))
      expect(new Set(shop.offers.map(o => o.defId)).size).toBe(shop.offers.length)
    }
  })
  it('価格がレア度と一致する（不法投棄の噂は0万円）', () => {
    for (let i = 0; i < 200; i++) {
      for (const o of openShop(createRng(`p${i}`)).offers) {
        const def = jokerDef(o.defId)
        expect(o.price).toBe(def.special ? 0 : def.price)
      }
    }
  })
  it('同じシードなら同じ品揃えになる', () => {
    expect(openShop(createRng('same')).offers).toEqual(openShop(createRng('same')).offers)
  })
})

describe('rerollCost / sellValue', () => {
  it('リロールは3万円から1回ごとに+1万円、割引は下限0', () => {
    expect(rerollCost({ offers: [], rerolls: 0 }, 0)).toBe(3)
    expect(rerollCost({ offers: [], rerolls: 2 }, 0)).toBe(5)
    expect(rerollCost({ offers: [], rerolls: 2 }, 1)).toBe(4)
    expect(rerollCost({ offers: [], rerolls: 0 }, 99)).toBe(0)
  })
  it('売却額は購入額の半分 + 売却ボーナス', () => {
    expect(sellValue(jokerDef('truck-2t'), 0)).toBe(2)
    expect(sellValue(jokerDef('truck-2t'), 2)).toBe(4)
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → FAIL

- [ ] **Step 3: 実装する**

レア度抽選は `RARITY_WEIGHT` の累積和で `rng.int(100)` を引く。不法投棄の噂は抽選の外側（`rng.next() < SPECIAL_CHANCE` なら1枠を置き換える）。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: add the shop pool, reroll cost, and sell value"
```

---

### Task 7: 1便を遊ぶ

**Files:**
- Create: `src/game/run.ts`
- Test: `tests/run-blind.test.ts`

**Interfaces:**
- Consumes: `buildDeck` 系（Task 1）、`evaluateHand` / `scoringCards`（Task 2）、`scorePlay` / `ScoreBreakdown`（Task 3）、`blindAt` / `bossRules`（Task 5）、定数（Task 1）
- Produces:
  - `type RunState = { seed: string; rng: Rng; money: number; day: number; blindIndex: number; jokers: JokerInstance[]; result: 'playing' | 'won' | 'lost'; totalRevenue: number }`
  - `type BlindState = { def: BlindDef; boss: BossRules; hand: Card[]; drawPile: Card[]; discardPile: Card[]; selected: string[]; handsLeft: number; discardsLeft: number; revenue: number; lastScore: ScoreBreakdown | null; status: 'playing' | 'cleared' | 'failed' }`
  - `startRun(seed: string): RunState`（money = `START_MONEY`、day = 1、blindIndex = 0）
  - `startBlind(run: RunState): BlindState` — その都度52枚を組み立てて `run.rng` でシャッフルし、`HAND_SIZE + boss.handSizeMod` 枚を配る。手札4・捨て札3。デッキは便ごとに作り直す（アルファにはデッキを増減する仕組みが無いので、持ち越しても結果は同じ）
  - `toggleSelect(blind: BlindState, cardId: string): void` — 5枚を超える選択は無視。選択済みなら外す
  - `playHand(run: RunState, blind: BlindState): ScoreBreakdown | null` — 選択が空なら null。売上を `blind.revenue` に足し、`handsLeft--`。搬入したカードを捨て山へ送り、手札を引き直す。`revenue >= def.goal` なら `status = 'cleared'`、`handsLeft === 0` で未達なら `status = 'failed'`
  - `discardSelected(run: RunState, blind: BlindState): void` — 選択を捨て山へ。`discardsLeft--`。捨てたあと `onDiscard` フックを回す
  - `drawUpTo(blind: BlindState, size: number, rng: Rng): void` — 山が尽きたら捨て山をシャッフルして山に戻す

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/run-blind.test.ts
import { describe, expect, it } from 'vitest'
import { startBlind, startRun, toggleSelect, playHand, discardSelected } from '../src/game/run'
import { HAND_SIZE, START_MONEY } from '../src/game/constants'

describe('startRun / startBlind', () => {
  it('開始資金4万円、1日目の午前便から', () => {
    const run = startRun('s')
    expect(run.money).toBe(START_MONEY)
    expect(run.day).toBe(1); expect(run.blindIndex).toBe(0)
    expect(run.result).toBe('playing')
  })
  it('手札8枚、手札4回・捨て札3回で始まる', () => {
    const blind = startBlind(startRun('s'))
    expect(blind.hand).toHaveLength(HAND_SIZE)
    expect(blind.handsLeft).toBe(4); expect(blind.discardsLeft).toBe(3)
    expect(blind.status).toBe('playing')
  })
  it('大雨警報の便は手札が7枚（3日目の締切）', () => {
    const run = startRun('s'); run.day = 3; run.blindIndex = 2
    expect(startBlind(run).hand).toHaveLength(HAND_SIZE - 1)
  })
})

describe('選択と搬入', () => {
  it('5枚を超えて選べない', () => {
    const blind = startBlind(startRun('s'))
    for (const c of blind.hand) toggleSelect(blind, c.id)
    expect(blind.selected).toHaveLength(5)
  })
  it('選択していないと搬入できない', () => {
    expect(playHand(startRun('s'), startBlind(startRun('s')))).toBeNull()
  })
  it('搬入すると売上に足され、手札が1回減り、引き直して8枚に戻る', () => {
    const run = startRun('s'); const blind = startBlind(run)
    toggleSelect(blind, blind.hand[0].id)
    const score = playHand(run, blind)!
    expect(score.revenue).toBeGreaterThan(0)
    expect(blind.revenue).toBe(score.revenue)
    expect(blind.handsLeft).toBe(3)
    expect(blind.hand).toHaveLength(HAND_SIZE)
    expect(blind.selected).toHaveLength(0)
  })
  it('捨てると捨て札が1回減り、手札は引き直される', () => {
    const run = startRun('s'); const blind = startBlind(run)
    toggleSelect(blind, blind.hand[0].id)
    discardSelected(run, blind)
    expect(blind.discardsLeft).toBe(2)
    expect(blind.hand).toHaveLength(HAND_SIZE)
  })
})

describe('突破と失敗', () => {
  it('目標に届いたら cleared', () => {
    const run = startRun('s'); const blind = startBlind(run)
    blind.revenue = blind.def.goal - 1
    // 何か1枚搬入して超える
    toggleSelect(blind, blind.hand[0].id)
    playHand(run, blind)
    expect(['cleared', 'playing']).toContain(blind.status)
    if (blind.revenue >= blind.def.goal) expect(blind.status).toBe('cleared')
  })
  it('手札を使い切って未達なら failed', () => {
    const run = startRun('s'); const blind = startBlind(run)
    for (let i = 0; i < 4; i++) { toggleSelect(blind, blind.hand[0].id); playHand(run, blind) }
    expect(blind.handsLeft).toBe(0)
    expect(blind.revenue < blind.def.goal ? blind.status : '').toBeTruthy()
  })
})

describe('デッキ切れ', () => {
  it('山が尽きたら捨て山を再シャッフルして、手札8枚を保つ', () => {
    const run = startRun('s'); const blind = startBlind(run)
    blind.discardsLeft = 60                    // 意図的に山を枯らせるようにする
    for (let i = 0; i < 50; i++) {
      toggleSelect(blind, blind.hand[0].id)
      discardSelected(run, blind)
      expect(blind.hand).toHaveLength(HAND_SIZE)
    }
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → FAIL

- [ ] **Step 3: `src/game/run.ts` を実装する**

搬入/捨て札のあとは必ず `drawUpTo(blind, size, run.rng)` を呼ぶ。`size` は `HAND_SIZE + blind.boss.handSizeMod`。山が空なら捨て山を `rng.shuffle` して山に戻す。`onDiscard` フックは `jokerDef(j.defId).onDiscard?.(run, j)` で回す。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: コミット**

```bash
git add -A
git commit -m "feat: play a single blind (draw, select, 搬入, 捨てる, 突破判定)"
```

---

### Task 8: 精算とラン全体

**Files:**
- Modify: `src/game/run.ts`
- Test: `tests/run.test.ts`

**Interfaces:**
- Consumes: Task 7 のすべて、`jokerInterestRate` / `jokerInterestCap` / `jokerSellBonus` / `jokerRerollDiscount`（Task 4）、`INTEREST_UNIT` / `INTEREST_RATE` / `INTEREST_CAP` / `HAND_BONUS_PER_HAND`（Task 1）
- Produces:
  - `type Payout = { reward: number; handBonus: number; interest: number; total: number }`
  - `payoutFor(run: RunState, blind: BlindState): Payout` — `reward` は `blind.def.reward`、`handBonus = blind.handsLeft * HAND_BONUS_PER_HAND`、`interest = min(cap, floor(run.money / INTEREST_UNIT) * rate)`。`rate` / `cap` はジョーカーで上書き（中間処理場の株主なら 2 / 10）
  - `settleBlind(run: RunState, blind: BlindState): Payout` — 報酬を `run.money` に足し、`run.totalRevenue += blind.revenue`。`onBlindCleared` フックを回す（大型案件の常連が効く）
  - `advanceBlind(run: RunState): void` — 次の便へ。1日目の3便目を終えたら翌日へ。3日目の締切を終えたら `result = 'won'`
  - `loseRun(run: RunState): void` — `result = 'lost'`
  - `addJoker(run: RunState, defId: string): void` — 枠が埋まっていれば何もしない。`onAcquire` を呼ぶ（不法投棄の噂が所持金を0にする）
  - `removeJoker(run: RunState, index: number): number` — 売却額を返して `run.money` に足す

- [ ] **Step 1: 失敗するテストを書く**

```ts
// tests/run.test.ts
import { describe, expect, it } from 'vitest'
import { addJoker, advanceBlind, discardSelected, payoutFor, removeJoker, settleBlind, startBlind, startRun, toggleSelect } from '../src/game/run'
import { HAND_SIZE, MAX_JOKERS, START_MONEY } from '../src/game/constants'

describe('payoutFor', () => {
  it('報酬 + 残り手札 × 1 + 利息（所持金5万円ごとに1万円、上限5万円）', () => {
    const run = startRun('s'); run.money = 23
    const blind = startBlind(run)          // 1日目午前便: 報酬3万円
    blind.handsLeft = 2
    const p = payoutFor(run, blind)
    expect(p.reward).toBe(3); expect(p.handBonus).toBe(2); expect(p.interest).toBe(4)  // floor(23/5)=4
    expect(p.total).toBe(9)
  })
  it('利息には上限5万円がかかる', () => {
    const run = startRun('s'); run.money = 1000
    expect(payoutFor(run, startBlind(run)).interest).toBe(5)
  })
  it('中間処理場の株主があると利息が2倍・上限10万円', () => {
    const run = startRun('s'); run.money = 1000
    addJoker(run, 'shareholder')
    expect(payoutFor(run, startBlind(run)).interest).toBe(10)
  })
})

describe('settleBlind / advanceBlind', () => {
  it('報酬が所持金に入り、総売上に積まれる', () => {
    const run = startRun('s'); const blind = startBlind(run)
    blind.revenue = 300; blind.status = 'cleared'
    const before = run.money
    const p = settleBlind(run, blind)
    expect(run.money).toBe(before + p.total)
    expect(run.totalRevenue).toBe(300)
  })
  it('大型案件の常連は締切を突破したときだけ +20万円', () => {
    const run = startRun('s'); addJoker(run, 'big-client')
    run.day = 1; run.blindIndex = 2                       // 締切
    const blind = startBlind(run); blind.status = 'cleared'; blind.revenue = 600
    const p = settleBlind(run, blind)
    expect(run.money).toBe(START_MONEY + p.total + 20)

    const run2 = startRun('s'); addJoker(run2, 'big-client')
    run2.day = 1; run2.blindIndex = 1                     // 午後便
    const blind2 = startBlind(run2); blind2.status = 'cleared'; blind2.revenue = 450
    const p2 = settleBlind(run2, blind2)
    expect(run2.money).toBe(START_MONEY + p2.total)       // ボーナスは乗らない
  })
  it('便を進めると 1日目午前 → 午後 → 締切 → 2日目午前', () => {
    const run = startRun('s')
    advanceBlind(run); expect([run.day, run.blindIndex]).toEqual([1, 1])
    advanceBlind(run); expect([run.day, run.blindIndex]).toEqual([1, 2])
    advanceBlind(run); expect([run.day, run.blindIndex]).toEqual([2, 0])
  })
  it('3日目の締切を終えると勝利', () => {
    const run = startRun('s'); run.day = 3; run.blindIndex = 2
    advanceBlind(run)
    expect(run.result).toBe('won')
  })
})

describe('ジョーカーの出し入れ', () => {
  it('枠は5つまで', () => {
    const run = startRun('s')
    for (let i = 0; i < 8; i++) addJoker(run, 'truck-2t')
    expect(run.jokers).toHaveLength(MAX_JOKERS)
  })
  it('不法投棄の噂は買った瞬間に所持金を0にする', () => {
    const run = startRun('s'); run.money = 40
    addJoker(run, 'fuhou-touki')
    expect(run.money).toBe(0)
  })
  it('売却すると購入額の半分が戻る', () => {
    const run = startRun('s'); addJoker(run, 'truck-2t')
    expect(removeJoker(run, 0)).toBe(2)
  })
})

describe('累積カウンタは便をまたいで残る', () => {
  it('アームロール車は捨て札のたびに +10 を積み、次の便でも効く', () => {
    const run = startRun('s'); addJoker(run, 'armroll')
    const b1 = startBlind(run)
    // 20回引いても落ちない
    for (let i = 0; i < 20; i++) {
      if (b1.status !== 'playing') break
      toggleSelect(b1, b1.hand[0].id); discardSelected(run, b1)
    }
    const after = run.jokers[0].counters.weight
    expect(after).toBeGreaterThan(0)
    run.blindIndex = 1
    expect(run.jokers[0].counters.weight).toBe(after)   // 便をまたいでも残る
  })
})
```

（`toggleSelect` / `discardSelected` をこのテストで使うので import に足すこと）

- [ ] **Step 2: 落ちることを確認する** → FAIL

- [ ] **Step 3: 実装する**

利息は `min(cap, floor(money / INTEREST_UNIT) * rate)`。ジョーカーがあれば `rate` / `cap` を上書きする。`advanceBlind` は `blindIndex` を進め、2 の次は `day++` かつ `blindIndex = 0`。`day > 3` になったら `result = 'won'`。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: 通しで1ラン回るスモークテストを足す**

```ts
// tests/run-full.test.ts
it('ランの最初から最後まで、例外を出さずに必ず終わる', () => {
  const run = startRun('full-run')
  let guard = 0
  while (run.result === 'playing' && guard++ < 100) {
    const blind = startBlind(run)
    while (blind.status === 'playing') {
      const best = blind.hand.slice(0, 5).map(c => c.id)
      for (const id of best) toggleSelect(blind, id)
      if (!playHand(run, blind)) break
    }
    if (blind.status === 'failed') { run.result = 'lost'; break }
    settleBlind(run, blind)
    advanceBlind(run)
  }
  expect(['won', 'lost']).toContain(run.result)
})
```

Run: `npm test` → PASS

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "feat: settle blinds, pay out rewards and interest, and drive the run"
```

---

### Task 9: 画面 — アプリの殻と盤面

**Files:**
- Create: `src/ui/app.ts`, `src/ui/render.ts`
- Modify: `src/ui/style.css`, `src/main.ts`, `vite.config.ts`（`test.environment` は jsdom にできないので、UI テストだけ `// @vitest-environment jsdom` をファイル先頭に置く）
- Test: `tests/render-board.test.ts`

**Interfaces:**
- Consumes: `RunState` / `BlindState` / ゲーム関数一式（Task 7・8）、`HAND_LABEL` / `SUIT_LABEL` / `SUIT_MARK` / `itemName` / `rankLabel`（Task 1・2）
- Produces:
  - `ui/app.ts`: `type Screen = 'title' | 'blinds' | 'board' | 'cashout' | 'shop' | 'result'` / `type Action = { kind: 'newRun'; seed: string } | { kind: 'openBlind' } | { kind: 'toggleCard'; cardId: string } | { kind: 'play' } | { kind: 'discard' } | { kind: 'settle' } | { kind: 'plunder' } | { kind: 'next' } | { kind: 'buy'; slot: number } | { kind: 'reroll' } | { kind: 'sell'; index: number } | { kind: 'toggleSound' }` / `type AppState = { screen: Screen; run: RunState; blind: BlindState | null; shop: ShopState | null; payout: Payout | null; soundOn: boolean }` / `createApp(seed: string): AppState` / `dispatch(app: AppState, action: Action): void` / `actionFromElement(el: { dataset: DOMStringMap }): Action | null`
  - `ui/render.ts`: `renderApp(app: AppState): string` / `cardHtml(card: Card, opts?: { selected?: boolean; small?: boolean }): string` / `jokerHtml(def: JokerDef, inst: JokerInstance): string` / `progressBarHtml(current: number, goal: number): string`
  - `main.ts`: `?seed=` を読み、`createApp` → `renderApp` を `#app` に流し込み、クリックを `actionFromElement` で拾って `dispatch` → 再描画

- [ ] **Step 1: 失敗するテストを書く**

```ts
// @vitest-environment jsdom
// tests/render-board.test.ts
import { describe, expect, it } from 'vitest'
import { createApp, dispatch } from '../src/ui/app'
import { renderApp } from '../src/ui/render'
import { startBlind, toggleSelect, playHand } from '../src/game/run'

describe('盤面の描画', () => {
  it('目標金額・品目名・役の呼称・売上が出る', () => {
    const app = createApp('s')
    app.screen = 'board'; app.blind = startBlind(app.run)
    const html = renderApp(app)
    expect(html).toContain('目標')
    expect(html).toContain('300')                 // 1日目午前便の目標
    expect(html).toMatch(/石膏ボード|廃木材|コンクリートがれき/)
    expect(html).toContain('搬入')
    expect(html).toContain('捨てる')
  })
  it('選んだカードに selected の印がつく', () => {
    const app = createApp('s'); app.screen = 'board'; app.blind = startBlind(app.run)
    toggleSelect(app.blind, app.blind.hand[0].id)
    const html = renderApp(app)
    expect(html).toContain('data-selected="true"')
  })
  it('搬入すると 重さ × 単価 = 売上 が画面に出る', () => {
    const app = createApp('s'); app.screen = 'board'; app.blind = startBlind(app.run)
    toggleSelect(app.blind, app.blind.hand[0].id)
    playHand(app.run, app.blind)
    const html = renderApp(app)
    expect(html).toContain('重さ'); expect(html).toContain('単価'); expect(html).toContain('万円')
  })
  it('元請の縛りが盤面に出る（3日目締切なら大雨警報）', () => {
    const app = createApp('s')
    app.run.day = 3; app.run.blindIndex = 2
    app.screen = 'board'; app.blind = startBlind(app.run)
    expect(renderApp(app)).toContain('大雨警報')
  })
  it('所持ジョーカーの名前と効果が常時出る', () => {
    const app = createApp('s'); app.screen = 'board'; app.blind = startBlind(app.run)
    app.run.jokers.push({ defId: 'truck-8t', counters: {} })
    const html = renderApp(app)
    expect(html).toContain('8t 深ダンプ'); expect(html).toContain('+120')
  })
  it('dispatch はカードの選択を反映する', () => {
    const app = createApp('s'); app.screen = 'board'; app.blind = startBlind(app.run)
    const id = app.blind.hand[0].id
    dispatch(app, { kind: 'toggleCard', cardId: id })
    expect(app.blind.selected).toEqual([id])
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → Run: `npm i -D jsdom && npm test -- tests/render-board.test.ts` → FAIL

- [ ] **Step 3: `src/ui/render.ts` と `src/ui/app.ts` を実装する**

盤面の並びは spec のモックアップ（`.superpowers/brainstorm/2772561-1792083678/content/board-v3.html`）に合わせる。上段に「N日目 ○○便／残り手札・捨て札」と目標金額、その下に売上バー、中央に採点結果、下段に手札8枚、左下にジョーカー5枠（名前＋効果）、右下に「搬入／捨てる」。クリック対象には `data-action` と `data-card` を付け、選択中のカードには `data-selected="true"` を付ける。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: `src/ui/style.css` と `src/main.ts` を仕上げてブラウザで確認する**

Run: `npm run dev` → http://localhost:5173 で、カードが選べて搬入でき、数字が出ることを目視する。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "feat: render the board (hand, jokers, target, scoring)"
```

---

### Task 10: 画面 — タイトル・元請選択・精算・ショップ・リザルト

**Files:**
- Modify: `src/ui/render.ts`, `src/ui/app.ts`, `src/ui/style.css`
- Test: `tests/render-screens.test.ts`

**Interfaces:**
- Consumes: Task 9 のすべて、`openShop` / `rerollShop` / `rerollCost` / `sellValue` / `canBuy`（Task 6）、`payoutFor` / `settleBlind` / `advanceBlind` / `addJoker` / `removeJoker`（Task 8）
- Produces: 追加の `Action` とスクリーン描画。`dispatch` の遷移は
  `title → (newRun) → blinds → (openBlind) → board → (play で cleared) → cashout → (settle) → shop → (next) → blinds …`、
  便が failed なら `board → (settle) → result`（`result = 'lost'`）、3日目の締切を終えたら `result = 'won'`

- [ ] **Step 1: 失敗するテストを書く**

```ts
// @vitest-environment jsdom
// tests/render-screens.test.ts
import { describe, expect, it } from 'vitest'
import { createApp, dispatch } from '../src/ui/app'
import { renderApp } from '../src/ui/render'

describe('画面遷移', () => {
  it('タイトルから始まり、はじめる と シードが出る', () => {
    const app = createApp('s')
    expect(app.screen).toBe('title')
    expect(renderApp(app)).toContain('waste-inc2')
  })
  it('元請選択に3便と目標金額が並ぶ', () => {
    const app = createApp('s'); dispatch(app, { kind: 'newRun', seed: 's' })
    const html = renderApp(app)
    expect(app.screen).toBe('blinds')
    expect(html).toContain('午前便'); expect(html).toContain('締切')
    expect(html).toContain('300')
  })
  it('突破すると精算画面に報酬・手数ボーナス・利息が出る', () => {
    const app = createApp('s'); dispatch(app, { kind: 'newRun', seed: 's' }); dispatch(app, { kind: 'openBlind' })
    app.blind!.revenue = app.blind!.def.goal
    app.blind!.status = 'cleared'
    dispatch(app, { kind: 'settle' })
    const html = renderApp(app)
    expect(app.screen).toBe('cashout')
    expect(html).toContain('報酬'); expect(html).toContain('利息')
  })
  it('ショップに並ぶジョーカーと価格が出て、買うと所持金が減る', () => {
    const app = createApp('s'); dispatch(app, { kind: 'newRun', seed: 's' }); dispatch(app, { kind: 'openBlind' })
    app.blind!.revenue = app.blind!.def.goal; app.blind!.status = 'cleared'
    dispatch(app, { kind: 'settle' }); dispatch(app, { kind: 'next' })
    expect(app.screen).toBe('shop')
    expect(renderApp(app)).toContain('万円')
    const slot = app.shop!.offers.findIndex(o => o.price > 0)
    expect(slot).toBeGreaterThanOrEqual(0)
    const price = app.shop!.offers[slot].price
    app.run.money = 999
    dispatch(app, { kind: 'buy', slot })
    expect(app.run.jokers).toHaveLength(1)
    expect(app.run.money).toBe(999 - price)
  })
  it('未達で終わるとリザルトが lost を出す', () => {
    const app = createApp('s'); dispatch(app, { kind: 'newRun', seed: 's' }); dispatch(app, { kind: 'openBlind' })
    app.blind!.status = 'failed'
    dispatch(app, { kind: 'settle' })
    expect(app.screen).toBe('result')
    expect(renderApp(app)).toContain('解散')
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → FAIL

- [ ] **Step 3: 実装する**

精算画面は「報酬／手数ボーナス／利息／合計」を出す。ショップは2枠＋「リロール ○万円」＋所持ジョーカー（売却ボタン付き）。リザルトは総売上・残金・突破した便・取得ジョーカー・シードを出し、B/A/S のランクを付ける（暫定: 総売上 8000万円未満 B / 15000万円未満 A / 以上 S）。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: ブラウザで通しで遊ぶ**

Run: `npm run dev` で、タイトル → 元請選択 → 盤面 → 精算 → ショップ → 次の便 → 3日目の締切 → リザルトまで通す。落ちないこと、手札4回で必ず決着がつくことを確認する。

- [ ] **Step 6: コミット**

```bash
git add -A
git commit -m "feat: add title, blind select, cashout, shop, and result screens"
```

---

### Task 11: 効果音

**Files:**
- Create: `src/ui/sound.ts`
- Modify: `src/ui/app.ts`（各アクションで鳴らす）, `src/ui/render.ts`（右上の 🔊）, `src/main.ts`（最初のクリックで解錠）
- Test: `tests/sound.test.ts`

**Interfaces:**
- Consumes: なし（DOM と WebAudio だけ。`src/game/` からは触らない）
- Produces:
  - `type SoundName = 'deal' | 'pick' | 'discard' | 'scoreWeight' | 'scoreMult' | 'scoreRevenue' | 'clear' | 'fail' | 'buy'`
  - `unlockAudio(): void` — 最初のユーザー操作で呼ぶ。以後 `playSound` が鳴る
  - `isAudioUnlocked(): boolean`
  - `playSound(name: SoundName): void` — `AudioContext` が無ければ何もせず黙って返る
  - `loadSoundOn(): boolean` / `saveSoundOn(on: boolean): void` — `localStorage` のキー `waste-inc2:sound`。既定は ON

- [ ] **Step 1: 失敗するテストを書く**

```ts
// @vitest-environment jsdom
// tests/sound.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadSoundOn, playSound, saveSoundOn, unlockAudio } from '../src/ui/sound'

describe('sound', () => {
  beforeEach(() => localStorage.clear())
  it('既定は ON、保存したら読み戻せる', () => {
    expect(loadSoundOn()).toBe(true)
    saveSoundOn(false)
    expect(loadSoundOn()).toBe(false)
  })
  it('AudioContext が無くても playSound は例外を投げない', () => {
    unlockAudio()
    expect(() => playSound('deal')).not.toThrow()
  })
  it('未解錠でも例外を投げない', () => {
    expect(() => playSound('clear')).not.toThrow()
  })
})
```

- [ ] **Step 2: 落ちることを確認する** → FAIL

- [ ] **Step 3: `src/ui/sound.ts` を実装する**

`OscillatorNode` + `GainNode` の短い減衰で作る。`deal` は短いノイズ的な高音、`pick` はごく短いクリック、`discard` は周波数が下がるスイープ、`scoreWeight` / `scoreMult` / `scoreRevenue` は上がる3音、`clear` は明るい上昇、`fail` は下降、`buy` はコイン。ON/OFF は `loadSoundOn()` を見て `playSound` の先頭で早期 return する。

- [ ] **Step 4: テストを通す** → PASS

- [ ] **Step 5: 配線する**

`dispatch` の中から鳴らす: 配布時に `deal`、カード選択で `pick`、捨てで `discard`、搬入時に `scoreWeight` → `scoreMult` → `scoreRevenue` を少しずつずらして、突破で `clear`、失敗で `fail`、購入で `buy`。`main.ts` の最初のクリックで `unlockAudio()`。右上の 🔊 で `saveSoundOn` を反転して再描画。

- [ ] **Step 6: ブラウザで音を確認する**

Run: `npm run dev` → 配る音・選ぶ音・搬入の3段・突破の音が鳴り、🔊 で止まることを確認する。

- [ ] **Step 7: コミット**

```bash
git add -A
git commit -m "feat: add minimal WebAudio sound effects and the mute toggle"
```

---

### Task 12: 仕上げ

**Files:**
- Create: `README.md`, `.github/workflows/deploy.yml`
- Modify: `vite.config.ts`（Pages 用の `base`）

**Interfaces:**
- Consumes: すべて
- Produces: 何も公開しない（設定と文書だけ）

- [ ] **Step 1: README を書く**

前作の README に倣い、遊び方（1日の流れ・得点・元請）、ローカルの動かし方（`npm install` / `npm run dev`）、開発（`npm run test` / `lint` / `build`）、設計書へのリンク、`?seed=` の説明を書く。

- [ ] **Step 2: GitHub Pages のワークフローを置く**

`waste-inc` と同じ形（`master` への push で lint / test / build して Pages へデプロイ）。`vite.config.ts` の `base` をリポジトリ名に合わせる。

- [ ] **Step 3: 最終確認**

Run: `npm test && npm run lint && npm run typecheck && npm run build`
Expected: すべて成功。`dist/` が生成される。

- [ ] **Step 4: コミット**

```bash
git add -A
git commit -m "docs: add README and the GitHub Pages workflow"
```
