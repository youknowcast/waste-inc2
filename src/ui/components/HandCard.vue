<script setup lang="ts">
import {
  itemName,
  rankLabel,
  rankValue,
  SUIT_COLOR,
  SUIT_MARK,
} from '../../game/cards.ts';
import type { Card } from '../../game/types.ts';

const props = withDefaults(
  defineProps<{
    card: Card;
    selected?: boolean;
    /** 飛行中の見た目だけのカードなど、操作させたくないときに false。 */
    interactive?: boolean;
  }>(),
  { interactive: true },
);
</script>

<template>
  <div
    class="hc"
    :style="{ borderColor: SUIT_COLOR[props.card.suit] }"
    :data-action="props.interactive ? 'toggleCard' : undefined"
    :data-card="props.card.id"
    :data-selected="props.selected ? 'true' : undefined"
  >
    <div class="r">{{ rankLabel(props.card.rank) }}</div>
    <div class="n">{{ itemName(props.card) }}</div>
    <div class="w">{{ SUIT_MARK[props.card.suit] }} {{ rankValue(props.card.rank) }}t</div>
  </div>
</template>
