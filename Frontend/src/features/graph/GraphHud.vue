<script setup lang="ts">
import { Panel, useVueFlow } from "@vue-flow/core"
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { useWorkspace } from "../../stores/workspace"
import { useGraphFitShortcut } from "./useGraphShortcuts"

const store = useWorkspace()
const { fitView } = useVueFlow()

function fit() {
  void fitView({ padding: 0.2, duration: 220 })
}

useGraphFitShortcut(fit)
</script>

<template>
  <Panel position="top-left" class="graph-hud-panel">
    <div class="graph-hud">
      <UiTooltip label="新建人物档案" placement="bottom">
        <button class="graph-hud-btn" type="button" aria-label="新建人物档案" @click="store.createCharacter()">
          <AppIcon name="users" :size="18" :stroke-width="1.75" />
        </button>
      </UiTooltip>
      <UiTooltip label="建立关系" placement="bottom">
        <button class="graph-hud-btn" type="button" aria-label="建立关系" @click="store.beginRelation()">
          <AppIcon name="git-branch" :size="18" :stroke-width="1.75" />
        </button>
      </UiTooltip>
      <UiTooltip label="适应画布 (f)" placement="bottom">
        <button class="graph-hud-btn" type="button" aria-label="适应画布" @click="fit">
          <AppIcon name="layout-dashboard" :size="18" :stroke-width="1.75" />
        </button>
      </UiTooltip>
    </div>
  </Panel>
</template>