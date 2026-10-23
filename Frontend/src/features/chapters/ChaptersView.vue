<script setup lang="ts">
import { computed } from "vue"
import { renderMarkdown } from "../../domain/markdown"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import ChapterEditor from "./ChapterEditor.vue"

const store = useWorkspace()
const sorted = computed(() => [...store.chapters].sort((a, b) => a.sortOrder - b.sortOrder))
const selected = computed(() =>
  store.selection?.kind === "chapter" ? store.chapters.find((chapter) => chapter.id === store.selection?.id) : undefined,
)
const preview = computed(() => renderMarkdown(selected.value?.content ?? ""))

/** 更新章节内容。
 * 
 * @param value 章节内容。
 * 
 * @returns 无返回值。
*/
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
  <table class="table">
    <thead><tr><th>顺序</th><th>标题</th><th>状态</th><th>摘要</th></tr></thead>
    <tbody>
      <tr v-if="!sorted.length"><td colspan="4">还没有章节。</td></tr>
      <tr
        v-for="chapter in sorted"
        :key="chapter.id"
        tabindex="0"
        :aria-selected="selected?.id === chapter.id"
        @click="store.select({ kind: 'chapter', id: chapter.id })"
      >
        <td>第 {{ chapter.sortOrder }} 章</td>
        <td>{{ chapter.title }}</td>
        <td>{{ chapter.status }}</td>
        <td>{{ chapter.summary || "没有摘要" }}</td>
      </tr>
    </tbody>
  </table>
  <div v-if="selected" class="split">
    <ChapterEditor :chapter-id="selected.id" :content="selected.content" @input="onInput" />
    <div class="preview" v-html="preview"></div>
  </div>
  <p v-else class="empty">选择一章后可以编辑正文。</p>
</template>
