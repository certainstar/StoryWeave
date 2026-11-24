<script setup lang="ts">
import { VueFlow } from "@vue-flow/core"
import type { EdgeMouseEvent, NodeDragEvent, NodeMouseEvent } from "@vue-flow/core"
import "@vue-flow/core/dist/style.css"
import PageHead from "../shell/PageHead.vue"
import CharacterNode from "./CharacterNode.vue"
import GraphHud from "./GraphHud.vue"
import GraphTypeFilterSelect from "./GraphTypeFilterSelect.vue"
import { useGraphLayout } from "./useGraphLayout"

const { store, typesInUse, visibleRelations, graphEmpty, nodes, edges, defaultEdgeOptions } = useGraphLayout()

function toggle(type: string, checked: boolean) {
  store.hiddenTypes = checked ? store.hiddenTypes.filter((item) => item !== type) : [...store.hiddenTypes, type]
}

function showAllTypes() {
  store.hiddenTypes = []
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
  <div class="graph-command-bar graph-command-inline">
    <button class="btn primary graph-create-btn-inline" type="button" @click="store.beginRelation()">建立关系</button>
    <GraphTypeFilterSelect :types="typesInUse" :hidden="store.hiddenTypes" @toggle="toggle" @show-all="showAllTypes" />
  </div>
  <p v-if="graphEmpty" class="empty graph-empty-hint">当前筛选下没有可见关系。请在右侧下拉中勾选类型，或点「全部显示」。</p>
  <div class="graph-board" role="application" aria-label="人物关系图">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :default-edge-options="defaultEdgeOptions"
      :min-zoom="0.4"
      :max-zoom="1.6"
      fit-view-on-init
      :nodes-focusable="true"
      @node-click="onNodeClick"
      @edge-click="onEdgeClick"
      @node-drag-stop="onDrag"
    >
      <template #node-character="props">
        <CharacterNode :data="props.data" :selected="props.selected" />
      </template>
      <GraphHud />
    </VueFlow>
  </div>
</template>