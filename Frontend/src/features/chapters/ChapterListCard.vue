<script setup lang="ts">
import type { Chapter } from "../../domain/types"

defineProps<{
  chapter: Chapter
  selected: boolean
  dragging: boolean
}>()

const emit = defineEmits<{
  select: []
  dragStart: []
  dragEnd: []
  drop: []
}>()
</script>

<template>
  <button
    class="chapter-card"
    type="button"
    :data-id="chapter.id"
    draggable="true"
    :class="{ 'is-dragging': dragging }"
    :aria-selected="selected"
    @click="emit('select')"
    @dragstart="emit('dragStart')"
    @dragend="emit('dragEnd')"
    @dragover.prevent
    @drop.prevent="emit('drop')"
  >
    <span class="chapter-index">第 {{ chapter.sortOrder }} 章</span>
    <strong>{{ chapter.title }}</strong>
    <span class="lede">{{ chapter.status }} · {{ chapter.summary || "没有摘要" }}</span>
  </button>
</template>