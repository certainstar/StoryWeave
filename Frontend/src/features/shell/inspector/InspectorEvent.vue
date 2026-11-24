<script setup lang="ts">
import type { StoryEvent } from "../../../domain/types"
import { toggleParticipant } from "./inspectorForm"
import { useWorkspace } from "../../../stores/workspace"
import InspectorDelete from "./InspectorDelete.vue"
import InspectorSectionLabel from "./InspectorSectionLabel.vue"
import InspectorTextArea from "./InspectorTextArea.vue"
import InspectorTextField from "./InspectorTextField.vue"

defineProps<{ event: StoryEvent }>()
const store = useWorkspace()
</script>

<template>
  <h2>{{ event.title }}</h2>
  <InspectorTextField v-model="event.title" label="标题" @input="store.scheduleEvent(event.id)" />
  <InspectorTextField
    :model-value="event.storyTime ?? ''"
    label="故事内时间"
    @update:model-value="(value) => { event.storyTime = value; store.scheduleEvent(event.id) }"
  />
  <InspectorTextArea v-model="event.description" label="说明" :rows="4" @input="store.scheduleEvent(event.id)" />
  <InspectorSectionLabel text="参与人物" />
  <div class="stack">
    <label v-for="person in store.characters" :key="person.id" class="check">
      <input
        type="checkbox"
        :checked="event.participants.some((item) => item.characterId === person.id)"
        @change="toggleParticipant(store, event, person.id, ($event.target as HTMLInputElement).checked)"
      >
      <span>{{ person.name }}</span>
    </label>
  </div>
  <InspectorDelete kind="event" :id="event.id" message="事件会从故事线和章节引用中移除。人物档案保留。" />
</template>