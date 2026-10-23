<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { VIEWS, type ViewId } from "../../domain/types"
import { useWorkspace } from "../../stores/workspace"
import InspectorPanel from "./InspectorPanel.vue"

const store = useWorkspace()
const route = useRoute()
const router = useRouter()
const query = ref("")
let searchTimer = 0

const nav = VIEWS.filter((view) => view.id !== "settings")
const current = computed(() => String(route.name ?? ""))

const kindView: Record<string, ViewId> = {
  character: "characters",
  event: "timeline",
  arc: "arcs",
  chapter: "chapters",
  note: "notes",
}
const kindLabel: Record<string, string> = {
  character: "人物",
  event: "事件",
  arc: "故事线",
  chapter: "章节",
  note: "笔记",
}

async function ensureProject(id: string) {
  if (store.project?.id === id) return
  try {
    await store.loadProject(id)
  } catch {
    await router.replace({ name: "home" })
  }
}

// 加载当前路由的 ID 对应的项目。
onMounted(() => {
  const id = String(route.params.id ?? "")
  if (id) void ensureProject(id)
})

// 监听项目 ID 变化，加载项目。
watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") void ensureProject(id)
  },
)

function onSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void store.search(query.value)
  }, 300)
}

function openHit(kind: string, id: string) {
  const view = kindView[kind]
  if (!view) return
  store.searchOpen = false
  query.value = ""
  store.select({ kind: kind as "character", id }, view)
}
</script>

<template>
  <div class="app">
    <div v-if="store.recovery.needed" class="banner">
      <span>上次没有正常退出。可以恢复 {{ store.recovery.snapshotAt }} 的快照。</span>
      <button class="btn primary" type="button" @click="store.restoreRecovery()">恢复</button>
      <button class="btn" type="button" @click="store.dismissRecovery()">保持现状</button>
    </div>
    <header class="topbar">
      <div class="brand">
        <img class="mark" src="/icon.png" width="32" height="32" alt="">
        <span class="brand-name">墨织</span>
        <span class="project-name">{{ store.project?.name?.trim() || "未命名项目" }}</span>
      </div>
      <div class="search-wrap">
        <input
          v-model="query"
          class="search"
          type="search"
          placeholder="搜索人物、事件、章节和笔记"
          aria-label="搜索人物、事件、章节和笔记"
          autocomplete="off"
          @input="onSearch"
          @focus="onSearch"
        >
        <div v-if="store.searchOpen" class="search-results">
          <p v-if="!store.searchHits.length" class="empty">没有匹配的记录。</p>
          <button v-for="hit in store.searchHits" :key="`${hit.kind}:${hit.id}`" type="button" @click="openHit(hit.kind, hit.id)">
            <span class="search-kind">{{ kindLabel[hit.kind] || hit.kind }}</span>
            {{ hit.title }}
          </button>
        </div>
      </div>
      <div class="top-actions">
        <span class="status">{{ store.statusLabel }}</span>
        <button class="btn" type="button" :aria-pressed="store.theme === 'ink'" @click="store.setTheme(store.theme === 'ink' ? 'paper' : 'ink')">
          {{ store.theme === "ink" ? "宣纸" : "夜墨" }}
        </button>
        <button class="btn" type="button" @click="router.push({ name: 'settings', params: { id: store.project?.id } })">设置</button>
      </div>
    </header>
    <div class="shell">
      <nav class="nav" aria-label="工作区">
        <button
          v-for="view in nav"
          :key="view.id"
          type="button"
          :aria-current="current === view.id ? 'page' : undefined"
          @click="store.select(null, view.id)"
        >
          <span class="nav-index">{{ view.index }}</span>
          <span>{{ view.label }}</span>
        </button>
      </nav>
      <main class="workspace">
        <div class="workspace-scroll">
          <RouterView />
        </div>
      </main>
      <aside class="inspector" aria-label="详情">
        <div class="inspector-scroll">
          <InspectorPanel />
        </div>
      </aside>
    </div>
  </div>
</template>
