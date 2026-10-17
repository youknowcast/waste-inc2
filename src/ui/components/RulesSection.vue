<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<template>
  <section class="rules-sec">
    <h2>{{ title }}</h2>
    <slot />
  </section>
</template>
