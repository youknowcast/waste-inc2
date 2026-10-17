<script setup lang="ts">
import { computed } from 'vue';
import BoardScreen from './components/BoardScreen.vue';
import { renderScreenHtml } from './render.ts';
import { useGame } from './store.ts';

const { state, tick } = useGame();

const fxClass = computed(() => (state.fx ? `fx-${state.fx}` : ''));
const screenHtml = computed(() => renderScreenHtml(state));

// 元の実装は毎回 innerHTML を差し替えていた（style.css の演出コメント参照）。
// その描画単位をそのまま保つため、dispatch ごとに増える tick を key に使い、
// 画面を作り直す。演出が1回で止まること・選択時に transition が走らないことは
// この「毎回作り直す」性質に依存している。
</script>

<template>
  <div class="app-wrap" :class="fxClass">
    <button type="button" class="sound-toggle" data-action="toggleSound" aria-label="音のON/OFF">{{ state.soundOn ? '🔊' : '🔇' }}</button>
    <button type="button" v-if="state.screen !== 'rules'" class="help-toggle" data-action="openRules" aria-label="あそびかた">？</button>
    <BoardScreen v-if="state.screen === 'board' && state.blind" :key="tick" :run="state.run" :blind="state.blind" :fx="state.fx" />
    <div v-else :key="tick" v-html="screenHtml"></div>
  </div>
</template>
