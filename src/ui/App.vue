<script setup lang="ts">
import { computed } from 'vue';
import BlindsScreen from './components/BlindsScreen.vue';
import BoardScreen from './components/BoardScreen.vue';
import CashoutScreen from './components/CashoutScreen.vue';
import ResultScreen from './components/ResultScreen.vue';
import RulesScreen from './components/RulesScreen.vue';
import ShopScreen from './components/ShopScreen.vue';
import TitleScreen from './components/TitleScreen.vue';
import { useGame } from './store.ts';

const { state, tick } = useGame();

const fxClass = computed(() => (state.fx ? `fx-${state.fx}` : ''));

// 元の実装は毎回 innerHTML を差し替えていた（style.css の演出コメント参照）。
// その描画単位をそのまま保つため、dispatch ごとに増える tick を key に使い、
// 画面を作り直す。演出が1回で止まること・選択時に transition が走らないことは
// この「毎回作り直す」性質に依存している。
// 右上の2ボタンの key も同じ理由で残す（vue-task-2-report.md §11.7）。
</script>

<template>
  <div class="app-wrap" :class="fxClass">
    <button type="button" class="sound-toggle" data-action="toggleSound" aria-label="音のON/OFF" :key="`sound-${tick}`">{{ state.soundOn ? '🔊' : '🔇' }}</button>
    <button type="button" v-if="state.screen !== 'rules'" class="help-toggle" data-action="openRules" aria-label="あそびかた" :key="`help-${tick}`">？</button>
    <BoardScreen v-if="state.screen === 'board' && state.blind" :key="tick" :run="state.run" :blind="state.blind" :fx="state.fx" />
    <TitleScreen v-else-if="state.screen === 'board' || state.screen === 'title'" :key="tick" :seed="state.run.seed" />
    <BlindsScreen v-else-if="state.screen === 'blinds'" :key="tick" :run="state.run" />
    <CashoutScreen v-else-if="state.screen === 'cashout' && state.payout" :key="tick" :run="state.run" :payout="state.payout" />
    <ShopScreen v-else-if="state.screen === 'shop' && state.shop" :key="tick" :run="state.run" :shop="state.shop" />
    <ResultScreen v-else-if="state.screen === 'result'" :key="tick" :run="state.run" />
    <RulesScreen v-else-if="state.screen === 'rules'" :key="tick" />
  </div>
</template>
