<script setup lang="ts">
import { computed } from "vue"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import OverviewShortcutGrid from "./OverviewShortcutGrid.vue"
import OverviewStats from "./OverviewStats.vue"
import { buildOverviewStats } from "./overviewHelpers"

const store = useWorkspace()

const stats = computed(() =>
  buildOverviewStats({
    characters: store.characters.length,
    relations: store.relations.length,
    events: store.events.length,
    chapters: store.chapters,
  }),
)

const shortcuts = computed(() => [
  { label: "人物", count: store.characters.length, hint: "新建档案" },
  { label: "关系", count: store.relations.length, hint: "牵线图谱" },
  { label: "事件", count: store.events.length, hint: "故事节点" },
  { label: "章节", count: store.chapters.length, hint: "正文写作" },
  { label: "故事线", count: store.arcs.length, hint: "线索编排" },
  { label: "时间线", count: store.events.length, hint: "浏览顺序" },
])

const shortcutActions = [
  () => store.createCharacter(),
  () => store.beginRelation(),
  () => store.createEvent(),
  () => store.createChapter(),
  () => store.createArc(),
  () => store.select(null, "timeline"),
] as const

function runShortcut(index: number) {
  shortcutActions[index]?.()
}
</script>

<template>
  <PageHead view="overview" meta="本机项目" />
  <p class="lede">{{ store.project?.description || "还没有简介。" }}</p>
  <OverviewStats :items="stats" />
  <p v-if="store.narrativeMismatch" class="lede timeline-note">{{ store.narrativeMismatch }}</p>
  <OverviewShortcutGrid :items="shortcuts" @run="runShortcut" />
</template>