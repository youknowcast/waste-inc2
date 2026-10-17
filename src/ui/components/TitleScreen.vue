<script setup lang="ts">
const props = defineProps<{
  seed: string;
}>();
</script>

<template>
  <div class="title-screen">
    <h1>WASTE INC. II</h1>
    <p class="slug">waste-inc2</p>
    <p>産業廃棄物ローグライク</p>
    <button type="button" class="btn btn-primary" data-action="newRun" :data-seed="props.seed">はじめる</button>
    <button type="button" class="btn btn-secondary btn-rules" data-action="openRules">あそびかた</button>
  </div>
</template>
