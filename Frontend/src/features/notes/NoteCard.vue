<script setup lang="ts">
import type { Note } from "../../domain/types"
import { useInspector } from "../shell/inspectorContext"
import { formatNoteTags, notePreview } from "./noteHelpers"

const inspector = useInspector()

defineProps<{
  note: Note
  selected: boolean
  dragging: boolean
}>()

const emit = defineEmits<{
  select: []
  dragStart: []
  dragEnd: []
  drop: []
}>()

function openDetail() {
  emit("select")
  inspector.open()
}
</script>

<template>
  <article
    class="note-card"
    tabindex="0"
    draggable="true"
    :class="{ 'is-dragging': dragging }"
    :aria-selected="selected"
    @click="emit('select')"
    @dblclick.prevent="openDetail"
    @keydown.enter.prevent="emit('select')"
    @dragstart="emit('dragStart')"
    @dragend="emit('dragEnd')"
    @dragover.prevent
    @drop.prevent="emit('drop')"
  >
    <header>
      <h2>{{ note.title }}</h2>
      <span class="note-tags">{{ formatNoteTags(note.tags) }}</span>
    </header>
    <p class="note-body">{{ notePreview(note.content) }}</p>
  </article>
</template>