<script setup lang="ts">
import { computed } from 'vue';
import type { ScoreBreakdown } from '../../game/score.ts';
import { BASE_SCORE_LINES, jokerLineText } from './score-lines.ts';

const props = defineProps<{
  score: ScoreBreakdown | null;
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
  <div v-if="props.score" class="stage">
    <span class="pf pf-weight">重さ {{ props.score.weight }}t</span>
    <span class="op">×</span>
    <span class="pf pf-mult">単価 {{ props.score.mult }}</span>
    <span class="op">=</span>
    <span class="res">{{ props.score.revenue }}万円</span>
  </div>
  <div v-else class="stage quiet"><span>役を作って「搬入」</span></div>
  <div v-if="props.score" class="score-detail" v-html="detailHtml"></div>
</template>
