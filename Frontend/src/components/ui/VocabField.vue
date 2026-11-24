<script setup lang="ts">
import { computed } from "vue"
import type { VocabCategory } from "../../domain/types"
import { normalizeVocabLabel } from "../../domain/vocabLabel"
import { useWorkspace } from "../../stores/workspace"
import SwCombobox from "./SwCombobox.vue"

const props = withDefaults(
  defineProps<{
    modelValue: string
    options: readonly string[]
    id?: string
    allowCustom?: boolean
    hint?: string
    label?: string
    presetLabel?: string
    customLabel?: string
    vocabCategory?: VocabCategory
    variant?: "default" | "inspector"
    placeholder?: string
    showFooterHint?: boolean
  }>(),
  {
    variant: "default",
    showFooterHint: false,
    allowCustom: true,
  },
)

const emit = defineEmits<{ "update:modelValue": [value: string]; change: [] }>()
const store = useWorkspace()

const fieldLabel = computed(() => props.label || props.presetLabel || "")
const comboPlaceholder = computed(
  () =>
    props.placeholder ||
    (props.allowCustom === false ? "请选择" : props.variant === "inspector" ? "选择或输入" : "输入或从列表选择"),
)

async function onValue(value: string) {
  let next = value.trim()
  if (!next) return
  if (!props.options.includes(next) && props.allowCustom !== false) {
    try {
      next = normalizeVocabLabel(next)
      if (props.vocabCategory) {
        await store.ensureVocabLabel(props.vocabCategory, next)
      }
    } catch {
      /* 保存时提示 */
    }
  }
  emit("update:modelValue", next)
  emit("change")
}
</script>

<template>
  <div class="vocab-field vocab-field-modern" :class="`vocab-field--${variant}`">
    <label v-if="fieldLabel" class="field-label vocab-field-label" :for="id">{{ fieldLabel }}</label>
    <p v-if="hint" class="vocab-hint vocab-hint-above">{{ hint }}</p>
    <SwCombobox
      :id="id"
      :model-value="modelValue"
      :options="options"
      :aria-label="fieldLabel || '词表'"
      :placeholder="comboPlaceholder"
      @update:model-value="onValue"
    />
    <p v-if="showFooterHint && allowCustom !== false" class="vocab-hint vocab-hint-footer">
      可直接键入自定义词条，回车或失焦即生效。
    </p>
  </div>
</template>