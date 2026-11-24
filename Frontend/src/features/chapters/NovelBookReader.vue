<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { buildReaderPages, type BookPage, type BookSlice } from "../../domain/bookPages"
import {
  loadReaderState,
  newBookmarkId,
  saveReaderState,
  type ReaderBookmark,
} from "../../domain/readerState"
import ReaderBookmarkPanel from "../reader/ReaderBookmarkPanel.vue"
import ReaderChapterNav from "../reader/ReaderChapterNav.vue"
import BookFlipEngine from "./BookFlipEngine.vue"

const props = defineProps<{
  projectId: string
  bookTitle: string
  chapters: BookSlice[]
}>()

const engineRef = ref<InstanceType<typeof BookFlipEngine> | null>(null)
const reduceMotion = ref(false)
const currentPage = ref(0)
const persist = ref(loadReaderState(props.projectId))

const built = computed(() => buildReaderPages(props.bookTitle, props.chapters))
const pages = computed(() => built.value.pages)
const chapterNav = computed(() => built.value.chapterNav)

const activeChapter = computed(() => {
  let chapter = 0
  for (const item of chapterNav.value) {
    if (currentPage.value >= item.pageIndex) chapter = item.chapterIndex
  }
  return chapter
})

const initialPage = computed(() => clampPersisted(persist.value.lastPage, pages.value.length))
const totalPages = computed(() => pages.value.length)
const bookmarkedPageIndices = computed(() => persist.value.bookmarks.map((b) => b.pageIndex))
const currentHasBookmark = computed(() => bookmarkedPageIndices.value.includes(currentPage.value))
const displayPage = computed(() => currentPage.value + 1)

function clampPersisted(index: number, total: number) {
  return Math.max(0, Math.min(index, Math.max(0, total - 1)))
}

function persistNow() {
  saveReaderState(props.projectId, {
    lastPage: currentPage.value,
    bookmarks: persist.value.bookmarks,
  })
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(persistNow, 280)
}

function onPageChange(index: number) {
  currentPage.value = index
  scheduleSave()
}

function jumpTo(pageIndex: number) {
  engineRef.value?.jumpTo(pageIndex)
}

function bookmarkLabel(page: BookPage, index: number): string {
  if (page.kind === "cover") return "扉页 · 书名"
  if (page.kind === "end") return "终页 · 此书完结"
  if (page.chapterIndex > 0) return `第 ${page.chapterIndex} 章 · ${page.chapterTitle}`
  return `第 ${index + 1} 页`
}

function addBookmark() {
  const pageIndex = engineRef.value?.getCurrentIndex() ?? currentPage.value
  if (persist.value.bookmarks.some((b) => b.pageIndex === pageIndex)) return
  const page = pages.value[pageIndex]
  const mark: ReaderBookmark = {
    id: newBookmarkId(),
    pageIndex,
    label: bookmarkLabel(page, pageIndex),
    createdAt: new Date().toISOString(),
  }
  persist.value = {
    ...persist.value,
    bookmarks: [...persist.value.bookmarks, mark].sort((a, b) => a.pageIndex - b.pageIndex),
  }
  persistNow()
}

function removeBookmark(id: string) {
  persist.value = {
    ...persist.value,
    bookmarks: persist.value.bookmarks.filter((b) => b.id !== id),
  }
  persistNow()
}

function go(delta: number) {
  engineRef.value?.go(delta)
}

function onKey(event: KeyboardEvent) {
  if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault()
    go(1)
  } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault()
    go(-1)
  } else if (event.key === "b" || event.key === "B") {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const tag = (event.target as HTMLElement)?.tagName
    if (tag === "INPUT" || tag === "TEXTAREA") return
    event.preventDefault()
    addBookmark()
  }
}

watch(
  () => props.projectId,
  (id) => {
    persist.value = loadReaderState(id)
    currentPage.value = clampPersisted(persist.value.lastPage, pages.value.length)
  },
)

onMounted(() => {
  reduceMotion.value = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  currentPage.value = initialPage.value
  document.addEventListener("keydown", onKey)
})

onUnmounted(() => {
  if (saveTimer) clearTimeout(saveTimer)
  persistNow()
  document.removeEventListener("keydown", onKey)
})
</script>

<template>
  <div class="reader-stage">
    <ReaderChapterNav :chapters="chapterNav" :active-chapter="activeChapter" @jump="jumpTo" />
    <div class="book-reader-embed" role="region" aria-label="翻阅">
      <BookFlipEngine
        ref="engineRef"
        :pages="pages"
        :bookmarked-pages="bookmarkedPageIndices"
        :initial-page="initialPage"
        :reduce-motion="reduceMotion"
        @page-change="onPageChange"
      />
      <div
        class="book-reader-folio"
        :class="{ 'is-bookmarked': currentHasBookmark }"
        aria-live="polite"
        :aria-label="`第 ${displayPage} 页，共 ${totalPages} 页`"
      >
        <span v-if="currentHasBookmark" class="book-reader-folio-mark" aria-hidden="true" />
        <span class="book-reader-folio-inner">
          <span class="book-reader-folio-current">{{ displayPage }}</span>
          <span class="book-reader-folio-sep">/</span>
          <span class="book-reader-folio-total">{{ totalPages }}</span>
        </span>
      </div>
    </div>
    <ReaderBookmarkPanel
      :bookmarks="persist.bookmarks"
      :current-page="currentPage"
      @jump="jumpTo"
      @bookmark="addBookmark"
      @remove-bookmark="removeBookmark"
    />
  </div>
</template>