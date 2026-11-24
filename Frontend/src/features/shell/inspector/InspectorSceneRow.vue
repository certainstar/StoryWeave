<script setup lang="ts">
import type { Scene } from "../../../domain/types"
import { useWorkspace } from "../../../stores/workspace"

const { scene } = defineProps<{ scene: Scene }>()
const store = useWorkspace()

function asking(id: string) {
  return store.confirm?.kind === "scene" && store.confirm.id === id
}
</script>

<template>
  <article class="inspector-scene">
    <label class="field-label">场景标题</label>
    <input v-model="scene.title" type="text" @input="store.scheduleScene(scene.id)">
    <label class="field-label">故事内时间</label>
    <input :value="scene.storyTime ?? ''" type="text" @input="scene.storyTime = ($event.target as HTMLInputElement).value; store.scheduleScene(scene.id)">
    <label class="field-label">摘要</label>
    <textarea v-model="scene.summary" rows="2" @input="store.scheduleScene(scene.id)"></textarea>
    <div v-if="asking(scene.id)" class="confirm">
      <p>删除这个场景。章节会保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <button v-else class="btn danger" type="button" @click="store.askDelete('scene', scene.id, '')">删除场景</button>
  </article>
</template>