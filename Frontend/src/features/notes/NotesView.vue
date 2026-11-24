<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue"
import { estimateGridColumns, handleGridArrowKey } from "../../domain/gridKeyboard"
import { reorderIds } from "../../domain/reorder"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import NoteCard from "./NoteCard.vue"
import { sortNotes } from "./noteHelpers"

const store = useWorkspace()
const grid = useTemplateRef("grid")
const dragId = ref("")
const sorted = computed(() => sortNotes(store.notes))

function onGridKey(event: KeyboardEvent) {
  const el = grid.value
  if (!el) return
  const cols = estimateGridColumns(el, 220, 10)
  const current = store.selection?.kind === "note" ? store.selection.id : undefined
  handleGridArrowKey(event, sorted.value.map((note) => note.id), current, cols, (id) => {
    store.select({ kind: "note", id })
    el.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  })
}

function onDrop(targetId: string) {
  if (!dragId.value || dragId.value === targetId) return
  const ids = sorted.value.map((note) => note.id)
  const from = ids.indexOf(dragId.value)
  const to = ids.indexOf(targetId)
  dragId.value = ""
  void store.applyNoteOrder(reorderIds(ids, from, to))
}
</script>

<template>
  <PageHead view="notes" :meta="`${store.notes.length} 条笔记`" />
  <p v-if="!sorted.length" class="empty">还没有笔记。点右下角「新建」即可。</p>
  <div v-else ref="grid" class="note-grid" tabindex="0" aria-label="笔记列表" @keydown="onGridKey">
    <NoteCard
      v-for="note in sorted"
      :key="note.id"
      :data-id="note.id"
      :note="note"
      :selected="store.selection?.kind === 'note' && store.selection.id === note.id"
      :dragging="dragId === note.id"
      @select="store.select({ kind: 'note', id: note.id })"
      @drag-start="dragId = note.id"
      @drag-end="dragId = ''"
      @drop="onDrop(note.id)"
    />
  </div>
</template>