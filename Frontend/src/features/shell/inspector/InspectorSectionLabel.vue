<script setup lang="ts">
defineProps<{ text: string }>()
</script>

<template>
  <p class="field-label">{{ text }}</p>
</template>