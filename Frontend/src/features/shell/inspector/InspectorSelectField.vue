<script setup lang="ts">
import SwSelect from "../../../components/ui/SwSelect.vue"

defineProps<{
  label: string
  modelValue: string
  options: string[]
  id?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  change: []
}>()

function onChange(value: string) {
  emit("update:modelValue", value)
  emit("change")
}
</script>

<template>
  <label class="field-label" :for="id">{{ label }}</label>
  <SwSelect :id="id" :model-value="modelValue" :options="options" :aria-label="label" @update:model-value="onChange" />
</template>