<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { BlindState } from '../game/run.ts';
import BlindsScreen from './components/BlindsScreen.vue';
import BoardScreen from './components/BoardScreen.vue';
import CashoutScreen from './components/CashoutScreen.vue';
import ResultScreen from './components/ResultScreen.vue';
import RulesScreen from './components/RulesScreen.vue';
import ShopScreen from './components/ShopScreen.vue';
import TitleScreen from './components/TitleScreen.vue';
import { useGame } from './store.ts';

const { state } = useGame();

// 演出は Vue の DOM の同一性に任せる（状態が変わった箇所だけが動く）。
// 元の「毎回 innerHTML を差し替える」描画単位を再現する tick と、
// その都合で必要だった右上ボタンの key は撤去した（vue-task-4-report.md §1）。

/**
 * 配る演出は「便が新しく始まったとき」だけ走らせる。
 * 盤面はあそびかたの開閉で作り直される（v-if）ため、再マウント時に
 * lastScore が残っていても演出を再生しないよう、最後に配った便を覚えておく。
 * `flush: 'post'` なのは、openBlind 直後の描画ではまだ未記録（＝配る）で、
 * 描画後に記録するため。
 */
const dealtBlind = ref<BlindState | null>(null);
watch(
  () => state.blind,
  (blind) => {
    dealtBlind.value = blind;
  },
  { flush: 'post' },
);
const dealAppear = computed(
  () => state.blind !== null && state.blind !== dealtBlind.value,
);
</script>

<template>
  <div class="app-wrap">
    <button type="button" class="sound-toggle" data-action="toggleSound" aria-label="音のON/OFF">{{ state.soundOn ? '🔊' : '🔇' }}</button>
    <button type="button" v-if="state.screen !== 'rules'" class="help-toggle" data-action="openRules" aria-label="あそびかた">？</button>
    <BoardScreen v-if="state.screen === 'board' && state.blind" :run="state.run" :blind="state.blind" :deal-appear="dealAppear" />
    <TitleScreen v-else-if="state.screen === 'board' || state.screen === 'title'" :seed="state.run.seed" />
    <BlindsScreen v-else-if="state.screen === 'blinds'" :run="state.run" />
    <CashoutScreen v-else-if="state.screen === 'cashout' && state.payout" :run="state.run" :payout="state.payout" />
    <ShopScreen v-else-if="state.screen === 'shop' && state.shop" :run="state.run" :shop="state.shop" />
    <ResultScreen v-else-if="state.screen === 'result'" :run="state.run" />
    <RulesScreen v-else-if="state.screen === 'rules'" />
  </div>
</template>
