<script setup lang="ts">
import { useRouter } from "vue-router"
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { useWorkspace } from "../../stores/workspace"

const store = useWorkspace()
const router = useRouter()

function back() {
  void router.push({ name: "overview", params: { id: store.project?.id } })
}
</script>

<template>
  <div class="settings-chrome app">
    <header class="topbar topbar-settings settings-topbar-minimal">
      <UiTooltip label="返回工作台" placement="right">
        <button class="icon-btn settings-back-btn" type="button" aria-label="返回工作台" @click="back">
          <AppIcon name="chevron-left" :size="24" :stroke-width="2" />
        </button>
      </UiTooltip>
    </header>
    <main class="workspace">
      <div class="workspace-scroll settings-page">
        <slot />
      </div>
    </main>
  </div>
</template>