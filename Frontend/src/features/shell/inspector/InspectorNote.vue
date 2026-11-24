<script setup lang="ts">
import type { Note } from "../../../domain/types"
import { applyTags } from "./inspectorForm"
import { useWorkspace } from "../../../stores/workspace"
import InspectorDelete from "./InspectorDelete.vue"
import InspectorTextArea from "./InspectorTextArea.vue"
import InspectorTextField from "./InspectorTextField.vue"

defineProps<{ note: Note }>()
const store = useWorkspace()
</script>

<template>
  <h2>{{ note.title }}</h2>
  <InspectorTextField v-model="note.title" label="标题" @input="store.scheduleNote(note.id)" />
  <InspectorTextField
    :model-value="note.tags.join('、')"
    label="标签"
    @update:model-value="(value) => applyTags(value, note, store)"
  />
  <InspectorTextArea v-model="note.content" label="正文" :rows="6" @input="store.scheduleNote(note.id)" />
  <InspectorDelete kind="note" :id="note.id" message="删除这条笔记。" />
</template>