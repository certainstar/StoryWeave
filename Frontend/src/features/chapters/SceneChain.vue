<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue"
import { handleLinearArrowKey } from "../../domain/gridKeyboard"
import { reorderIds } from "../../domain/reorder"
import { useWorkspace } from "../../stores/workspace"
import SceneCard from "./SceneCard.vue"
import { scenesForChapter } from "./sceneHelpers"

const props = defineProps<{ chapterId: string }>()
const store = useWorkspace()
const track = useTemplateRef("track")
const dragId = ref("")

const scenes = computed(() => scenesForChapter(store.scenes, props.chapterId))

function pick(sceneId: string) {
  store.select({ kind: "scene", id: sceneId }, "chapters")
}

function onDrop(targetId: string) {
  if (!dragId.value || dragId.value === targetId) return
  const ids = scenes.value.map((scene) => scene.id)
  const from = ids.indexOf(dragId.value)
  const to = ids.indexOf(targetId)
  dragId.value = ""
  void store.moveScene(props.chapterId, reorderIds(ids, from, to))
}

async function nudge(sceneId: string, delta: -1 | 1) {
  const ids = scenes.value.map((scene) => scene.id)
  const from = ids.indexOf(sceneId)
  const to = from + delta
  if (from < 0 || to < 0 || to >= ids.length) return
  await store.moveScene(props.chapterId, reorderIds(ids, from, to))
}

function onTrackKey(event: KeyboardEvent) {
  const el = track.value
  if (!el) return
  const current = store.selection?.kind === "scene" ? store.selection.id : undefined
  handleLinearArrowKey(event, scenes.value.map((s) => s.id), current, true, (id) => {
    pick(id)
    el.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ inline: "nearest", block: "nearest" })
  })
}
</script>

<template>
  <div class="scene-chain">
    <div class="scene-chain-head">
      <h3>场景串联</h3>
      <button class="btn" type="button" @click="store.createScene(chapterId)">新增场景</button>
    </div>
    <p v-if="!scenes.length" class="empty">这一章还没有场景。拖拽卡片可调整叙述节拍。</p>
    <ol
      v-else
      ref="track"
      class="scene-track"
      tabindex="0"
      aria-label="章节场景"
      @keydown="onTrackKey"
    >
      <SceneCard
        v-for="(scene, index) in scenes"
        :key="scene.id"
        :scene="scene"
        :index="index"
        :selected="store.selection?.kind === 'scene' && store.selection.id === scene.id"
        :dragging="dragId === scene.id"
        @select="pick(scene.id)"
        @drag-start="dragId = scene.id"
        @drag-end="dragId = ''"
        @drop="onDrop(scene.id)"
        @nudge="(delta) => nudge(scene.id, delta)"
      />
    </ol>
  </div>
</template>