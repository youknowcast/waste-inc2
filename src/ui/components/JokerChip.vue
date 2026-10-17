<script setup lang="ts">
import type { JokerDef } from '../../data/jokers.ts';

const props = defineProps<{
  def: JokerDef;
  fired?: boolean;
}>();
</script>

<template>
  <div :class="{ jc: true, 'jc-fired': props.fired }">
    <div class="jn">{{ props.def.name }}</div>
    <div class="je" v-html="props.def.text"></div>
  </div>
</template>
