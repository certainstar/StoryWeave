<script setup lang="ts">
defineProps<{ hint: string }>()
</script>

<template>
  <h2>详情</h2>
  <p class="empty">{{ hint }}</p>
</template>