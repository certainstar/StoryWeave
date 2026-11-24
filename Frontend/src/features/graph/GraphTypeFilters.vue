<script setup lang="ts">
import { useTemplateRef } from "vue"

defineProps<{
  types: string[]
  hidden: string[]
}>()

const emit = defineEmits<{
  toggle: [type: string, visible: boolean]
  showAll: []
}>()

const bar = useTemplateRef("bar")

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    emit("showAll")
    event.preventDefault()
  }
}

defineExpose({ focus: () => bar.value?.focus() })
</script>

<template>
  <div
    ref="bar"
    class="filters graph-filters"
    tabindex="0"
    role="group"
    aria-label="关系类型筛选，按 Esc 全部显示"
    @keydown="onKey"
  >
    <button class="btn filter-reset" type="button" :disabled="!hidden.length" @click="emit('showAll')">全部显示</button>
    <label v-for="type in types" :key="type" class="filter">
      <input
        type="checkbox"
        :checked="!hidden.includes(type)"
        @change="emit('toggle', type, ($event.target as HTMLInputElement).checked)"
      >
      {{ type }}
    </label>
  </div>
</template>