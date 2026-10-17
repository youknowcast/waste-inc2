<script setup lang="ts">
import { computed } from 'vue';
import { blindAt, bossLabel, bossText } from '../../data/blinds.ts';
import { jokerDef } from '../../data/jokers.ts';
import { MAX_JOKERS } from '../../game/constants.ts';
import type { RunState } from '../../game/run.ts';
import JokerChip from './JokerChip.vue';
import { timeLabel } from './labels.ts';

const props = defineProps<{
  run: RunState;
}>();

// 元請選択の3便。締切（3便目）だけ元請名と縛り文を出す。
const rows = computed(() =>
  ([0, 1, 2] as const).map((i) => {
    const def = blindAt(props.run.day, i);
    return {
      key: `d${def.day}-${def.index}`,
      isBoss: i === 2,
      tag: timeLabel(i),
      name: def.name,
      bossName: def.bossId ? bossLabel(def.bossId) : null,
      rule: def.bossId ? bossText(def.bossId) : null,
      goal: def.goal,
    };
  }),
);

// 所持ジョーカーを MAX_JOKERS 枠ぶん並べる（空きは空スロット）。
const jokerSlots = computed(() =>
  Array.from({ length: MAX_JOKERS }, (_, i) => {
    const inst = props.run.jokers[i];
    return inst ? jokerDef(inst.defId) : null;
  }),
);
</script>

<template>
  <div class="blinds-screen">
    <div class="screen-title">元請の選択（{{ props.run.day }}日目）</div>
    <div class="blinds-list">
      <div
        v-for="row in rows"
        :key="row.key"
        :class="['blind-row', { 'boss-row': row.isBoss }]"
      >
        <span class="tag">{{ row.tag }}</span>
        <span class="name">
          {{ row.name }}
          <span v-if="row.bossName" class="boss-name">{{ row.bossName }}</span>
          <span v-if="row.rule" class="rule">{{ row.rule }}</span>
        </span>
        <span class="amt">{{ row.goal }}万円</span>
      </div>
    </div>
    <div class="status-bar">
      <span>所持金 <b>{{ props.run.money }}万円</b></span>
      <div class="jrow">
        <template v-for="(slot, i) in jokerSlots" :key="i">
          <JokerChip v-if="slot" :def="slot" />
          <div v-else class="jc empty"></div>
        </template>
      </div>
    </div>
    <div class="btns">
      <button type="button" class="btn btn-primary" data-action="openBlind">次の便を始める</button>
    </div>
  </div>
</template>
