<script setup lang="ts">
import { computed } from "vue"
import { VueFlow } from "@vue-flow/core"
import type { Edge, EdgeMouseEvent, Node, NodeDragEvent, NodeMouseEvent } from "@vue-flow/core"
import "@vue-flow/core/dist/style.css"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import CharacterNode from "./CharacterNode.vue"

const store = useWorkspace()

const types = computed(() => [...new Set(store.relations.map((relation) => relation.type))])
const visibleRelations = computed(() => store.relations.filter((relation) => !store.hiddenTypes.includes(relation.type)))

const nodes = computed<Node[]>(() =>
  store.characters.map((character, index) => {
    const pos = store.layout.nodes[character.id] ?? { x: 40 + (index % 4) * 210, y: 40 + Math.floor(index / 4) * 150 }
    return {
      id: character.id,
      type: "character",
      position: { ...pos },
      data: {
        name: character.name,
        role: character.role,
        index: String(index + 1).padStart(2, "0"),
      },
    }
  }),
)

const edges = computed<Edge[]>(() =>
  visibleRelations.value.map((relation) => ({
    id: relation.id,
    source: relation.sourceId,
    target: relation.targetId,
    label: relation.type,
    type: "default",
    style: store.selection?.kind === "relation" && store.selection.id === relation.id
      ? { stroke: "var(--seal)", strokeWidth: 2.4 }
      : { stroke: "var(--ink)", strokeWidth: 1.6 },
  })),
)

function toggle(type: string, checked: boolean) {
  store.hiddenTypes = checked ? store.hiddenTypes.filter((item) => item !== type) : [...store.hiddenTypes, type]
}

function onNodeClick(payload: NodeMouseEvent) {
  store.select({ kind: "character", id: payload.node.id })
}

function onEdgeClick(payload: EdgeMouseEvent) {
  store.select({ kind: "relation", id: payload.edge.id })
}

function onDrag(payload: NodeDragEvent) {
  const node = payload.node
  store.layout.nodes[node.id] = { x: node.position.x, y: node.position.y }
  store.scheduleLayout(node.id)
}
</script>

<template>
  <PageHead view="graph" :meta="`${store.characters.length} 个节点 · ${visibleRelations.length} 条关系`" />
  <div class="toolbar">
    <button class="btn primary" type="button" @click="store.beginRelation()">建立关系</button>
    <div class="filters">
      <label v-for="type in types" :key="type" class="filter">
        <input type="checkbox" :checked="!store.hiddenTypes.includes(type)" @change="toggle(type, ($event.target as HTMLInputElement).checked)">
        {{ type }}
      </label>
    </div>
  </div>
  <div class="graph-board">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :min-zoom="0.4"
      :max-zoom="1.6"
      fit-view-on-init
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @node-drag-stop="onDrag"
    >
      <template #node-character="props">
        <CharacterNode :data="props.data" :selected="props.selected" />
      </template>
    </VueFlow>
  </div>
</template>
