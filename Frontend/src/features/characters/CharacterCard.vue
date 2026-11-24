<script setup lang="ts">
import type { Character } from "../../domain/types"
import { useInspector } from "../shell/inspectorContext"

defineProps<{
  character: Character
  selected: boolean
}>()

const emit = defineEmits<{ select: [] }>()
const inspector = useInspector()

function openDetail() {
  emit("select")
  inspector.open()
}
</script>

<template>
  <button
    class="char-card surface-no-select"
    type="button"
    :aria-selected="selected"
    @click="emit('select')"
    @dblclick.prevent="openDetail"
  >
    <div>
      <strong>{{ character.name }}</strong>
      <p class="lede">{{ character.role || "未填写身份" }} · {{ character.status }}</p>
    </div>
    <span class="ws-meta">目标</span>
    <p class="ws-meta">{{ character.goal || "未填写" }}</p>
  </button>
</template>