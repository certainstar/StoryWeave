<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"

const props = defineProps<{
  types: string[]
  hidden: string[]
}>()

const emit = defineEmits<{
  toggle: [type: string, visible: boolean]
  showAll: []
}>()

const open = ref(false)
const root = useTemplateRef("root")

const visibleCount = computed(() => props.types.length - props.hidden.length)
const summary = computed(() => {
  if (!props.types.length) return "暂无关系"
  if (!props.hidden.length) return "显示全部类型"
  return `已显示 ${visibleCount.value} / ${props.types.length} 类`
})

function onDocClick(event: MouseEvent) {
  const el = root.value
  if (!el || el.contains(event.target as Node)) return
  open.value = false
}

onMounted(() => document.addEventListener("pointerdown", onDocClick))
onUnmounted(() => document.removeEventListener("pointerdown", onDocClick))
</script>

<template>
  <div ref="root" class="graph-filter-dropdown" :class="{ 'is-open': open }">
    <button
      type="button"
      class="graph-filter-trigger"
      :disabled="!types.length"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open = !open"
    >
      <span>{{ summary }}</span>
      <AppIcon name="chevron-down" :size="16" />
    </button>
    <ul v-if="open && types.length" class="graph-filter-menu" role="listbox">
      <li>
        <button type="button" class="graph-filter-action" :disabled="!hidden.length" @click="emit('showAll')">
          全部显示
        </button>
      </li>
      <li v-for="type in types" :key="type" role="option" :aria-selected="!hidden.includes(type)">
        <label class="graph-filter-option">
          <input
            type="checkbox"
            :checked="!hidden.includes(type)"
            @change="emit('toggle', type, ($event.target as HTMLInputElement).checked)"
          >
          <span>{{ type }}</span>
        </label>
      </li>
    </ul>
    <p v-if="!types.length" class="graph-filter-empty">还没有关系，先建立一条关系。</p>
  </div>
</template>