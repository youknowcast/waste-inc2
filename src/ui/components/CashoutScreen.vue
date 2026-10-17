<script setup lang="ts">
import type { Payout, RunState } from '../../game/run.ts';

const props = defineProps<{
  run: RunState;
  payout: Payout;
}>();
</script>

<template>
  <div class="cashout-screen">
    <div class="screen-title">精算</div>
    <div class="receipt">
      <div class="line"><span>報酬</span><span>{{ props.payout.reward }}万円</span></div>
      <div class="line"><span>手数ボーナス</span><span>{{ props.payout.handBonus }}万円</span></div>
      <div class="line"><span>利息</span><span>{{ props.payout.interest }}万円</span></div>
      <div class="line total"><span>合計</span><span>{{ props.payout.total }}万円</span></div>
    </div>
    <div class="status-bar">所持金 <b>{{ props.run.money }}万円</b></div>
    <div class="btns">
      <button type="button" class="btn btn-primary" data-action="next">次へ</button>
    </div>
  </div>
</template>
