<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"
import type { ViewId, ViewIconId } from "../../domain/types"
import { useWorkspace } from "../../stores/workspace"
import { SEARCH_KIND_LABEL, groupSearchHits } from "./searchHelpers"

const store = useWorkspace()
const query = ref("")
const root = ref<HTMLElement | null>(null)
let searchTimer = 0

const kindView: Record<string, ViewId> = {
  character: "characters",
  event: "timeline",
  arc: "arcs",
  chapter: "chapters",
  note: "notes",
  relation: "graph",
}

const kindIcon: Record<string, ViewIconId> = {
  character: "users",
  event: "calendar-clock",
  arc: "layers",
  chapter: "book-open",
  note: "sticky-note",
  relation: "git-branch",
}

const groups = computed(() => groupSearchHits(store.searchHits))
const total = computed(() => store.searchHits.length)
const open = computed(() => store.searchOpen && (query.value.trim().length > 0 || total.value > 0))

function onSearch() {
  store.searchOpen = true
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    void store.search(query.value)
  }, 280)
}

function close() {
  store.searchOpen = false
  query.value = ""
}

function openHit(kind: string, id: string) {
  const view = kindView[kind]
  if (!view) return
  close()
  store.select({ kind: kind as "character", id }, view)
}

function onDocumentClick(event: MouseEvent) {
  if (!store.searchOpen || !root.value) return
  if (!root.value.contains(event.target as Node)) close()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && store.searchOpen) {
    event.preventDefault()
    close()
  }
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick)
  document.addEventListener("keydown", onKeydown)
})

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick)
  document.removeEventListener("keydown", onKeydown)
  window.clearTimeout(searchTimer)
})
</script>

<template>
  <div ref="root" class="search-wrap">
    <div class="search-field">
      <AppIcon class="search-icon" name="search" :size="16" />
      <input
        v-model="query"
        class="search"
        type="search"
        placeholder="搜索人物、事件、章节和笔记"
        aria-label="搜索人物、事件、章节和笔记"
        aria-controls="search-results"
        :aria-expanded="open"
        autocomplete="off"
        @input="onSearch"
        @focus="onSearch"
      >
      <button
        v-if="query"
        class="search-clear"
        type="button"
        aria-label="清空搜索"
        @click="query = ''; onSearch()"
      >
        <AppIcon name="close" :size="14" />
      </button>
    </div>
    <Transition name="search-drop">
      <div v-if="open" id="search-results" class="search-results" role="listbox" :aria-label="`共 ${total} 条结果`">
        <p v-if="!total" class="search-empty">
          笺上无字与此相应，不妨换个意象再寻。
        </p>
        <section v-for="group in groups" :key="group.kind" class="search-group">
          <h3 class="search-group-label">
            <AppIcon v-if="kindIcon[group.kind]" :name="kindIcon[group.kind]" :size="14" />
            {{ group.label }} · {{ group.hits.length }}
          </h3>
          <button
            v-for="hit in group.hits"
            :key="`${hit.kind}:${hit.id}`"
            type="button"
            role="option"
            @click="openHit(hit.kind, hit.id)"
          >
            <span class="search-hit-title">{{ hit.title }}</span>
          </button>
        </section>
      </div>
    </Transition>
  </div>
</template>