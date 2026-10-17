<script setup lang="ts">
import { computed } from 'vue';
import { jokerDef } from '../../data/jokers.ts';
import { jokerSellBonus } from '../../game/jokers.ts';
import type { RunState } from '../../game/run.ts';
import { sellValue } from '../../game/shop.ts';
import JokerChip from './JokerChip.vue';

const props = defineProps<{
  run: RunState;
  sellable?: boolean;
}>();

const sellable = computed(() => props.sellable ?? true);

const entries = computed(() =>
  props.run.jokers.map((j, i) => {
    const def = jokerDef(j.defId);
    return {
      index: i,
      def,
      value: sellValue(def, jokerSellBonus(props.run)),
    };
  }),
);
</script>

<template>
  <template v-if="props.run.jokers.length > 0">
    <div class="owned-title">所持ジョーカー</div>
    <div class="owned-list">
      <div v-for="entry in entries" :key="entry.index" class="owned-joker">
        <JokerChip :def="entry.def" />
        <button
          v-if="sellable"
          type="button"
          class="btn btn-secondary"
          data-action="sell"
          :data-index="entry.index"
        >
          売る {{ entry.value }}万円
        </button>
      </div>
    </div>
  </template>
</template>
