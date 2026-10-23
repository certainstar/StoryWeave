<script setup lang="ts">
import { computed } from "vue"
import { VueFlow } from "@vue-flow/core"
import type { Edge, EdgeMouseEvent, Node, NodeDragEvent, NodeMouseEvent } from "@vue-flow/core"
import "@vue-flow/core/dist/style.css"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"
import CharacterNode from "./CharacterNode.vue"

const store = useWorkspace()

/** 获取关系类型列表。
 * 
 * @returns 关系类型列表。
*/
const types = computed(() => [...new Set(store.relations.map((relation) => relation.type))])

/** 获取可见关系列表。
 * 
 * @returns 可见关系列表。
*/
const visibleRelations = computed(() => store.relations.filter((relation) => !store.hiddenTypes.includes(relation.type)))

/** 获取节点列表。 
 * 
 * @returns 节点列表。
*/
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

/** 获取关系列表。 
 * 
 * @returns 关系列表。
*/
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

/** 切换关系类型。
 * 
 * @param type 关系类型。
 * @param checked 是否选中。
 * 
 * @returns 无返回值。
*/
function toggle(type: string, checked: boolean) {
  store.hiddenTypes = checked ? store.hiddenTypes.filter((item) => item !== type) : [...store.hiddenTypes, type]
}

/** 点击节点。
 * 
 * @param payload 节点事件。
 * 
 * @returns 无返回值。
*/
function onNodeClick(payload: NodeMouseEvent) {
  store.select({ kind: "character", id: payload.node.id })
}

/** 点击关系。
 * 
 * @param payload 关系事件。
 * 
 * @returns 无返回值。
*/
function onEdgeClick(payload: EdgeMouseEvent) {
  store.select({ kind: "relation", id: payload.edge.id })
}

/** 拖动节点。
 * 
 * @param payload 节点拖动事件。
 * 
 * @returns 无返回值。
*/
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
