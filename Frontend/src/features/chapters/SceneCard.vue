<script setup lang="ts">
import type { Scene } from "../../domain/types"

defineProps<{
  scene: Scene
  index: number
  selected: boolean
  dragging: boolean
}>()

const emit = defineEmits<{
  select: []
  dragStart: []
  dragEnd: []
  drop: []
  nudge: [delta: -1 | 1]
}>()
</script>

<template>
  <li
    class="scene-card"
    :data-id="scene.id"
    tabindex="0"
    draggable="true"
    :class="{ 'is-dragging': dragging }"
    :aria-selected="selected"
    @click="emit('select')"
    @keydown.enter.prevent="emit('select')"
    @dragstart="emit('dragStart')"
    @dragend="emit('dragEnd')"
    @dragover.prevent
    @drop.prevent="emit('drop')"
  >
    <span class="scene-index">{{ index + 1 }}</span>
    <div class="scene-body">
      <strong>{{ scene.title }}</strong>
      <p class="lede">{{ scene.summary || "还没有摘要。" }}</p>
      <p v-if="scene.storyTime" class="lede scene-when">{{ scene.storyTime }}</p>
      <div class="scene-nudge">
        <button class="btn" type="button" aria-label="前移" @click.stop="emit('nudge', -1)">←</button>
        <button class="btn" type="button" aria-label="后移" @click.stop="emit('nudge', 1)">→</button>
      </div>
    </div>
  </li>
</template>