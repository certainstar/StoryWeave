<script setup lang="ts">
export interface ShortcutAction {
  label: string
  count: number
  hint?: string
}

defineProps<{ items: ShortcutAction[] }>()

const emit = defineEmits<{ run: [index: number] }>()
</script>

<template>
  <div class="shortcut-grid">
    <button
      v-for="(item, index) in items"
      :key="item.label"
      class="shortcut-card"
      type="button"
      @click="emit('run', index)"
    >
      <span class="shortcut-value">{{ item.count }}</span>
      <strong>{{ item.label }}</strong>
      <span class="lede">{{ item.hint || "点按开始" }}</span>
    </button>
  </div>
</template>