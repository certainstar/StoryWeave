<script setup lang="ts">
import type { OverviewStat } from "./overviewHelpers"

defineProps<{ items: OverviewStat[] }>()
</script>

<template>
  <div class="stats overview-stats">
    <div v-for="item in items" :key="item.label" class="stat">
      <b>{{ item.value }}</b>
      <span>{{ item.label }}</span>
    </div>
  </div>
</template>