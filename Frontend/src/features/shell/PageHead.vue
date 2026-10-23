<script setup lang="ts">
import { VIEWS, type ViewId } from "../../domain/types"

defineProps<{ view: ViewId; meta: string }>()

/** 获取页面信息。
 * 
 * @param id 页面 ID。
 * 
 * @returns 页面信息。
*/
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
