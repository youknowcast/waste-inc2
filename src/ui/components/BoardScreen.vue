<script setup lang="ts">
import { computed } from 'vue';
import { bossLabel } from '../../data/blinds.ts';
import { jokerDef } from '../../data/jokers.ts';
import { MAX_JOKERS } from '../../game/constants.ts';
import type { BlindState, RunState } from '../../game/run.ts';
import type { FxKind } from '../app.ts';
import HandCard from './HandCard.vue';
import JokerChip from './JokerChip.vue';
import { timeLabel } from './labels.ts';
import ProgressBar from './ProgressBar.vue';
import ScoreStage from './ScoreStage.vue';
import { firedJokerNames } from './score-lines.ts';

const props = defineProps<{
  run: RunState;
  blind: BlindState;
  fx: FxKind | null;
}>();

const remaining = computed(() =>
  Math.max(0, props.blind.def.goal - props.blind.revenue),
);
const bossName = computed(() =>
  props.blind.def.bossId ? bossLabel(props.blind.def.bossId) : null,
);

// 採点の演出中だけ、バーを「採点直前の売上」から現在値まで伸ばす。
const barFrom = computed(() =>
  props.fx === 'score' && props.blind.lastScore
    ? props.blind.revenue - props.blind.lastScore.revenue
    : null,
);

// 効いたジョーカーの札だけを光らせる。lastScore が無い画面では空集合。
const fired = computed(() =>
  props.blind.lastScore
    ? firedJokerNames(props.blind.lastScore)
    : new Set<string>(),
);

// 所持ジョーカーを MAX_JOKERS 枠ぶん並べる（空きは空スロット）。
const jokerSlots = computed(() =>
  Array.from({ length: MAX_JOKERS }, (_, i) => {
    const inst = props.run.jokers[i];
    if (!inst) return null;
    const def = jokerDef(inst.defId);
    return { def, fired: fired.value.has(def.name) };
  }),
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
      :current="props.blind.revenue"
      :goal="props.blind.def.goal"
      :from="barFrom"
    />
    <div class="bar-l">
      <span>売上 {{ props.blind.revenue }}万円</span>
      <span>あと {{ remaining }}万円</span>
    </div>

    <ScoreStage :score="props.blind.lastScore" />

    <div class="hand">
      <HandCard
        v-for="card in props.blind.hand"
        :key="card.id"
        :card="card"
        :selected="props.blind.selected.includes(card.id)"
      />
    </div>

    <div class="foot">
      <div class="jrow">
        <template v-for="(slot, i) in jokerSlots" :key="i">
          <JokerChip v-if="slot" :def="slot.def" :fired="slot.fired" />
          <div v-else class="jc empty"></div>
        </template>
      </div>
      <div class="btns">
        <template v-if="props.blind.status === 'playing'">
          <button class="btn btn-primary" data-action="play">搬入</button>
          <button class="btn btn-secondary" data-action="discard">捨てる</button>
        </template>
        <button v-else class="btn btn-primary" data-action="settle">締める</button>
      </div>
    </div>
    <div v-if="bossName" class="boss">{{ bossName }}</div>
  </div>
</template>
