<script setup lang="ts">
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { useInspector } from "../shell/inspectorContext"
import type { Chapter, Character, StoryEvent } from "../../domain/types"
import { formatEventPeople, firstChapterForEvent, formatNarrativeAnchor } from "./timelineHelpers"

defineProps<{
  event: StoryEvent
  index: number
  selected: boolean
  dragging: boolean
  dropTarget: boolean
  characters: Character[]
  chapters: Chapter[]
}>()

const emit = defineEmits<{
  select: []
  move: [delta: -1 | 1]
  handlePointerDown: [event: PointerEvent]
  cardPointerDown: [event: PointerEvent]
}>()

const inspector = useInspector()

const anchor = (event: StoryEvent, chapters: Chapter[]) =>
  formatNarrativeAnchor(firstChapterForEvent(event.id, chapters))

function openDetail() {
  emit("select")
  inspector.open()
}
</script>

<template>
  <li
    class="timeline-node timeline-node-anim"
    :data-id="event.id"
    :style="{ '--i': index }"
    :class="{ 'is-dragging': dragging, 'is-selected': selected, 'is-drop-target': dropTarget }"
  >
    <div class="timeline-side">
      <button
        class="timeline-drag-handle timeline-order"
        type="button"
        :aria-label="`拖动调整第 ${index + 1} 个事件顺序`"
        @pointerdown.stop="emit('handlePointerDown', $event)"
      >
        {{ index + 1 }}
      </button>
      <div class="rail" aria-hidden="true"><span class="dot"></span></div>
    </div>
    <article
      class="timeline-card surface-no-select"
      tabindex="0"
      @click="emit('select')"
      @dblclick.prevent="openDetail"
      @pointerdown="emit('cardPointerDown', $event)"
    >
      <header>
        <span class="when">{{ event.storyTime || "未知时间" }}</span>
        <strong>{{ event.title }}</strong>
      </header>
      <p class="lede">{{ event.description || "没有说明。" }}</p>
      <p class="lede timeline-meta">
        {{ formatEventPeople(event.participants.map((item) => item.characterId), characters) }}
        ·
        {{ anchor(event, chapters) }}
      </p>
      <div class="toolbar toolbar-icons">
        <UiTooltip label="上移">
          <button class="icon-btn" type="button" aria-label="上移" @click.stop="emit('move', -1)">
            <AppIcon name="chevron-up" :size="16" />
          </button>
        </UiTooltip>
        <UiTooltip label="下移">
          <button class="icon-btn" type="button" aria-label="下移" @click.stop="emit('move', 1)">
            <AppIcon name="chevron-down" :size="16" />
          </button>
        </UiTooltip>
      </div>
    </article>
  </li>
</template>