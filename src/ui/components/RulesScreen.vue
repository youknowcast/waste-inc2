<script setup lang="ts">
import { BLINDS, bossLabel, bossText } from '../../data/blinds.ts';
import { ITEMS } from '../../data/items.ts';
import { JOKERS } from '../../data/jokers.ts';
import {
  RANKS,
  rankLabel,
  rankValue,
  SUIT_COLOR,
  SUIT_LABEL,
  SUIT_MARK,
  SUITS,
} from '../../game/cards.ts';
import {
  DISCARDS_PER_BLIND,
  HAND_BONUS_PER_HAND,
  HAND_SIZE,
  HANDS_PER_BLIND,
  INTEREST_CAP,
  INTEREST_RATE,
  INTEREST_UNIT,
  MAX_JOKERS,
  RARITY_PRICE,
  REROLL_BASE,
  SHOP_SLOTS,
} from '../../game/constants.ts';
import { HAND_LABEL, HAND_TABLE, HAND_TYPES } from '../../game/hands.ts';
import type { Rarity } from '../../game/types.ts';
import { timeLabel } from './labels.ts';
import RulesSection from './RulesSection.vue';

/** あそびかたに出すレア度の呼称（表示用）。 */
const RARITY_LABEL: Record<Rarity, string> = {
  COMMON: 'コモン',
  UNCOMMON: 'アンコモン',
  RARE: 'レア',
};

// 9便の一覧。目標金額・報酬はすべて BLINDS の実データから引く。
const blindRows = BLINDS;

// 締切（3便目）の縛り。元請名と縛り文もデータから引く。
const bossRows = BLINDS.flatMap((blind) => {
  if (blind.index !== 2 || !blind.bossId) return [];
  return [
    {
      day: blind.day,
      name: blind.name,
      bossId: blind.bossId,
      label: bossLabel(blind.bossId),
      text: bossText(blind.bossId),
    },
  ];
});

// 得点の実例（三点積み）。すべてゲームの実データから組み立てる。
const exampleBase = HAND_TABLE.three.baseWeight;
const exampleMult = HAND_TABLE.three.baseMult;
const exampleCardValue = rankValue(9);
const exampleCardCount = 3;
const exampleCardWeight = exampleCardValue * exampleCardCount;
const exampleWeight = exampleBase + exampleCardWeight;

// レア度ごとの価格。RARITY_PRICE の並び順のまま出す。
const rarityRows = Object.entries(RARITY_PRICE).map(([rarity, price]) => ({
  rarity: rarity as Rarity,
  label: RARITY_LABEL[rarity as Rarity],
  price,
}));
</script>

<template>
  <div class="rules-screen">
    <div class="screen-title">あそびかた</div>

    <RulesSection title="ひとこと">
      <p>産廃の配車担当になって、9つの現場を回る。手札から5枚まで出して積載パターンを作り、<b>重さ × 単価</b> で売上を弾けさせる。1プレイ10〜15分。届かなければその場で解散。</p>
    </RulesSection>

    <RulesSection title="1日の流れ">
      <p>1営業日 = 3便（午前便 → 午後便 → 締切の元請）、3日 = 9便。各便は手札 {{ HAND_SIZE }} 枚で始まり、{{ HANDS_PER_BLIND }} 回搬入でき、{{ DISCARDS_PER_BLIND }} 回捨てられる。</p>
      <div class="rules-blinds">
        <div
          v-for="blind in blindRows"
          :key="`d${blind.day}-${blind.index}`"
          class="rules-blind"
          :data-blind="`d${blind.day}-${blind.index}`"
        >
          <span class="rb-day">{{ blind.day }}日目</span>
          <span class="rb-time">{{ timeLabel(blind.index) }}</span>
          <span class="rb-name">{{ blind.name }}</span>
          <span class="rb-goal">{{ blind.goal }}万円</span>
          <span class="rb-reward">報酬 {{ blind.reward }}万円</span>
        </div>
      </div>
    </RulesSection>

    <RulesSection title="得点は 重さ × 単価">
      <div class="rules-formula">売上 = 重さ × 単価</div>
      <p>重さは<b>役の基礎の重さ ＋ 出したカードの重さ</b>。役ごとに決まった基礎の重さに、出したカードの重さが乗る。カードの数字はそのまま、絵札（J/Q/K）は {{ rankValue(11) }}t、A は {{ rankValue(14) }}t。単価は役の基礎値から始まり、ジョーカーで盛る。</p>
      <div class="rules-example">
        <span>{{ HAND_LABEL.three }}（{{ exampleCardValue }}t を{{ exampleCardCount }}枚）</span>
        <span class="op">→</span>
        <span>役の基礎 {{ exampleBase }}t</span>
        <span class="op">+</span>
        <span>カード {{ exampleCardWeight }}t</span>
        <span class="op">=</span>
        <span class="w">重さ {{ exampleWeight }}t</span>
        <span class="op">×</span>
        <span class="m">単価 {{ exampleMult }}</span>
        <span class="op">=</span>
        <span class="r">{{ exampleWeight * exampleMult }}万円</span>
      </div>
    </RulesSection>

    <RulesSection title="狙う役と基礎の数字">
      <p>上にある役ほど出しやすく、下にあるほど強い（ただし最下段の2役は同じ基礎値で同格）。得点は <b>役の基礎の重さ ＋ 出したカードの重さ</b> に、役の基礎の単価を掛けたところから始まる。</p>
      <div class="rules-hands">
        <div
          v-for="type in HAND_TYPES"
          :key="type"
          class="rules-hand"
          :data-hand="type"
        >
          <span class="rh-name">{{ HAND_LABEL[type] }}</span>
          <span class="rh-w">重さ {{ HAND_TABLE[type].baseWeight }}</span>
          <span class="rh-m">単価 {{ HAND_TABLE[type].baseMult }}</span>
        </div>
      </div>
    </RulesSection>

    <RulesSection title="締切の縛り">
      <p>各日の締切（3便目）は元請の縛りつき。突破できなければその場で解散。</p>
      <div class="rules-bosses">
        <div
          v-for="boss in bossRows"
          :key="boss.bossId"
          class="rules-boss"
          :data-boss="boss.bossId"
        >
          <div class="rb-head">{{ boss.day }}日目 {{ boss.name }}</div>
          <div class="rb-label">{{ boss.label }}</div>
          <div class="rb-text">{{ boss.text }}</div>
        </div>
      </div>
    </RulesSection>

    <RulesSection title="お金">
      <ul class="rules-list">
        <li>便を突破すると上の表の<b>報酬</b>が入る。</li>
        <li><b>手数ボーナス</b>：残した搬入1回につき {{ HAND_BONUS_PER_HAND }}万円。</li>
        <li><b>利息</b>：所持金 {{ INTEREST_UNIT }}万円ごとに {{ INTEREST_RATE }}万円、上限 {{ INTEREST_CAP }}万円。</li>
        <li><b>ショップ</b>：各便の突破後に開く。品揃えは {{ SHOP_SLOTS }} 枠。</li>
        <li><b>価格</b>：<span
            v-for="row in rarityRows"
            :key="row.rarity"
            class="rules-rarity"
          >{{ row.label }} {{ row.price }}万円</span></li>
        <li><b>リロール</b>：{{ REROLL_BASE }}万円から。</li>
        <li><b>ジョーカー枠</b>：{{ MAX_JOKERS }}枚まで。</li>
      </ul>
    </RulesSection>

    <RulesSection :title="`ジョーカー ${JOKERS.length}枚`">
      <p>積載・交渉・分類シナジー・経済の4系統。{{ MAX_JOKERS }}枚まで持ち歩ける。</p>
      <div class="rules-jokers">
        <div v-for="joker in JOKERS" :key="joker.id" class="rules-joker">
          <div class="jn">{{ joker.name }}</div>
          <div class="je" v-html="joker.text"></div>
        </div>
      </div>
    </RulesSection>

    <RulesSection :title="`品目 ${SUITS.length * RANKS.length}枚`">
      <p>4分類 × 13ランク。数字が重さそのもので、絵札は {{ rankValue(11) }}t、A は {{ rankValue(14) }}t。<b>4分類は採点上等価</b>で強弱は無い（らしさはジョーカー側にある）。</p>
      <div class="rules-suits">
        <div v-for="suit in SUITS" :key="suit" class="rules-suit" :data-suit="suit">
          <div class="rs-head" :style="{ color: SUIT_COLOR[suit] }">{{ SUIT_MARK[suit] }} {{ SUIT_LABEL[suit] }}</div>
          <div class="rs-items">
            <span v-for="rank in RANKS" :key="rank" class="rs-item"><b>{{ rankLabel(rank) }}</b> {{ ITEMS[suit][rank] }}</span>
          </div>
        </div>
      </div>
    </RulesSection>

    <div class="btns rules-back">
      <button type="button" class="btn btn-primary" data-action="closeRules">もどる</button>
    </div>
  </div>
</template>
