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
 * `from` が指定されている（採点演出中）ときだけ --bar-from / --bar-to を積む。
 * CSS の fx-bar がこの 2 値を読んでバーを伸ばす。
 */
const barStyle = computed(() => {
  const pct = percentOf(props.current, props.goal);
  if (props.from === null || props.from === undefined) {
    return `width:${pct}%`;
  }
  const fromPct = percentOf(props.from, props.goal);
  return `width:${pct}%;--bar-from:${fromPct}%;--bar-to:${pct}%`;
});
</script>

<template>
  <div class="bar"><i :style="barStyle"></i></div>
</template>
