<script setup lang="ts">
import { computed } from 'vue';
import { jokerDef } from '../../data/jokers.ts';
import { MAX_JOKERS } from '../../game/constants.ts';
import { jokerRerollDiscount } from '../../game/jokers.ts';
import type { RunState } from '../../game/run.ts';
import type { ShopState } from '../../game/shop.ts';
import { rerollCost } from '../../game/shop.ts';
import OwnedJokers from './OwnedJokers.vue';

const props = defineProps<{
  run: RunState;
  shop: ShopState;
}>();

const reroll = computed(() =>
  rerollCost(props.shop, jokerRerollDiscount(props.run)),
);
const canReroll = computed(() => props.run.money >= reroll.value);

const offers = computed(() =>
  props.shop.offers.map((offer, i) => ({
    slot: i,
    def: jokerDef(offer.defId),
    price: offer.price,
    affordable:
      props.run.money >= offer.price && props.run.jokers.length < MAX_JOKERS,
  })),
);
</script>

<template>
  <div class="shop-screen">
    <div class="screen-title">ショップ</div>
    <div class="offers">
      <div v-for="offer in offers" :key="offer.slot" class="offer">
        <div class="offer-info">
          <div class="jn">{{ offer.def.name }}</div>
          <div class="je">{{ offer.def.text }}</div>
        </div>
        <div class="offer-buy">
          <span class="price">{{ offer.price }}万円</span>
          <button
            type="button"
            class="btn btn-primary"
            data-action="buy"
            :data-slot="offer.slot"
            :disabled="!offer.affordable"
          >
            買う
          </button>
        </div>
      </div>
    </div>
    <div class="btns">
      <button
        type="button"
        class="btn btn-secondary"
        data-action="reroll"
        :disabled="!canReroll"
      >
        リロール {{ reroll }}万円
      </button>
      <button type="button" class="btn btn-primary" data-action="next">次へ</button>
    </div>
    <div class="status-bar">所持金 <b>{{ props.run.money }}万円</b></div>
    <div class="shop-jokers">
      <OwnedJokers :run="props.run" />
    </div>
  </div>
</template>
