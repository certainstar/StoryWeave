<script setup lang="ts">
import { PageFlip } from "page-flip"
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue"
import type { BookPage } from "../../domain/bookPages"
import { renderMarkdown } from "../../domain/markdown"

const props = withDefaults(
  defineProps<{
    pages: BookPage[]
    bookmarkedPages?: number[]
    reduceMotion?: boolean
    initialPage?: number
  }>(),
  { reduceMotion: false, initialPage: 0, bookmarkedPages: () => [] },
)

const emit = defineEmits<{ "page-change": [index: number] }>()

const blockRef = ref<HTMLElement | null>(null)
let flip: PageFlip | null = null
let resizeObs: ResizeObserver | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

const PAGE_W = 390
const PAGE_H = 667

function pageItems(): HTMLElement[] {
  if (!blockRef.value) return []
  return Array.from(blockRef.value.querySelectorAll<HTMLElement>(".book-stf-page"))
}

function clampPage(index: number) {
  return Math.max(0, Math.min(index, Math.max(0, props.pages.length - 1)))
}

function flipSettings(start: number) {
  const reduce = props.reduceMotion
  return {
    width: PAGE_W,
    height: PAGE_H,
    size: "stretch" as const,
    minWidth: PAGE_W,
    maxWidth: PAGE_W,
    minHeight: 320,
    maxHeight: 960,
    drawShadow: !reduce,
    flippingTime: reduce ? 280 : 600,
    usePortrait: true,
    autoSize: true,
    maxShadowOpacity: 0.5,
    showCover: false,
    mobileScrollSupport: false,
    swipeDistance: 28,
    showPageCorners: false,
    useMouseEvents: true,
    disableFlipByClick: false,
    clickEventForward: true,
    startPage: clampPage(start),
    startZIndex: 20,
  }
}

function canRelayout() {
  const state = flip?.getState()
  return !state || state === "read"
}

function teardownFlip() {
  if (!flip) return
  flip.off("flip")
  try {
    flip.clear()
    flip.getUI().destroy()
  } catch {
    /* ignore */
  }
  flip = null
}

function bindFlipEvents() {
  if (!flip) return
  flip.off("flip")
  flip.on("flip", (e) => emit("page-change", e.data as number))
}

function initFlip(start = props.initialPage) {
  if (!blockRef.value || !props.pages.length) return
  flip = new PageFlip(blockRef.value, flipSettings(start))
  flip.loadFromHTML(pageItems())
  bindFlipEvents()
  flip.turnToPage(clampPage(start))
  flip.update()
  emit("page-change", flip.getCurrentPageIndex())
}

function syncPages(keepIndex: boolean) {
  if (!blockRef.value || !props.pages.length) return
  void nextTick(() => {
    const items = pageItems()
    if (!items.length) return
    const idx = keepIndex && flip ? flip.getCurrentPageIndex() : clampPage(props.initialPage)
    if (!flip) {
      initFlip(idx)
      return
    }
    try {
      flip.updateFromHtml(items)
      flip.turnToPage(clampPage(idx))
      if (canRelayout()) flip.update()
      emit("page-change", flip.getCurrentPageIndex())
    } catch {
      teardownFlip()
      initFlip(idx)
    }
  })
}

function scheduleRelayout() {
  if (!canRelayout()) return
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => flip?.update(), 120)
}

function go(delta: number) {
  if (!flip || !props.pages.length) return
  const idx = flip.getCurrentPageIndex()
  const atEnd = delta > 0 && idx >= props.pages.length - 1
  const atStart = delta < 0 && idx <= 0
  if (atEnd || atStart) return

  if (props.reduceMotion) {
    delta > 0 ? flip.turnToNextPage() : flip.turnToPrevPage()
    return
  }
  delta > 0 ? flip.flipNext("bottom") : flip.flipPrev("bottom")
}

function jumpTo(pageIndex: number) {
  if (!flip) return
  const target = clampPage(pageIndex)
  if (flip.getCurrentPageIndex() === target) return
  flip.turnToPage(target)
  flip.update()
  emit("page-change", target)
}

function getCurrentIndex() {
  return flip?.getCurrentPageIndex() ?? clampPage(props.initialPage)
}

defineExpose({ go, jumpTo, getCurrentIndex })

watch(() => props.pages, () => syncPages(true), { deep: true })

watch(
  () => props.bookmarkedPages,
  () => {
    if (!flip) return
    void nextTick(() => {
      try {
        flip?.updateFromHtml(pageItems())
        if (canRelayout()) flip?.update()
      } catch {
        /* 标记更新失败时忽略，下次翻页仍会纠正 */
      }
    })
  },
)

function isBookmarked(index: number) {
  return props.bookmarkedPages.includes(index)
}

watch(
  () => props.reduceMotion,
  () => {
    const idx = flip?.getCurrentPageIndex() ?? clampPage(props.initialPage)
    teardownFlip()
    void nextTick(() => initFlip(idx))
  },
)

onMounted(() => {
  syncPages(false)
  const shell = blockRef.value?.parentElement
  if (shell) {
    resizeObs = new ResizeObserver(() => scheduleRelayout())
    resizeObs.observe(shell)
  }
})

onUnmounted(() => {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeObs?.disconnect()
  teardownFlip()
})
</script>

<template>
  <div class="book-stf-shell surface-no-select">
    <div ref="blockRef" class="book-stf-root">
      <article
        v-for="(page, idx) in pages"
        :key="idx"
        class="book-stf-page"
        :class="[`is-kind-${page.kind}`, { 'has-bookmark': isBookmarked(idx) }]"
        data-density="soft"
      >
        <span v-if="isBookmarked(idx)" class="book-page-ribbon" aria-hidden="true" />
        <div v-if="page.kind === 'cover'" class="book-stf-plate book-stf-cover">
          <p class="book-stf-cover-eyebrow">翻阅</p>
          <h1 class="book-stf-cover-title">{{ page.bookTitle }}</h1>
        </div>
        <div v-else-if="page.kind === 'end'" class="book-stf-plate book-stf-end">
          <p class="book-stf-end-text">此书完结</p>
        </div>
        <template v-else>
          <p v-if="page.chapterTitle" class="book-stf-page-kicker">
            <template v-if="page.chapterIndex > 0">第 {{ page.chapterIndex }} 章 · </template>{{ page.chapterTitle }}
          </p>
          <div class="book-stf-page-body markdown-body" v-html="renderMarkdown(page.markdown)" />
        </template>
        <footer class="book-stf-folio" :aria-label="`第 ${idx + 1} 页`">
          <span class="book-stf-folio-num">{{ idx + 1 }}</span>
        </footer>
      </article>
    </div>
  </div>
</template>