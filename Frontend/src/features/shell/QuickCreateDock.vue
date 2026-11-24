<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue"
import { useRoute } from "vue-router"
import type { ViewId } from "../../domain/types"
import { useWorkspace } from "../../stores/workspace"

const DOCK_POS_KEY = "storyweave.create-dock-pos"

const store = useWorkspace()
const route = useRoute()
const open = ref(false)
const dock = useTemplateRef("dock")
const pos = ref<{ x: number; y: number } | null>(null)
const drag = ref({
  pointerId: -1,
  moved: false,
  offsetX: 0,
  offsetY: 0,
  startX: 0,
  startY: 0,
})

type Action = { id: string; label: string; hint: string; run: () => void | Promise<void> }

const view = computed(() => String(route.name ?? "") as ViewId)

const actions = computed<Action[]>(() => {
  const base: Action[] = [
    { id: "character", label: "人物", hint: "立档", run: () => store.createCharacter() },
    { id: "relation", label: "关系", hint: "牵线", run: () => store.beginRelation() },
    { id: "event", label: "事件", hint: "落笔", run: () => store.createEvent() },
    { id: "arc", label: "故事线", hint: "成章", run: () => store.createArc() },
    { id: "chapter", label: "章节", hint: "开卷", run: () => store.createChapter() },
    { id: "note", label: "笔记", hint: "备忘", run: () => store.createNote() },
  ]
  const order: Record<string, string[]> = {
    characters: ["character", "relation", "note"],
    graph: ["relation", "character", "note"],
    timeline: ["event", "chapter", "character"],
    arcs: ["arc", "event", "chapter"],
    chapters: ["chapter", "event", "note"],
    notes: ["note", "chapter", "event"],
    overview: ["character", "event", "chapter", "arc", "relation", "note"],
  }
  const rank = order[view.value] ?? order.overview
  return [...base].sort((a, b) => rank.indexOf(a.id) - rank.indexOf(b.id))
})

const dockStyle = computed(() => {
  if (!pos.value) return undefined
  return {
    left: `${pos.value.x}px`,
    top: `${pos.value.y}px`,
    right: "auto",
    bottom: "auto",
  }
})

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function ensurePosition() {
  const el = dock.value
  if (!el) return
  if (pos.value) return
  const rect = el.getBoundingClientRect()
  pos.value = { x: rect.left, y: rect.top }
}

function savePosition() {
  if (!pos.value) return
  try {
    localStorage.setItem(DOCK_POS_KEY, JSON.stringify(pos.value))
  } catch {
    /* 忽略 */
  }
}

function loadPosition() {
  try {
    const raw = localStorage.getItem(DOCK_POS_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { x?: number; y?: number }
    if (typeof parsed.x === "number" && typeof parsed.y === "number") {
      pos.value = { x: parsed.x, y: parsed.y }
    }
  } catch {
    /* 忽略 */
  }
}

function onFabPointerDown(event: PointerEvent) {
  if (event.button !== 0) return
  ensurePosition()
  if (!pos.value) return
  drag.value = {
    pointerId: event.pointerId,
    moved: false,
    offsetX: event.clientX - pos.value.x,
    offsetY: event.clientY - pos.value.y,
    startX: event.clientX,
    startY: event.clientY,
  }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onFabPointerMove(event: PointerEvent) {
  if (drag.value.pointerId !== event.pointerId || !pos.value) return
  const dx = event.clientX - drag.value.startX
  const dy = event.clientY - drag.value.startY
  if (!drag.value.moved && Math.hypot(dx, dy) < 7) return
  drag.value.moved = true
  open.value = false
  const el = dock.value
  const w = el?.offsetWidth ?? 96
  const h = el?.offsetHeight ?? 52
  pos.value = {
    x: clamp(event.clientX - drag.value.offsetX, 8, window.innerWidth - w - 8),
    y: clamp(event.clientY - drag.value.offsetY, 8, window.innerHeight - h - 8),
  }
}

function onFabPointerUp(event: PointerEvent) {
  if (drag.value.pointerId !== event.pointerId) return
  const wasDrag = drag.value.moved
  drag.value.pointerId = -1
  drag.value.moved = false
  try {
    ;(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId)
  } catch {
    /* 已释放 */
  }
  if (wasDrag) {
    savePosition()
    return
  }
  open.value = !open.value
}

async function run(action: Action) {
  open.value = false
  await action.run()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    event.preventDefault()
    open.value = false
  }
}

onMounted(() => {
  loadPosition()
  document.addEventListener("keydown", onKeydown)
})

onUnmounted(() => document.removeEventListener("keydown", onKeydown))
</script>

<template>
  <div
    ref="dock"
    class="create-dock"
    :class="{ 'is-open': open, 'is-custom-pos': Boolean(pos), 'is-dragging': drag.pointerId >= 0 && drag.moved }"
    :style="dockStyle"
  >
    <transition name="dock-rise">
      <div v-if="open" class="create-menu" role="menu" aria-label="快捷新建">
        <button v-for="action in actions" :key="action.id" class="create-item" type="button" role="menuitem" @click="run(action)">
          <span class="create-hint">{{ action.hint }}</span>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </transition>
    <button
      class="create-fab"
      type="button"
      :aria-expanded="open"
      aria-label="新建（可拖动）"
      @pointerdown="onFabPointerDown"
      @pointermove="onFabPointerMove"
      @pointerup="onFabPointerUp"
      @pointercancel="onFabPointerUp"
    >
      <span class="create-fab-glyph">{{ open ? "收" : "新建" }}</span>
    </button>
  </div>
</template>