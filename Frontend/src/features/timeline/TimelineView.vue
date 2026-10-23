<script setup lang="ts">
import { computed } from "vue"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()
/** 按顺序排列的事件列表。 */
const sorted = computed(() => [...store.events].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "zh")))

/** 获取人物名称列表。 
 * 
 * @param ids 人物 ID 列表。
 * 
 * @returns 人物名称列表。
*/
function people(ids: string[]) {
  const names = ids.map((id) => store.characters.find((character) => character.id === id)?.name).filter(Boolean)
  return names.join("、") || "没有参与者"
}

/** 获取事件首次叙述的章节。
 * 
 * @param eventId 事件 ID。
 * 
 * @returns 首次叙述的章节。
*/
function firstChapter(eventId: string) {
  return [...store.chapters].filter((chapter) => chapter.eventIds.includes(eventId)).sort((a, b) => a.sortOrder - b.sortOrder)[0]
}
</script>

<template>
  <PageHead view="timeline" :meta="`${store.events.length} 个事件`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createEvent()">新增事件</button>
  </div>
  <ol class="timeline">
    <li
      v-for="event in sorted"
      :key="event.id"
      tabindex="0"
      :aria-selected="store.selection?.kind === 'event' && store.selection.id === event.id"
      @click="store.select({ kind: 'event', id: event.id })"
    >
      <div class="when">{{ event.storyTime || "未知" }}</div>
      <div class="rail" aria-hidden="true"><span class="dot"></span></div>
      <div class="event-body">
        <strong>{{ event.title }}</strong>
        <p class="lede">{{ event.description || "没有说明。" }}</p>
        <p class="lede">
          {{ people(event.participants.map((item) => item.characterId)) }}
          ·
          {{ firstChapter(event.id) ? `首次叙述于第 ${firstChapter(event.id)?.sortOrder} 章 ${firstChapter(event.id)?.title}` : "尚未写入章节" }}
        </p>
        <div class="toolbar">
          <button class="btn" type="button" @click.stop="store.moveEvent(event.id, -1)">上移</button>
          <button class="btn" type="button" @click.stop="store.moveEvent(event.id, 1)">下移</button>
        </div>
      </div>
    </li>
  </ol>
</template>
