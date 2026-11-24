<script setup lang="ts">
import type { Chapter, Scene } from "../../../domain/types"
import { toggleId } from "./inspectorForm"
import VocabField from "../../../components/ui/VocabField.vue"
import InspectorDelete from "./InspectorDelete.vue"
import InspectorSceneRow from "./InspectorSceneRow.vue"
import { useWorkspace } from "../../../stores/workspace"

defineProps<{ chapter: Chapter; scenes: Scene[] }>()
const store = useWorkspace()
</script>

<template>
  <h2>{{ chapter.title }}</h2>
  <label class="field-label">标题</label>
  <input v-model="chapter.title" type="text" @input="store.scheduleChapter(chapter.id)">
  <VocabField
    id="chapter-status"
    v-model="chapter.status"
    vocab-category="chapterStatus"
    label="状态"
    variant="inspector"
    :options="store.vocab.chapterStatus"
    @change="store.scheduleChapter(chapter.id)"
  />
  <label class="field-label">摘要</label>
  <textarea v-model="chapter.summary" rows="3" @input="store.scheduleChapter(chapter.id)"></textarea>
  <div class="toolbar">
    <button class="btn" type="button" @click="store.moveChapter(chapter.id, -1)">上移</button>
    <button class="btn" type="button" @click="store.moveChapter(chapter.id, 1)">下移</button>
  </div>
  <p class="field-label">出场人物</p>
  <div class="stack">
    <label v-for="person in store.characters" :key="person.id" class="check">
      <input
        type="checkbox"
        :checked="chapter.characterIds.includes(person.id)"
        @change="chapter.characterIds = toggleId(chapter.characterIds, person.id, ($event.target as HTMLInputElement).checked); store.scheduleChapter(chapter.id)"
      >
      <span>{{ person.name }}</span>
    </label>
  </div>
  <p class="field-label">相关事件</p>
  <div class="stack">
    <label v-for="item in store.events" :key="item.id" class="check">
      <input
        type="checkbox"
        :checked="chapter.eventIds.includes(item.id)"
        @change="chapter.eventIds = toggleId(chapter.eventIds, item.id, ($event.target as HTMLInputElement).checked); store.scheduleChapter(chapter.id)"
      >
      <span>{{ item.title }}</span>
    </label>
  </div>
  <p class="field-label">场景</p>
  <InspectorSceneRow v-for="scene in scenes" :key="scene.id" :scene="scene" />
  <p v-if="!scenes.length" class="empty">这一章还没有场景。</p>
  <div class="inspector-actions">
    <button class="btn" type="button" @click="store.createScene(chapter.id)">新增场景</button>
  </div>
  <InspectorDelete kind="chapter" :id="chapter.id" message="删除这一章和它下面的场景。人物和事件保留。" />
</template>