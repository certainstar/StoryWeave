<script setup lang="ts">
import type { StoryArc, StoryEvent } from "../../domain/types"
import { useInspector } from "../shell/inspectorContext"
import { eventTitle } from "./arcsHelpers"
import { useArcChipReorder } from "./useArcReorder"

const inspector = useInspector()

const props = defineProps<{
  arc: StoryArc
  events: StoryEvent[]
  selected: boolean
  laneIndex?: number
  laneDragging?: boolean
  laneDropTarget?: boolean
}>()

const emit = defineEmits<{
  select: []
  laneHandlePointerDown: [event: PointerEvent]
  arcEventsReorder: [eventIds: string[]]
}>()

function openDetail() {
  emit("select")
  inspector.open()
}

const chipReorder = useArcChipReorder(
  props.arc.id,
  () => props.arc.eventIds,
  (ids) => emit("arcEventsReorder", ids),
)
</script>

<template>
  <article
    class="card arc-lane surface-no-select"
    :style="laneIndex !== undefined ? { '--lane-i': laneIndex } : undefined"
    :class="{
      'is-selected': selected,
      'is-dragging': laneDragging,
      'is-drop-target': laneDropTarget,
    }"
    :data-id="arc.id"
    tabindex="0"
    :aria-selected="selected"
    @click="emit('select')"
    @dblclick.prevent="openDetail"
    @keydown.enter.prevent="emit('select')"
  >
    <header class="arc-head">
      <div class="arc-head-main">
        <button
          class="arc-drag-handle"
          type="button"
          :aria-label="`拖动调整故事线 ${arc.title} 顺序`"
          @pointerdown.stop="emit('laneHandlePointerDown', $event)"
        >
          ≡
        </button>
        <div>
          <h2>{{ arc.title }}</h2>
          <span class="arc-kind">{{ arc.kind }}</span>
        </div>
      </div>
      <span class="arc-count">{{ arc.eventIds.length }} 个事件</span>
    </header>
    <p class="lede">{{ arc.summary || "还没有简介。" }}</p>
    <p v-if="!arc.eventIds.length" class="empty">还没有挂载事件。在详情面板可把事件加入此线。</p>
    <div v-else class="arc-scroll" role="list" :data-arc-scroll="arc.id">
      <div
        v-for="(id, index) in arc.eventIds"
        :key="id"
        class="arc-chip"
        :data-arc-id="arc.id"
        :data-event-id="id"
        role="listitem"
        :class="{
          'is-dragging': chipReorder.isChipDragging(id),
          'is-drop-target': chipReorder.isChipOver(id),
        }"
        @pointerdown.stop="chipReorder.beginChipDrag(id, $event)"
      >
        <span class="arc-step">第 {{ index + 1 }} 节</span>
        <strong>{{ eventTitle(id, events) }}</strong>
      </div>
    </div>
  </article>
</template>