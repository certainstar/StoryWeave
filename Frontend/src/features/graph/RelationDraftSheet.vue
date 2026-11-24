<script setup lang="ts">
import { onMounted, onUnmounted } from "vue"
import { useWorkspace } from "../../stores/workspace"

const store = useWorkspace()

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
  <div v-if="store.draft" class="draft-sheet" role="dialog" aria-modal="true" aria-label="新建关系" @click.self="close">
    <div class="draft-sheet-panel">
      <h2>新建关系</h2>
      <label>起点</label>
      <select v-model="store.draft.sourceId">
        <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
      </select>
      <label>终点</label>
      <select v-model="store.draft.targetId">
        <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
      </select>
      <label>类型</label>
      <select v-model="store.draft.type">
        <option v-for="type in store.vocab.relationTypes" :key="type">{{ type }}</option>
      </select>
      <label>时间</label>
      <select v-model="store.draft.span">
        <option v-for="span in store.vocab.relationSpans" :key="span">{{ span }}</option>
      </select>
      <label>说明</label>
      <textarea v-model="store.draft.description"></textarea>
      <label class="filter">
        <input v-model="store.draft.directional" type="checkbox">
        有方向
      </label>
      <div class="toolbar">
        <button class="btn primary" type="button" @click="save">保存</button>
        <button class="btn" type="button" @click="close">取消</button>
      </div>
    </div>
  </div>
</template>
