<script setup lang="ts">
import type { Character } from "../../../domain/types"
import { applyAliases, nameOf, relationsOf } from "./inspectorForm"
import { useWorkspace } from "../../../stores/workspace"
import VocabField from "../../../components/ui/VocabField.vue"
import InspectorDelete from "./InspectorDelete.vue"

const { character } = defineProps<{ character: Character }>()
const store = useWorkspace()
</script>

<template>
  <h2>{{ character.name }}</h2>
  <p class="lede">{{ character.status }} · {{ character.role || "未填写身份" }}</p>
  <label class="field-label">姓名</label>
  <input v-model="character.name" type="text" @input="store.scheduleCharacter(character.id)">
  <label class="field-label">别名</label>
  <input :value="character.aliases.join('、')" type="text" @input="applyAliases(($event.target as HTMLInputElement).value, character, store)">
  <label class="field-label">身份</label>
  <input v-model="character.role" type="text" @input="store.scheduleCharacter(character.id)">
  <VocabField
    id="character-status"
    v-model="character.status"
    vocab-category="characterStatus"
    label="状态"
    variant="inspector"
    placeholder="在场、场外或自定义"
    :options="store.vocab.characterStatus"
    @change="store.scheduleCharacter(character.id)"
  />
  <label class="field-label">外貌</label>
  <textarea v-model="character.appearance" rows="3" @input="store.scheduleCharacter(character.id)"></textarea>
  <label class="field-label">性格</label>
  <textarea v-model="character.personality" rows="3" @input="store.scheduleCharacter(character.id)"></textarea>
  <label class="field-label">目标</label>
  <textarea v-model="character.goal" rows="2" @input="store.scheduleCharacter(character.id)"></textarea>
  <label class="field-label">背景</label>
  <textarea v-model="character.background" rows="3" @input="store.scheduleCharacter(character.id)"></textarea>
  <label class="field-label">备注</label>
  <textarea v-model="character.notes" rows="2" @input="store.scheduleCharacter(character.id)"></textarea>
  <p class="field-label">关系</p>
  <ul class="links">
    <li v-for="item in relationsOf(store, character.id)" :key="item.id">
      <button class="linkish" type="button" @click="store.select({ kind: 'relation', id: item.id }, 'graph')">
        {{ item.type }} · {{ nameOf(store, item.sourceId) }} → {{ nameOf(store, item.targetId) }}
      </button>
    </li>
  </ul>
  <InspectorDelete kind="character" :id="character.id" message="删除这个人物会同时移除相关关系。章节和事件会保留，只解除关联。">
    <button class="btn" type="button" @click="store.beginRelation(character.id)">建立关系</button>
  </InspectorDelete>
</template>