<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    modelValue: string
    id?: string
    rows?: number
  }>(),
  { rows: 3 },
)

const emit = defineEmits<{
  "update:modelValue": [value: string]
  input: []
}>()

function onInput(event: Event) {
  const value = (event.target as HTMLTextAreaElement).value
  emit("update:modelValue", value)
  emit("input")
}
</script>

<template>
  <label class="field-label" :for="id">{{ label }}</label>
  <textarea :id="id" :rows="rows" :value="modelValue" @input="onInput"></textarea>
</template>