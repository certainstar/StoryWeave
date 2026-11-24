<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue"
import { estimateGridColumns, handleGridArrowKey } from "../../domain/gridKeyboard"
import { reorderIds } from "../../domain/reorder"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import ChapterEditor from "./ChapterEditor.vue"
import ChapterListCard from "./ChapterListCard.vue"
import ChapterPreview from "./ChapterPreview.vue"
import SceneChain from "./SceneChain.vue"

const store = useWorkspace()
const grid = useTemplateRef("grid")
const editorFullscreen = ref(false)
const editorFocus = ref(false)
const dragChapterId = ref("")
const sorted = computed(() => [...store.chapters].sort((a, b) => a.sortOrder - b.sortOrder))
const selected = computed(() =>
  store.selection?.kind === "chapter" ? store.chapters.find((chapter) => chapter.id === store.selection?.id) : undefined,
)

function onGridKey(event: KeyboardEvent) {
  const el = grid.value
  if (!el) return
  const cols = estimateGridColumns(el, 220, 10)
  const current = store.selection?.kind === "chapter" ? store.selection.id : undefined
  handleGridArrowKey(event, sorted.value.map((chapter) => chapter.id), current, cols, (id) => {
    store.select({ kind: "chapter", id })
    el.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  })
}

function onChapterDrop(targetId: string) {
  if (!dragChapterId.value || dragChapterId.value === targetId) return
  const ids = sorted.value.map((chapter) => chapter.id)
  const from = ids.indexOf(dragChapterId.value)
  const to = ids.indexOf(targetId)
  dragChapterId.value = ""
  void store.applyChapterOrder(reorderIds(ids, from, to))
}

function onInput(value: string) {
  if (!selected.value) return
  selected.value.content = value
  store.scheduleChapter(selected.value.id)
}
</script>

<template>
  <PageHead view="chapters" :meta="`${store.chapters.length} 章`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createChapter()">新建章节</button>
  </div>
  <p v-if="!sorted.length" class="empty">还没有章节。</p>
  <div v-else ref="grid" class="chapter-grid" tabindex="0" aria-label="章节列表" @keydown="onGridKey">
    <ChapterListCard
      v-for="chapter in sorted"
      :key="chapter.id"
      :data-id="chapter.id"
      :chapter="chapter"
      :selected="selected?.id === chapter.id"
      :dragging="dragChapterId === chapter.id"
      @select="store.select({ kind: 'chapter', id: chapter.id })"
      @drag-start="dragChapterId = chapter.id"
      @drag-end="dragChapterId = ''"
      @drop="onChapterDrop(chapter.id)"
    />
  </div>
  <template v-if="selected">
    <SceneChain :chapter-id="selected.id" />
    <div class="split" :class="{ 'editor-fullscreen': editorFullscreen, 'editor-focus': editorFocus }">
      <ChapterEditor
        :chapter-id="selected.id"
        :content="selected.content"
        :fullscreen="editorFullscreen"
        v-model:focus-mode="editorFocus"
        @input="onInput"
        @toggle-fullscreen="editorFullscreen = !editorFullscreen"
        @exit-fullscreen="editorFullscreen = false"
      />
      <ChapterPreview v-if="!editorFullscreen && !editorFocus" :content="selected.content" />
    </div>
  </template>
  <p v-else-if="sorted.length" class="empty">选择一章后可以编辑正文。</p>
</template>