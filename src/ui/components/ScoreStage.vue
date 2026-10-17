<script setup lang="ts">
import { computed } from 'vue';
import type { ScoreBreakdown } from '../../game/score.ts';
import { BASE_SCORE_LINES, jokerLineText } from './score-lines.ts';

const props = defineProps<{
  score: ScoreBreakdown | null;
  /** 搬入のたびに増える連番。key に使って演出を一度だけ再生する。 */
  seq?: number;
  /** この盤面をマウントしてから搬入が起きたか。再マウントでは false。 */
  live?: boolean;
}>();

/** 内訳の先頭は役の呼称、以降は効いたジョーカーの行（` ／ ` 区切り）。 */
const detailHtml = computed(() => {
  const score = props.score;
  if (!score) return '';
  const handLabel = score.lines[0]?.label ?? '';
  const jokerLines = score.lines.slice(BASE_SCORE_LINES);
  const details = [
    handLabel,
    ...jokerLines.map(
      (line) => `<span class="hl">${jokerLineText(line)}</span>`,
    ),
  ];
  return details.join(' ／ ');
});
</script>

<template>
  <div v-if="props.score" :key="props.seq ?? 0" class="stage">
    <Transition name="pf-pop" :appear="props.live">
      <span class="pf pf-weight">重さ {{ props.score.weight }}t</span>
    </Transition>
    <span class="op">×</span>
    <Transition name="pf-pop" :appear="props.live">
      <span class="pf pf-mult">単価 {{ props.score.mult }}</span>
    </Transition>
    <span class="op">=</span>
    <Transition name="res-pop" :appear="props.live">
      <span class="res">{{ props.score.revenue }}万円</span>
    </Transition>
  </div>
  <div v-else class="stage quiet"><span>役を作って「搬入」</span></div>
  <Transition name="detail-in" :appear="props.live">
    <div
      v-if="props.score"
      :key="props.seq ?? 0"
      class="score-detail"
      v-html="detailHtml"
    ></div>
  </Transition>
</template>
