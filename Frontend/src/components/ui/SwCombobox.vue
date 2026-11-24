<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from "vue"
import AppIcon from "./AppIcon.vue"

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly string[]
    id?: string
    disabled?: boolean
    placeholder?: string
    ariaLabel?: string
    maxlength?: number
  }>(),
  { placeholder: "选择或输入", disabled: false, maxlength: 24 },
)

const emit = defineEmits<{ "update:modelValue": [value: string] }>()

const open = ref(false)
const root = useTemplateRef("root")
const draft = ref(props.modelValue)
const activeIndex = ref(-1)

const filtered = computed(() => {
  const q = draft.value.trim().toLowerCase()
  if (!q) return [...props.options]
  return props.options.filter((item) => item.toLowerCase().includes(q))
})

watch(
  () => props.modelValue,
  (value) => {
    draft.value = value
  },
)

function toggleMenu() {
  if (props.disabled) return
  open.value = !open.value
  if (open.value) activeIndex.value = Math.max(0, filtered.value.indexOf(props.modelValue))
}

function pick(value: string) {
  draft.value = value
  emit("update:modelValue", value)
  open.value = false
}

function commitDraft() {
  const trimmed = draft.value.trim()
  emit("update:modelValue", trimmed || props.modelValue)
  open.value = false
}

function onBlur() {
  window.setTimeout(() => {
    if (open.value) return
    commitDraft()
  }, 80)
}

function onInput(event: Event) {
  draft.value = (event.target as HTMLInputElement).value
  open.value = true
  activeIndex.value = 0
}

function onDocClick(event: MouseEvent) {
  const el = root.value
  if (!el || el.contains(event.target as Node)) return
  commitDraft()
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape") {
    open.value = false
    draft.value = props.modelValue
    return
  }
  if (!open.value && (event.key === "ArrowDown" || event.key === "Enter")) {
    event.preventDefault()
    open.value = true
    return
  }
  if (!open.value) return
  if (event.key === "ArrowDown") {
    event.preventDefault()
    activeIndex.value = Math.min(filtered.value.length - 1, activeIndex.value + 1)
  }
  if (event.key === "ArrowUp") {
    event.preventDefault()
    activeIndex.value = Math.max(0, activeIndex.value - 1)
  }
  if (event.key === "Enter" && activeIndex.value >= 0 && filtered.value[activeIndex.value]) {
    event.preventDefault()
    pick(filtered.value[activeIndex.value]!)
  }
}

onMounted(() => document.addEventListener("pointerdown", onDocClick))
onUnmounted(() => document.removeEventListener("pointerdown", onDocClick))
</script>

<template>
  <div ref="root" class="sw-combobox" :class="{ 'is-open': open, 'is-disabled': disabled }">
    <div class="sw-combobox-field">
      <input
        :id="id"
        class="sw-combobox-input"
        type="text"
        :value="draft"
        :disabled="disabled"
        :maxlength="maxlength"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        autocomplete="off"
        role="combobox"
        :aria-expanded="open"
        aria-autocomplete="list"
        @input="onInput"
        @focus="open = true"
        @blur="onBlur"
        @keydown="onKey"
      >
      <button type="button" class="sw-combobox-toggle" :disabled="disabled" aria-label="展开列表" @mousedown.prevent="toggleMenu">
        <AppIcon name="chevron-down" :size="16" />
      </button>
    </div>
    <ul v-if="open && filtered.length" class="sw-select-menu sw-combobox-menu" role="listbox">
      <li
        v-for="(option, index) in filtered"
        :key="option"
        role="option"
        class="sw-select-option"
        :class="{ 'is-on': option === modelValue, 'is-active': index === activeIndex }"
        :aria-selected="option === modelValue"
        @mousedown.prevent="pick(option)"
        @mouseenter="activeIndex = index"
      >
        <span class="sw-select-check" aria-hidden="true">{{ option === modelValue ? "✓" : "" }}</span>
        {{ option }}
      </li>
    </ul>
    <p v-else-if="open && draft.trim()" class="sw-combobox-empty">将使用自定义：{{ draft.trim() }}</p>
  </div>
</template>