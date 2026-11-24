<script setup lang="ts">
import { ref } from "vue"
import type { StoryArc } from "../../../domain/types"
import { addArcEvent, eventTitle, eventsNotIn, moveArcEvent } from "./inspectorForm"
import { useWorkspace } from "../../../stores/workspace"
import InspectorDelete from "./InspectorDelete.vue"
import InspectorSectionLabel from "./InspectorSectionLabel.vue"
import VocabField from "../../../components/ui/VocabField.vue"
import InspectorTextArea from "./InspectorTextArea.vue"
import InspectorTextField from "./InspectorTextField.vue"

defineProps<{ arc: StoryArc }>()
const store = useWorkspace()
const arcAddId = ref("")
</script>

<template>
  <h2>{{ arc.title }}</h2>
  <InspectorTextField v-model="arc.title" label="标题" @input="store.scheduleArc(arc.id)" />
  <VocabField
    id="arc-kind"
    v-model="arc.kind"
    vocab-category="arcKinds"
    label="类型"
    variant="inspector"
    :options="store.vocab.arcKinds"
    @change="store.scheduleArc(arc.id)"
  />
  <InspectorTextArea v-model="arc.summary" label="简介" @input="store.scheduleArc(arc.id)" />
  <InspectorSectionLabel text="事件顺序" />
  <div v-for="(eventId, index) in arc.eventIds" :key="eventId" class="toolbar">
    <span>{{ index + 1 }}. {{ eventTitle(store, eventId) }}</span>
    <button class="btn" type="button" @click="moveArcEvent(store, arc, eventId, -1)">上移</button>
    <button class="btn" type="button" @click="moveArcEvent(store, arc, eventId, 1)">下移</button>
    <button class="btn" type="button" @click="store.setArcEvents(arc.id, arc.eventIds.filter((id) => id !== eventId))">移出</button>
  </div>
  <p v-if="!arc.eventIds.length" class="empty">还没有事件。</p>
  <div class="toolbar">
    <select v-model="arcAddId" aria-label="加入事件">
      <option value="">选择事件…</option>
      <option v-for="item in eventsNotIn(store, arc.eventIds)" :key="item.id" :value="item.id">{{ item.title }}</option>
    </select>
    <button class="btn" type="button" @click="addArcEvent(store, arc, arcAddId)">加入</button>
  </div>
  <InspectorDelete kind="arc" :id="arc.id" message="只删除这条故事线，事件本身保留。" />
</template>