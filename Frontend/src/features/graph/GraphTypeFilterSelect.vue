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
  if (!props.hidden.length) return `全部显示（${props.types.length}）`
  return `已选 ${visibleCount.value} / ${props.types.length}`
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
  <div ref="root" class="graph-filter-select" :class="{ 'is-open': open }">
    <button type="button" class="graph-filter-trigger" :disabled="!types.length" @click="open = !open">
      <span>{{ summary }}</span>
      <AppIcon name="chevron-down" :size="16" />
    </button>
    <div v-if="open" class="graph-filter-menu">
      <div class="graph-filter-menu-head">
        <span>关系类型</span>
        <button class="btn filter-reset" type="button" :disabled="!hidden.length" @click="emit('showAll')">全部显示</button>
      </div>
      <ul class="graph-filter-options">
        <li v-for="type in types" :key="type">
          <label class="graph-filter-option">
            <input
              type="checkbox"
              :checked="!hidden.includes(type)"
              @change="emit('toggle', type, ($event.target as HTMLInputElement).checked)"
            >
            {{ type }}
          </label>
        </li>
      </ul>
    </div>
  </div>
</template>