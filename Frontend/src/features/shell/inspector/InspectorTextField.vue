<script setup lang="ts">
defineProps<{
  label: string
  modelValue: string
  id?: string
}>()

const emit = defineEmits<{
  "update:modelValue": [value: string]
  input: []
}>()

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value
  emit("update:modelValue", value)
  emit("input")
}
</script>

<template>
  <label class="field-label" :for="id">{{ label }}</label>
  <input :id="id" :value="modelValue" type="text" @input="onInput">
</template>