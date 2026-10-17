<script setup lang="ts">
import type { JokerDef } from '../../data/jokers.ts';

const props = defineProps<{
  def: JokerDef | null;
  fired?: boolean;
  /** 光りの順番（スロット位置）。CSS の --i に渡す。 */
  index?: number;
}>();
</script>

<template>
  <div
    :class="{ jc: true, 'jc-fired': props.fired, empty: !props.def }"
    :style="props.index === undefined ? undefined : { '--i': props.index }"
  >
    <template v-if="props.def">
      <div class="jn">{{ props.def.name }}</div>
      <!-- 効果テキストは <b> 等のマークアップ前提（style.css の .jc .je b）。
           盤面・ショップ・あそびかたで同じ描画規則にするため v-html で描く。 -->
      <div class="je" v-html="props.def.text"></div>
    </template>
  </div>
</template>
