<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useWorkspace } from "./stores/workspace"

const store = useWorkspace()
const bootError = ref("")

onMounted(async () => {
  try {
    await store.boot()
  } catch (error) {
    bootError.value = error instanceof Error ? error.message : "刚才这次没有打开。"
  }
})
</script>

<template>
  <p class="narrow-note">墨织按桌面工作台设计。请把窗口拉宽到 960 像素以上再使用。</p>
  <p v-if="bootError" class="boot-error">{{ bootError }}</p>
  <RouterView />
</template>
