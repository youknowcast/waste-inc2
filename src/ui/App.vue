<script setup lang="ts">
import { computed } from 'vue';
import BoardScreen from './components/BoardScreen.vue';
import { renderScreenHtml } from './render.ts';
import { useGame } from './store.ts';

const { state } = useGame();

const fxClass = computed(() => (state.fx ? `fx-${state.fx}` : ''));
const screenHtml = computed(() => renderScreenHtml(state));
</script>

<template>
  <div class="app-wrap" :class="fxClass">
    <button class="sound-toggle" data-action="toggleSound" aria-label="音のON/OFF">{{ state.soundOn ? '🔊' : '🔇' }}</button>
    <button v-if="state.screen !== 'rules'" class="help-toggle" data-action="openRules" aria-label="あそびかた">？</button>
    <BoardScreen v-if="state.screen === 'board' && state.blind" :run="state.run" :blind="state.blind" :fx="state.fx" />
    <div v-else v-html="screenHtml"></div>
  </div>
</template>
