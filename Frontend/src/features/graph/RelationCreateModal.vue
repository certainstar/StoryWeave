<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"
import SwSelect from "../../components/ui/SwSelect.vue"
import SwCombobox from "../../components/ui/SwCombobox.vue"
import { useWorkspace } from "../../stores/workspace"
import { normalizeVocabLabel } from "../../domain/vocabLabel"

const store = useWorkspace()

const characterNames = () => store.characters.map((person) => person.name)

function nameToId(name: string) {
  return store.characters.find((person) => person.name === name)?.id ?? store.draft?.sourceId ?? ""
}

function idToName(id: string) {
  return store.characters.find((person) => person.id === id)?.name ?? characterNames()[0] ?? ""
}

async function applyType(value: string) {
  if (!store.draft) return
  const trimmed = value.trim()
  if (!trimmed) return
  try {
    const next = store.vocab.relationTypes.includes(trimmed) ? trimmed : normalizeVocabLabel(trimmed)
    store.draft.type = next
    if (!store.vocab.relationTypes.includes(next)) {
      await store.ensureVocabLabel("relationTypes", next)
    }
  } catch {
    store.draft.type = trimmed
  }
}

async function applySpan(value: string) {
  if (!store.draft) return
  const trimmed = value.trim()
  if (!trimmed) return
  try {
    const next = store.vocab.relationSpans.includes(trimmed) ? trimmed : normalizeVocabLabel(trimmed)
    store.draft.span = next
    if (!store.vocab.relationSpans.includes(next)) {
      await store.ensureVocabLabel("relationSpans", next)
    }
  } catch {
    store.draft.span = trimmed
  }
}

async function save() {
  await store.saveDraft()
}

function close() {
  store.draft = null
}

function onKey(event: KeyboardEvent) {
  if (event.key === "Escape" && store.draft) {
    event.preventDefault()
    close()
  }
}

onMounted(() => document.addEventListener("keydown", onKey))
onUnmounted(() => document.removeEventListener("keydown", onKey))
</script>

<template>
  <div v-if="store.draft" class="modal-backdrop relation-modal" role="presentation" @click.self="close">
    <div class="modal-card relation-modal-card sw-form-card" role="dialog" aria-modal="true" aria-label="新建关系">
      <header class="relation-modal-head">
        <h2>新建关系</h2>
        <button class="icon-btn" type="button" aria-label="关闭" @click="close">
          <AppIcon name="close" :size="18" />
        </button>
      </header>
      <div class="sw-form-grid relation-form-top">
        <div class="sw-field sw-field-span">
          <label class="sw-label" for="relation-type">关系类型</label>
          <SwCombobox
            id="relation-type"
            :model-value="store.draft.type"
            :options="store.vocab.relationTypes"
            placeholder="输入或选择，如：心劫"
            aria-label="关系类型"
            @update:model-value="applyType"
          />
        </div>
        <div class="sw-field sw-field-span">
          <label class="sw-label" for="relation-span">时间区间</label>
          <SwCombobox
            id="relation-span"
            :model-value="store.draft.span"
            :options="store.vocab.relationSpans"
            placeholder="输入或选择"
            aria-label="时间区间"
            @update:model-value="applySpan"
          />
        </div>
        <div class="sw-field">
          <label class="sw-label">起点</label>
          <SwSelect
            id="relation-source"
            :model-value="idToName(store.draft.sourceId)"
            :options="characterNames()"
            aria-label="起点人物"
            @update:model-value="store.draft.sourceId = nameToId($event)"
          />
        </div>
        <div class="sw-field">
          <label class="sw-label">终点</label>
          <SwSelect
            id="relation-target"
            :model-value="idToName(store.draft.targetId)"
            :options="characterNames()"
            aria-label="终点人物"
            @update:model-value="store.draft.targetId = nameToId($event)"
          />
        </div>
        <div class="sw-field sw-field-span">
          <label class="sw-label">说明</label>
          <textarea v-model="store.draft.description" class="sw-textarea" rows="4" />
        </div>
        <label class="check sw-check">
          <input v-model="store.draft.directional" type="checkbox">
          <span>有方向</span>
        </label>
      </div>
      <div class="toolbar relation-modal-actions">
        <button class="btn primary" type="button" @click="save">保存</button>
        <button class="btn" type="button" @click="close">取消</button>
      </div>
    </div>
  </div>
</template>