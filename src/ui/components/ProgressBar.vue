<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  current: number;
  goal: number;
  from?: number | null;
}>();

function percentOf(value: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.floor((value / goal) * 100));
}

/**
 * `from` が指定されている（採点直前の売上がある）ときだけ --bar-from / --bar-to を積む。
 * CSS の fx-bar がこの 2 値を読んでバーを伸ばす。親が採点のたびに key を変えるため、
 * 要素は作り直され、伸びるアニメーションは搬入のたびに一度だけ走る。
 */
const barStyle = computed(() => {
  const pct = percentOf(props.current, props.goal);
  if (props.from === null || props.from === undefined) {
    return `width:${pct}%`;
  }
  const fromPct = percentOf(props.from, props.goal);
  return `width:${pct}%;--bar-from:${fromPct}%;--bar-to:${pct}%`;
});

const animating = computed(() => props.from !== null && props.from !== undefined);
</script>

<template>
  <div class="bar">
    <i :class="{ 'bar-anim': animating }" :style="barStyle"></i>
  </div>
</template>
