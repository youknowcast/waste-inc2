<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { bossLabel } from '../../data/blinds.ts';
import { jokerDef } from '../../data/jokers.ts';
import { MAX_JOKERS } from '../../game/constants.ts';
import type { BlindState, RunState } from '../../game/run.ts';
import type { ScoreBreakdown } from '../../game/score.ts';
import type { Card } from '../../game/types.ts';
import HandCard from './HandCard.vue';
import JokerChip from './JokerChip.vue';
import { timeLabel } from './labels.ts';
import ProgressBar from './ProgressBar.vue';
import ScoreStage from './ScoreStage.vue';
import { firedJokerNames } from './score-lines.ts';

const props = defineProps<{
  run: RunState;
  blind: BlindState;
}>();

const remaining = computed(() =>
  Math.max(0, props.blind.def.goal - props.blind.revenue),
);
const bossName = computed(() =>
  props.blind.def.bossId ? bossLabel(props.blind.def.bossId) : null,
);

// 効いたジョーカーの札だけを光らせる。lastScore が無い画面では空集合。
const fired = computed(() =>
  props.blind.lastScore
    ? firedJokerNames(props.blind.lastScore)
    : new Set<string>(),
);

/**
 * 搬入のたびに増える採点の連番。
 * lastScore は搬入で新しいオブジェクトになるので、その変化だけを数える。
 * 各演出（重さ→単価→売上・ジョーカーの光り・バーの伸び）はこの連番を key に使い、
 * 搬入のたびに一度だけ再生される。カードを選び直しても増えない。
 */
const scoreSeq = ref(0);

/** 飛行中（見た目だけ）のカード。state には一切書き戻さない。 */
type Flight = {
  uid: number;
  card: Card;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
};
const flying = ref<Flight[]>([]);
let nextFlightUid = 0;

const bdRef = ref<HTMLElement | null>(null);

/** 要素の中心を .bd からの相対座標で返す。 */
function centerOf(el: Element | null, bd: DOMRect): { x: number; y: number } {
  const r = el?.getBoundingClientRect();
  if (!r) return { x: bd.width / 2, y: bd.height / 2 };
  return { x: r.left + r.width / 2 - bd.left, y: r.top + r.height / 2 - bd.top };
}

let seenScore: ScoreBreakdown | null = props.blind.lastScore;

// 手札が変わったとき、lastScore も変わっていれば「搬入」とみなす。
// 捨て札・配り直しは lastScore が変わらないので演出しない。
// flush: 'pre' なので、まだ古い DOM（消える前の手札）から飛び出し位置を測れる。
watch(
  () => props.blind.hand,
  (newHand, oldHand) => {
    const score = props.blind.lastScore;
    if (!score || score === seenScore) return;
    seenScore = score;
    scoreSeq.value++;

    const root = bdRef.value;
    const bd = root?.getBoundingClientRect();
    if (!root || !bd) return;
    const goal = centerOf(root.querySelector('.stage'), bd);
    const handEl = root.querySelector<HTMLElement>('.hand');

    // 消えるカードがまだ画面に残っている位置を控えておく（無ければ手札の中心へ）。
    const rects = new Map<string, DOMRect>();
    for (const el of handEl?.querySelectorAll<HTMLElement>('.hc') ?? []) {
      const id = el.dataset.card;
      if (id) rects.set(id, el.getBoundingClientRect());
    }
    const fallback = centerOf(handEl, bd);

    for (const card of oldHand) {
      if (newHand.some((n) => n.id === card.id)) continue;
      const r = rects.get(card.id);
      const start = r
        ? { x: r.left + r.width / 2 - bd.left, y: r.top + r.height / 2 - bd.top }
        : fallback;
      flying.value.push({
        uid: nextFlightUid++,
        card,
        x0: start.x,
        y0: start.y,
        x1: goal.x,
        y1: goal.y,
      });
    }
  },
  { flush: 'pre' },
);

/** 飛び終わったカードを外す。入力はブロックしない（トランジションの後始末だけ）。 */
function removeFlight(uid: number): void {
  flying.value = flying.value.filter((f) => f.uid !== uid);
}

function onFlightEntered(el: Element): void {
  const uid = Number((el as HTMLElement).dataset.uid);
  if (!Number.isNaN(uid)) removeFlight(uid);
}

/** 飛び出し位置と着地位置を CSS 変数で渡す（カードごとに独立）。 */
function flightStyle(f: Flight): Record<string, string> {
  return {
    left: `${f.x1}px`,
    top: `${f.y1}px`,
    '--fly-dx': `${f.x0 - f.x1}px`,
    '--fly-dy': `${f.y0 - f.y1}px`,
  };
}

// 所持ジョーカーを MAX_JOKERS 枠ぶん並べる（空きは空スロット）。
// 光った札は搬入ごとに key を変えて作り直し、フラッシュを一度だけ再生する。
const jokerSlots = computed(() =>
  Array.from({ length: MAX_JOKERS }, (_, i) => {
    const inst = props.run.jokers[i];
    if (!inst) return { key: `empty-${i}`, def: null, fired: false, index: i };
    const def = jokerDef(inst.defId);
    const isFired = fired.value.has(def.name);
    return {
      key: `${i}-${def.id}-${isFired ? scoreSeq.value : 0}`,
      def,
      fired: isFired,
      index: i,
    };
  }),
);

// 採点の演出中だけ、バーを「採点直前の売上」から現在値まで伸ばす。
const barFrom = computed(() =>
  props.blind.lastScore
    ? props.blind.revenue - props.blind.lastScore.revenue
    : null,
);
</script>

<template>
  <div ref="bdRef" class="bd">
    <div class="bd-top">
      <div>
        <div class="bd-day">{{ props.run.day }}日目 {{ timeLabel(props.run.blindIndex) }}</div>
        <div class="bd-meta">残り手札 {{ props.blind.handsLeft }} ・ 捨て札 {{ props.blind.discardsLeft }}</div>
      </div>
      <div class="bd-goal">
        <div class="l">目標</div>
        <div class="n">{{ props.blind.def.goal }}<span>万円</span></div>
      </div>
    </div>
    <ProgressBar
      :key="scoreSeq"
      :current="props.blind.revenue"
      :goal="props.blind.def.goal"
      :from="barFrom"
    />
    <div class="bar-l">
      <span>売上 {{ props.blind.revenue }}万円</span>
      <span>あと {{ remaining }}万円</span>
    </div>

    <ScoreStage :score="props.blind.lastScore" :seq="scoreSeq" />

    <TransitionGroup name="hand" tag="div" class="hand" appear>
      <HandCard
        v-for="(card, i) in props.blind.hand"
        :key="card.id"
        :card="card"
        :selected="props.blind.selected.includes(card.id)"
        :style="{ '--i': i }"
      />
    </TransitionGroup>

    <div class="foot">
      <div class="jrow">
        <Transition
          v-for="slot in jokerSlots"
          :key="slot.key"
          name="joker"
          appear
        >
          <JokerChip :def="slot.def" :fired="slot.fired" :index="slot.index" />
        </Transition>
      </div>
      <div class="btns">
        <template v-if="props.blind.status === 'playing'">
          <button type="button" class="btn btn-primary" data-action="play">搬入</button>
          <button type="button" class="btn btn-secondary" data-action="discard">捨てる</button>
        </template>
        <button type="button" v-else class="btn btn-primary" data-action="settle">締める</button>
      </div>
    </div>
    <div v-if="bossName" class="boss">{{ bossName }}</div>

    <TransitionGroup
      name="fly"
      tag="div"
      class="fly-layer"
      @after-enter="onFlightEntered"
    >
      <div
        v-for="f in flying"
        :key="f.uid"
        class="fly-card"
        :data-uid="f.uid"
        :style="flightStyle(f)"
      >
        <HandCard :card="f.card" :interactive="false" />
      </div>
    </TransitionGroup>
  </div>
</template>
