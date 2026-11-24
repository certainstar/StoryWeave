<script setup lang="ts">
import InspectorArc from "./inspector/InspectorArc.vue"
import InspectorChapter from "./inspector/InspectorChapter.vue"
import InspectorCharacter from "./inspector/InspectorCharacter.vue"
import InspectorEmpty from "./inspector/InspectorEmpty.vue"
import InspectorEvent from "./inspector/InspectorEvent.vue"
import InspectorNote from "./inspector/InspectorNote.vue"
import InspectorProject from "./inspector/InspectorProject.vue"
import InspectorRelation from "./inspector/InspectorRelation.vue"
import InspectorSettings from "./inspector/InspectorSettings.vue"
import { INSPECTOR_HINTS } from "./inspector/inspectorHints"
import { useInspectorSelection } from "./useInspectorSelection"

const { store, view, character, relation, event, arc, chapter, note, chapterScenes } = useInspectorSelection()
</script>

<template>
  <InspectorProject v-if="view === 'overview' && store.project" />
  <InspectorSettings v-else-if="view === 'settings'" />
  <InspectorCharacter v-else-if="character" :character="character" />
  <InspectorRelation v-else-if="relation" :relation="relation" />
  <InspectorEvent v-else-if="event" :event="event" />
  <InspectorArc v-else-if="arc" :arc="arc" />
  <InspectorChapter v-else-if="chapter" :chapter="chapter" :scenes="chapterScenes" />
  <InspectorNote v-else-if="note" :note="note" />
  <InspectorEmpty v-else :hint="INSPECTOR_HINTS[view] || '选择一条记录。'" />
</template>