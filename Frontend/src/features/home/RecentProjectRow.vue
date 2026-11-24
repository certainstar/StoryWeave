<script setup lang="ts">
import type { ProjectSummary } from "../../domain/types"

defineProps<{ item: ProjectSummary }>()

const emit = defineEmits<{ open: []; remove: [] }>()
</script>

<template>
  <div class="recent-row">
    <button class="row-main" type="button" @click="emit('open')">
      <span class="recent-name">{{ item.name }}</span>
      <span class="ws-meta recent-meta">{{ item.description || "没有简介" }}</span>
    </button>
    <button class="btn danger" type="button" @click.stop="emit('remove')">删除</button>
  </div>
</template>