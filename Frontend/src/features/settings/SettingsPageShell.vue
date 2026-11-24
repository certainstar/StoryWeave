<script setup lang="ts">
import { computed, ref } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"

export type SettingsSectionId =
  | "theme"
  | "draft"
  | "data"
  | "snapshots"
  | "shortcuts"
  | "plugins"
  | "model"
  | "danger"

type Section = {
  id: SettingsSectionId
  label: string
  keywords: string
  icon: "palette" | "settings" | "folder-open" | "copy" | "search" | "layers" | "book-open" | "close"
}

const props = defineProps<{ sections: Section[] }>()

const query = ref("")
const active = ref<SettingsSectionId>("theme")

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.sections
  return props.sections.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.keywords.toLowerCase().includes(q) ||
      item.id.includes(q),
  )
})

function pick(id: SettingsSectionId) {
  active.value = id
}
</script>

<template>
  <div class="settings-layout">
    <aside class="settings-rail" aria-label="设置分类">
      <div class="settings-rail-head" aria-hidden="true">
        <AppIcon name="settings" :size="20" />
      </div>
      <label class="visually-hidden" for="settings-search">搜索设置</label>
      <div class="settings-search-wrap">
        <AppIcon name="search" :size="16" class="settings-search-icon" />
        <input
          id="settings-search"
          v-model="query"
          class="settings-search"
          type="search"
          placeholder="搜索设置…"
          autocomplete="off"
        >
      </div>
      <nav class="settings-rail-list">
        <button
          v-for="item in filtered"
          :key="item.id"
          type="button"
          class="settings-rail-item"
          :class="{ 'is-on': active === item.id }"
          @click="pick(item.id)"
        >
          <AppIcon :name="item.icon" :size="17" :stroke-width="1.75" />
          <span>{{ item.label }}</span>
        </button>
        <p v-if="!filtered.length" class="empty settings-search-empty">没有匹配的设置项。</p>
      </nav>
    </aside>
    <div class="settings-stage">
      <slot :active="active" />
    </div>
  </div>
</template>