<script setup lang="ts">
import { VIEWS, type ViewId } from "../../domain/types"

defineProps<{ view: ViewId; meta: string }>()

const page = (id: ViewId) => VIEWS.find((item) => item.id === id)!
</script>

<template>
  <header class="ws-head">
    <div class="ws-title">
      <span class="folio">{{ page(view).index }}</span>
      <div>
        <h1>{{ page(view).label }}</h1>
        <p>{{ page(view).blurb }}</p>
      </div>
    </div>
    <p class="ws-meta">{{ meta }}</p>
  </header>
</template>
