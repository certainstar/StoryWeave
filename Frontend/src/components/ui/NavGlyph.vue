<script setup lang="ts">
import type { ViewId } from "../../domain/types"
import { NAV_GLYPH } from "../../domain/navGlyphs"

defineProps<{ view: ViewId }>()
</script>

<template>
  <svg class="nav-glyph" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path :d="NAV_GLYPH[view]" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
</template>