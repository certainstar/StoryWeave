<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from "vue"
import AppIcon from "./AppIcon.vue"

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly string[]
    id?: string
    disabled?: boolean
    placeholder?: string
    ariaLabel?: string
  }>(),
  { placeholder: "请选择", disabled: false },
)

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const open = ref(false)
const root = useTemplateRef("root")
const activeIndex = ref(-1)

const label = computed(() => props.options.find((item) => item === props.modelValue) ?? props.placeholder)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) {
    const idx = props.options.indexOf(props.modelValue)
    activeIndex.value = idx >= 0 ? idx : 0
  }
}

function pick(value: string) {
  emit("update:modelValue", value)
  open.value = false
}

function onDocClick(event: MouseEvent) {
  const el = root.value
  if (!el || el.contains(event.target as Node)) return
  open.value = false
}

function onKey(event: KeyboardEvent) {
  if (props.disabled) return
  if (!open.value) {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      open.value = true
      activeIndex.value = Math.max(0, props.options.indexOf(props.modelValue))
    }
    return
  }
  if (event.key === "Escape") {
    event.preventDefault()
    open.value = false
    return
  }
  if (event.key === "ArrowDown") {
    event.preventDefault()
    activeIndex.value = Math.min(props.options.length - 1, activeIndex.value + 1)
  }
  if (event.key === "ArrowUp") {
    event.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  }
  if (event.key === "Enter" && activeIndex.value >= 0) {
    event.preventDefault()
    pick(props.options[activeIndex.value] ?? props.modelValue)
  }
}

onMounted(() => document.addEventListener("pointerdown", onDocClick))
onUnmounted(() => document.removeEventListener("pointerdown", onDocClick))
</script>

<template>
  <div
    ref="root"
    class="sw-select-root"
    :class="{ 'is-open': open, 'is-disabled': disabled }"
  >
    <button
      :id="id"
      type="button"
      class="sw-select-trigger"
      :disabled="disabled"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="toggle"
      @keydown="onKey"
    >
      <span class="sw-select-value" :class="{ 'is-placeholder': !options.includes(modelValue) }">{{ label }}</span>
      <AppIcon name="chevron-down" :size="16" class="sw-select-chevron" />
    </button>
    <ul v-if="open" class="sw-select-menu" role="listbox" :aria-activedescendant="activeIndex >= 0 ? `${id}-opt-${activeIndex}` : undefined">
      <li
        v-for="(option, index) in options"
        :id="`${id}-opt-${index}`"
        :key="option"
        role="option"
        class="sw-select-option"
        :class="{ 'is-on': option === modelValue, 'is-active': index === activeIndex }"
        :aria-selected="option === modelValue"
        @mouseenter="activeIndex = index"
        @click="pick(option)"
      >
        <span class="sw-select-check" aria-hidden="true">{{ option === modelValue ? "✓" : "" }}</span>
        {{ option }}
      </li>
    </ul>
  </div>
</template>