<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { bossLabel } from '../../data/blinds.ts';
import { jokerDef } from '../../data/jokers.ts';
import { MAX_JOKERS } from '../../game/constants.ts';
import type { BlindState, RunState } from '../../game/run.ts';
import type { ScoreBreakdown } from '../../game/score.ts';
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

let seenScore: ScoreBreakdown | null = props.blind.lastScore;

// 手札が変わったとき、lastScore も変わっていれば「搬入」とみなして演出を 1 回だけ起こす。
// 捨て札・配り直しは lastScore が変わらないので演出しない。
watch(
  () => props.blind.hand,
  () => {
    const score = props.blind.lastScore;
    if (!score || score === seenScore) return;
    seenScore = score;
    scoreSeq.value++;
  },
);

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
  <div class="bd">
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
  </div>
</template>
