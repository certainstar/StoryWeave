<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { VIEWS } from "../../domain/types"
import RelationCreateModal from "../graph/RelationCreateModal.vue"
import SettingsLayout from "../settings/SettingsLayout.vue"
import { useWorkspace } from "../../stores/workspace"
import InspectorPanel from "./InspectorPanel.vue"
import { provideInspector } from "./inspectorContext"
import QuickCreateDock from "./QuickCreateDock.vue"
import TopSearch from "./TopSearch.vue"
import { handleViewShortcut, viewShortcutLabel } from "./viewShortcuts"

const store = useWorkspace()
const route = useRoute()
const router = useRouter()
const navExpanded = ref(window.innerWidth > 900)
const inspectorOpen = ref(false)

const nav = VIEWS
const current = computed(() => String(route.name ?? ""))
const isSettings = computed(() => current.value === "settings")

const shellClass = computed(() => ({
  "is-nav-collapsed": !navExpanded.value,
  "is-nav-expanded": navExpanded.value,
  "is-inspector-open": inspectorOpen.value,
}))

function onResize() {
  navExpanded.value = window.innerWidth > 900
}

async function ensureProject(id: string) {
  if (store.project?.id === id) return
  try {
    await store.loadProject(id)
  } catch {
    await router.replace({ name: "home" })
  }
}

function onGlobalKey(event: KeyboardEvent) {
  if (isSettings.value) return
  handleViewShortcut(event, (view) => store.select(null, view))
}

function closeInspector() {
  inspectorOpen.value = false
}

function openInspector() {
  inspectorOpen.value = true
}

provideInspector({
  open: openInspector,
  close: closeInspector,
  toggle: () => {
    inspectorOpen.value = !inspectorOpen.value
  },
})

function onWorkspacePointerDown(event: PointerEvent) {
  if (!inspectorOpen.value) return
  const target = event.target as HTMLElement
  if (target.closest(".inspector")) return
  if (target.closest(".topbar")) return
  if (target.closest(".modal-backdrop")) return
  if (target.closest(".create-dock")) return
  closeInspector()
}

onMounted(() => {
  onResize()
  window.addEventListener("resize", onResize)
  document.addEventListener("keydown", onGlobalKey)
  const id = String(route.params.id ?? "")
  if (id) void ensureProject(id)
})

onUnmounted(() => {
  window.removeEventListener("resize", onResize)
  document.removeEventListener("keydown", onGlobalKey)
})

watch(
  () => route.params.id,
  (id) => {
    if (typeof id === "string") void ensureProject(id)
  },
)

watch(
  () => store.inspectorRequest,
  () => {
    openInspector()
  },
)
</script>

<template>
  <SettingsLayout v-if="isSettings">
    <RouterView />
  </SettingsLayout>
  <div v-else class="app">
    <div v-if="store.recovery.needed" class="banner">
      <span>上次没有正常退出。可以恢复 {{ store.recovery.snapshotAt }} 的快照。</span>
      <button class="btn primary" type="button" @click="store.restoreRecovery()">恢复</button>
      <button class="btn" type="button" @click="store.dismissRecovery()">保持现状</button>
    </div>
    <header class="topbar">
      <div class="brand brand-minimal">
        <button class="btn nav-toggle" type="button" aria-label="展开导航" @click="navExpanded = !navExpanded">☰</button>
        <span v-if="store.project" class="topbar-project" :title="store.project.name">{{ store.project.name }}</span>
      </div>
      <TopSearch />
      <div class="top-actions">
        <span class="status">{{ store.statusLabel }}</span>
        <UiTooltip :label="inspectorOpen ? '收起详情' : '展开详情'" placement="bottom">
          <button
            class="icon-btn topbar-action-btn"
            type="button"
            :aria-label="inspectorOpen ? '收起详情' : '展开详情'"
            :aria-pressed="inspectorOpen"
            @click="inspectorOpen = !inspectorOpen"
          >
            <AppIcon name="panel-right" :size="20" :stroke-width="1.75" />
          </button>
        </UiTooltip>
        <UiTooltip label="重选项目" placement="bottom">
          <button class="icon-btn topbar-action-btn" type="button" aria-label="重选项目" @click="router.push({ name: 'home' })">
            <AppIcon name="folder-open" :size="20" :stroke-width="1.75" />
          </button>
        </UiTooltip>
        <UiTooltip :label="`切换主题（${store.themeLabel}）`" placement="bottom">
          <button
            class="icon-btn topbar-action-btn"
            type="button"
            :aria-label="`切换主题，当前 ${store.themeLabel}`"
            @click="store.cycleTheme()"
          >
            <AppIcon name="palette" :size="20" :stroke-width="1.75" />
          </button>
        </UiTooltip>
        <UiTooltip label="设置" placement="bottom">
          <button
            class="icon-btn topbar-action-btn"
            type="button"
            aria-label="设置"
            @click="router.push({ name: 'settings', params: { id: store.project?.id } })"
          >
            <AppIcon name="settings" :size="20" :stroke-width="1.75" />
          </button>
        </UiTooltip>
      </div>
    </header>
    <div class="shell" :class="shellClass" @pointerdown.capture="onWorkspacePointerDown">
      <nav class="nav" aria-label="工作区">
        <button
          v-for="view in nav"
          :key="view.id"
          type="button"
          :title="`${view.label}（${viewShortcutLabel(view.index)}）`"
          :aria-keyshortcuts="viewShortcutLabel(view.index)"
          :aria-current="current === view.id ? 'page' : undefined"
          @click="store.select(null, view.id)"
        >
          <AppIcon :name="view.icon" :size="17" />
          <span class="nav-index">{{ view.index }}</span>
          <span class="nav-label">{{ view.label }}</span>
        </button>
      </nav>
      <main class="workspace">
        <div class="workspace-scroll">
          <RouterView />
        </div>
      </main>
      <aside class="inspector" aria-label="详情" @pointerdown.stop>
        <div class="inspector-scroll">
          <InspectorPanel />
        </div>
      </aside>
    </div>
    <QuickCreateDock v-if="store.project" />
  </div>
  <RelationCreateModal />
</template>