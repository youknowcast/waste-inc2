<script setup lang="ts">
import { computed } from 'vue';
import { renderApp } from './render.ts';
import { useGame } from './store.ts';

const { state } = useGame();
const html = computed(() => renderApp(state));
</script>

<template>
  <div v-html="html"></div>
</template>
