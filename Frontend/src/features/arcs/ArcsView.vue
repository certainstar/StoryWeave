<script setup lang="ts">
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()

/** 获取事件标题。 
 * 
 * @param id 事件 ID。
 * 
 * @returns 事件标题。
*/
function title(id: string) {
  return store.events.find((event) => event.id === id)?.title || "未命名事件"
}
</script>

<template>
  <PageHead view="arcs" :meta="`${store.arcs.length} 条故事线`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createArc()">新建故事线</button>
  </div>
  <p v-if="!store.arcs.length" class="empty">还没有故事线。</p>
  <article
    v-for="arc in store.arcs"
    :key="arc.id"
    class="card"
    tabindex="0"
    :aria-selected="store.selection?.kind === 'arc' && store.selection.id === arc.id"
    @click="store.select({ kind: 'arc', id: arc.id })"
  >
    <header>
      <h2>{{ arc.title }}</h2>
      <span>{{ arc.kind }}</span>
    </header>
    <p>{{ arc.summary || "还没有简介。" }}</p>
    <ol>
      <li v-if="!arc.eventIds.length">还没有事件。</li>
      <li v-for="id in arc.eventIds" :key="id">{{ title(id) }}</li>
    </ol>
  </article>
</template>
