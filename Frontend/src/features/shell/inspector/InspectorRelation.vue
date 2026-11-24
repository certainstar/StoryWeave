<script setup lang="ts">
import type { Relation } from "../../../domain/types"
import { nameOf } from "./inspectorForm"
import { useWorkspace } from "../../../stores/workspace"
import VocabField from "../../../components/ui/VocabField.vue"
import InspectorDelete from "./InspectorDelete.vue"

defineProps<{ relation: Relation }>()
const store = useWorkspace()
</script>

<template>
  <h2>{{ relation.type }}</h2>
  <p class="lede">{{ nameOf(store, relation.sourceId) }} → {{ nameOf(store, relation.targetId) }}</p>
  <label class="field-label">起点</label>
  <select v-model="relation.sourceId" @change="store.scheduleRelation(relation.id)">
    <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
  </select>
  <label class="field-label">终点</label>
  <select v-model="relation.targetId" @change="store.scheduleRelation(relation.id)">
    <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
  </select>
  <VocabField
    id="relation-type"
    v-model="relation.type"
    vocab-category="relationTypes"
    label="类型"
    variant="inspector"
    :options="store.vocab.relationTypes"
    @change="store.scheduleRelation(relation.id)"
  />
  <VocabField
    id="relation-span"
    v-model="relation.span"
    vocab-category="relationSpans"
    label="区间"
    variant="inspector"
    :options="store.vocab.relationSpans"
    @change="store.scheduleRelation(relation.id)"
  />
  <label class="field-label">说明</label>
  <textarea v-model="relation.description" rows="4" @input="store.scheduleRelation(relation.id)"></textarea>
  <label class="check">
    <input v-model="relation.directional" type="checkbox" @change="store.scheduleRelation(relation.id)">
    <span>有方向</span>
  </label>
  <InspectorDelete kind="relation" :id="relation.id" message="只删除这条关系，两个人物都会保留。" />
</template>