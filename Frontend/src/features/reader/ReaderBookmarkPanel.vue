<script setup lang="ts">
import type { ReaderBookmark } from "../../domain/readerState"

defineProps<{
  bookmarks: ReaderBookmark[]
  currentPage: number
}>()

const emit = defineEmits<{
  jump: [pageIndex: number]
  bookmark: []
  removeBookmark: [id: string]
}>()
</script>

<template>
  <aside class="reader-toc reader-toc-bookmarks" aria-label="书签">
    <div class="reader-toc-head">
      <h2 class="reader-toc-title">书签</h2>
      <button type="button" class="reader-toc-add" title="在当前页加书签（B）" aria-label="添加书签" @click="emit('bookmark')">
        <span aria-hidden="true">+</span>
      </button>
    </div>
    <p v-if="!bookmarks.length" class="reader-toc-empty">暂无书签</p>
    <ul v-else class="reader-toc-list">
      <li v-for="mark in bookmarks" :key="mark.id">
        <button
          type="button"
          class="reader-toc-item"
          :class="{ 'is-active': currentPage === mark.pageIndex }"
          @click="emit('jump', mark.pageIndex)"
        >
          <span class="reader-toc-page-mark" aria-hidden="true" />
          <span class="reader-toc-page-num">{{ mark.pageIndex + 1 }}</span>
          <span class="reader-toc-label">{{ mark.label }}</span>
        </button>
        <button type="button" class="reader-toc-remove" aria-label="删除书签" @click.stop="emit('removeBookmark', mark.id)">
          ×
        </button>
      </li>
    </ul>
  </aside>
</template>