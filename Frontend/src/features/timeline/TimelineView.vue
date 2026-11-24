<script setup lang="ts">
import { computed, useTemplateRef } from "vue"
import { handleGridArrowKey } from "../../domain/gridKeyboard"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import TimelineEventCard from "./TimelineEventCard.vue"
import { useTimelineReorder } from "./useTimelineReorder"

const store = useWorkspace()
const list = useTemplateRef("list")
const sorted = computed(() => [...store.events].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)))

const reorder = useTimelineReorder(
  () => sorted.value.map((event) => event.id),
  (ids) => store.applyEventOrder(ids),
)

function onListKey(event: KeyboardEvent) {
  const el = list.value
  if (!el) return
  const current = store.selection?.kind === "event" ? store.selection.id : undefined
  handleGridArrowKey(event, sorted.value.map((item) => item.id), current, 1, (id) => {
    store.select({ kind: "event", id })
    el.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  })
}
</script>

<template>
  <PageHead view="timeline" :meta="`${store.events.length} 个事件`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createEvent()">新增事件</button>
    <span class="timeline-drag-hint">拖左侧序号调整顺序（或按住 Alt 拖卡片）</span>
  </div>
  <p v-if="store.narrativeMismatch" class="lede timeline-note">{{ store.narrativeMismatch }}</p>
  <ol
    ref="list"
    class="timeline timeline-ink"
    tabindex="0"
    aria-label="事件时间线"
    @keydown="onListKey"
  >
    <TimelineEventCard
      v-for="(event, index) in sorted"
      :key="event.id"
      :event="event"
      :index="index"
      :characters="store.characters"
      :chapters="store.chapters"
      :selected="store.selection?.kind === 'event' && store.selection.id === event.id"
      :dragging="reorder.isDragging(event.id)"
      :drop-target="reorder.isOver(event.id)"
      @select="store.select({ kind: 'event', id: event.id })"
      @handle-pointer-down="(e) => reorder.onHandlePointerDown(event.id, e)"
      @card-pointer-down="(e) => reorder.onCardPointerDown(event.id, e)"
      @move="(delta) => store.moveEvent(event.id, delta)"
    />
  </ol>
</template>