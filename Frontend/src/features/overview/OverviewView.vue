<script setup lang="ts">
import { computed } from "vue"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()
/** 未完成章节的数量。 */
const openChapters = computed(() => store.chapters.filter((chapter) => chapter.status !== "完成").length)
</script>

<template>
  <PageHead view="overview" meta="本机项目" />
  <p class="lede">{{ store.project?.description || "还没有简介。" }}</p>
  <div class="stats">
    <div class="stat"><b>{{ store.characters.length }}</b><span>人物</span></div>
    <div class="stat"><b>{{ store.relations.length }}</b><span>关系</span></div>
    <div class="stat"><b>{{ store.events.length }}</b><span>事件</span></div>
    <div class="stat"><b>{{ openChapters }}</b><span>未完成章节</span></div>
  </div>
  <p v-if="store.narrativeMismatch">{{ store.narrativeMismatch }}</p>
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createCharacter()">新增人物</button>
    <button class="btn" type="button" @click="store.createEvent()">新增事件</button>
    <button class="btn" type="button" @click="store.createChapter()">新建章节</button>
    <button class="btn" type="button" @click="store.select(null, 'timeline')">打开时间线</button>
  </div>
</template>
