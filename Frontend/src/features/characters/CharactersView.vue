<script setup lang="ts">
import { computed, useTemplateRef } from "vue"
import { handleGridArrowKey } from "../../domain/gridKeyboard"
import SwSelect from "../../components/ui/SwSelect.vue"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import CharacterCard from "./CharacterCard.vue"
import { filterCharacters } from "./characterHelpers"

const store = useWorkspace()

const grid = useTemplateRef("grid")
const rows = computed(() => filterCharacters(store.characters, store.statusFilter, store.characterFilter))

const statusOptions = computed(() => {
  const set = new Set(store.vocab.characterStatus)
  for (const person of store.characters) {
    if (person.status) set.add(person.status)
  }
  return ["全部", ...set]
})

function onGridKey(event: KeyboardEvent) {
  const current = store.selection?.kind === "character" ? store.selection.id : undefined
  handleGridArrowKey(event, rows.value.map((row) => row.id), current, 1, (id) => {
    store.select({ kind: "character", id })
    grid.value?.querySelector(`[data-id="${id}"]`)?.scrollIntoView({ block: "nearest" })
  })
}
</script>

<template>
  <PageHead view="characters" :meta="`${rows.length} / ${store.characters.length} 人`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.createCharacter()">新增人物</button>
    <SwSelect
      id="character-status-filter"
      :model-value="store.statusFilter"
      :options="statusOptions"
      aria-label="按状态筛选"
      @update:model-value="store.statusFilter = $event"
    />
    <input
      :value="store.characterFilter"
      type="search"
      placeholder="按姓名或别名筛选"
      aria-label="按姓名或别名筛选"
      @input="store.characterFilter = ($event.target as HTMLInputElement).value"
    >
  </div>
  <p v-if="!rows.length" class="empty">没有匹配的人物。</p>
  <div
    v-else
    ref="grid"
    class="char-grid"
    tabindex="0"
    aria-label="人物列表"
    @keydown="onGridKey"
  >
    <CharacterCard
      v-for="character in rows"
      :key="character.id"
      :data-id="character.id"
      :character="character"
      :selected="store.selection?.kind === 'character' && store.selection.id === character.id"
      @select="store.select({ kind: 'character', id: character.id })"
    />
  </div>
</template>