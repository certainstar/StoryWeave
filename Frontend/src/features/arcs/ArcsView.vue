<script setup lang="ts">
import { computed, useTemplateRef } from "vue"
import { handleGridArrowKey } from "../../domain/gridKeyboard"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import ArcLaneCard from "./ArcLaneCard.vue"
import { sortArcs } from "./arcsHelpers"
import { useArcListReorder } from "./useArcReorder"

const store = useWorkspace()
const list = useTemplateRef("list")
const sorted = computed(() => sortArcs(store.arcs))

const laneReorder = useArcListReorder(
  () => sorted.value.map((arc) => arc.id),
  (ids) => store.applyArcOrder(ids),
)

function onListKey(event: KeyboardEvent) {
  const el = list.value
  if (!el) return
  const current = store.selection?.kind === "arc" ? store.selection.id : undefined
  handleGridArrowKey(event, sorted.value.map((arc) => arc.id), current, 1, (id) => {
    store.select({ kind: "arc", id })
    el.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  })
}

function onArcEventsReorder(arcId: string, eventIds: string[]) {
  void store.setArcEvents(arcId, eventIds)
}
</script>

<template>
  <PageHead view="arcs" :meta="`${store.arcs.length} 条故事线`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createArc()">新建故事线</button>
    <span class="timeline-drag-hint">拖故事线左侧把手排序；子事件卡片可左右拖动</span>
  </div>
  <p v-if="!sorted.length" class="empty">还没有故事线。</p>
  <div v-else ref="list" class="arc-list" tabindex="0" aria-label="故事线列表" @keydown="onListKey">
    <ArcLaneCard
      v-for="(arc, index) in sorted"
      :key="arc.id"
      :lane-index="index"
      :arc="arc"
      :events="store.events"
      :selected="store.selection?.kind === 'arc' && store.selection.id === arc.id"
      :lane-dragging="laneReorder.isDragging(arc.id)"
      :lane-drop-target="laneReorder.isOver(arc.id)"
      @select="store.select({ kind: 'arc', id: arc.id })"
      @lane-handle-pointer-down="(e) => laneReorder.beginDrag(arc.id, e)"
      @arc-events-reorder="(ids) => onArcEventsReorder(arc.id, ids)"
    />
  </div>
</template>