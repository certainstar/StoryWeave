<script setup lang="ts">
import type { ChapterNavItem } from "../../domain/bookPages"

defineProps<{
  chapters: ChapterNavItem[]
  activeChapter?: number
}>()

const emit = defineEmits<{ jump: [pageIndex: number] }>()
</script>

<template>
  <aside class="reader-toc reader-toc-chapters" aria-label="章节目录">
    <h2 class="reader-toc-title">章节</h2>
    <ul class="reader-toc-list">
      <li v-for="item in chapters" :key="item.chapterIndex">
        <button
          type="button"
          class="reader-toc-item"
          :class="{ 'is-active': activeChapter === item.chapterIndex }"
          :aria-current="activeChapter === item.chapterIndex ? 'true' : undefined"
          @click="emit('jump', item.pageIndex)"
        >
          <span class="reader-toc-index">{{ item.chapterIndex }}</span>
          <span class="reader-toc-label">{{ item.title }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>