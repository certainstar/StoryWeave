<script setup lang="ts">
import { computed } from "vue"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import NovelBookReader from "../chapters/NovelBookReader.vue"

const store = useWorkspace()
const sorted = computed(() => [...store.chapters].sort((a, b) => a.sortOrder - b.sortOrder))
const bookSlices = computed(() => sorted.value.map((chapter) => ({ title: chapter.title, markdown: chapter.content })))
const meta = computed(() => {
  if (!sorted.value.length) return "尚无章节"
  return `${sorted.value.length} 章 · 全书分页`
})
const projectId = computed(() => store.project?.id ?? "")
const bookTitle = computed(() => store.project?.name ?? "未命名作品")
</script>

<template>
  <div class="reader-view">
    <PageHead view="reader" :meta="meta" />
    <p v-if="!sorted.length" class="empty">写完章节后，可在这里连续翻阅全书。</p>
    <NovelBookReader
      v-else-if="projectId"
      :key="projectId"
      :project-id="projectId"
      :book-title="bookTitle"
      :chapters="bookSlices"
    />
  </div>
</template>