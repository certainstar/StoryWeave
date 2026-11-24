<script setup lang="ts">
import { computed } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { VIEWS, type ViewId } from "../../domain/types"

const props = defineProps<{ view: ViewId; meta: string }>()

const page = computed(() => VIEWS.find((item) => item.id === props.view)!)
</script>

<template>
  <header class="ws-head">
    <div class="ws-title">
      <span class="folio">{{ page.index }}</span>
      <div class="ws-title-text">
        <UiTooltip :label="page.blurb" placement="bottom">
          <span class="ws-title-row">
            <h1>{{ page.label }}</h1>
            <span class="ws-tip-icon" aria-hidden="true">
              <AppIcon name="help" :size="14" />
            </span>
          </span>
        </UiTooltip>
      </div>
    </div>
    <p class="ws-meta">{{ meta }}</p>
  </header>
</template>