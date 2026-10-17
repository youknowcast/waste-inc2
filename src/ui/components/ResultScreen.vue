<script setup lang="ts">
import { computed } from 'vue';
import { RANK_A_MIN, RANK_S_MIN } from '../../game/constants.ts';
import type { RunState } from '../../game/run.ts';
import OwnedJokers from './OwnedJokers.vue';

const props = defineProps<{
  run: RunState;
}>();

// 突破した便の数。敗北時は進行中の便を含めず、その日の blindIndex まで数える。
const cleared = computed(
  () =>
    (props.run.day - 1) * 3 +
    (props.run.result === 'lost' ? props.run.blindIndex : 0),
);

const rank = computed(() =>
  props.run.totalRevenue < RANK_A_MIN
    ? 'B'
    : props.run.totalRevenue < RANK_S_MIN
      ? 'A'
      : 'S',
);
</script>

<template>
  <div class="result-screen">
    <div class="screen-title">リザルト</div>
    <div class="result-rank">ランク <b>{{ rank }}</b></div>
    <div class="result-summary">
      <div class="line"><span>総売上</span><span>{{ props.run.totalRevenue }}万円</span></div>
      <div class="line"><span>残金</span><span>{{ props.run.money }}万円</span></div>
      <div class="line"><span>突破した便</span><span>{{ cleared }}／9</span></div>
      <div class="line"><span>シード</span><span>{{ props.run.seed }}</span></div>
    </div>
    <div v-if="props.run.result === 'lost'" class="result-fate">解散</div>
    <div class="owned-list">
      <OwnedJokers :run="props.run" :sellable="false" />
    </div>
    <div class="btns">
      <button type="button" class="btn btn-primary" data-action="newRun" :data-seed="props.run.seed">もう一度</button>
    </div>
  </div>
</template>
