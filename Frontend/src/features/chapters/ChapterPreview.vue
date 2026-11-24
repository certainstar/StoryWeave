<script setup lang="ts">
import { computed } from "vue"
import { renderMarkdown } from "../../domain/markdown"

const props = defineProps<{ content: string }>()

const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="preview markdown-body" role="article" aria-label="章节预览" v-html="html" />
</template>