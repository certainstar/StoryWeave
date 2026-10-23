<script setup lang="ts">
import { computed } from "vue"
import { CHARACTER_STATUS } from "../../domain/types"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()

/** 获取人物列表。 
 * 
 * @param query 查询条件。
 * 
 * @returns 人物列表。
*/
const rows = computed(() => {
  const query = store.characterFilter.trim().toLowerCase()
  return store.characters.filter((character) => {
    const statusOk = store.statusFilter === "全部" || character.status === store.statusFilter
    const text = `${character.name} ${character.aliases.join(" ")}`.toLowerCase()
    return statusOk && (!query || text.includes(query))
  })
})
</script>

<template>
  <PageHead view="characters" :meta="`${rows.length} / ${store.characters.length} 人`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createCharacter()">新增人物</button>
    <select aria-label="按状态筛选" :value="store.statusFilter" @change="store.statusFilter = ($event.target as HTMLSelectElement).value">
      <option>全部</option>
      <option v-for="status in CHARACTER_STATUS" :key="status">{{ status }}</option>
    </select>
    <input
      :value="store.characterFilter"
      type="text"
      placeholder="按姓名或别名筛选"
      aria-label="按姓名或别名筛选"
      @input="store.characterFilter = ($event.target as HTMLInputElement).value"
    >
  </div>
  <table class="table">
    <thead><tr><th>姓名</th><th>身份</th><th>状态</th><th>目标</th></tr></thead>
    <tbody>
      <tr v-if="!rows.length"><td colspan="4">没有匹配的人物。</td></tr>
      <tr
        v-for="character in rows"
        :key="character.id"
        tabindex="0"
        :aria-selected="store.selection?.kind === 'character' && store.selection.id === character.id"
        @click="store.select({ kind: 'character', id: character.id })"
      >
        <td>{{ character.name }}</td>
        <td>{{ character.role || "未填写" }}</td>
        <td>{{ character.status }}</td>
        <td>{{ character.goal || "未填写" }}</td>
      </tr>
    </tbody>
  </table>
</template>
