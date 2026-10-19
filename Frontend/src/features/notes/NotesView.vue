<script setup lang="ts">
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()
</script>

<template>
  <PageHead view="notes" :meta="`${store.notes.length} 条笔记`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createNote()">新建笔记</button>
  </div>
  <p v-if="!store.notes.length" class="empty">还没有笔记。</p>
  <article
    v-for="note in store.notes"
    :key="note.id"
    class="card"
    tabindex="0"
    :aria-selected="store.selection?.kind === 'note' && store.selection.id === note.id"
    @click="store.select({ kind: 'note', id: note.id })"
  >
    <header>
      <h2>{{ note.title }}</h2>
      <span>{{ note.tags.join("、") || "无标签" }}</span>
    </header>
    <p>{{ note.content }}</p>
  </article>
</template>
