<script setup lang="ts">
import { onMounted, ref } from "vue"
import { useWorkspace } from "./stores/workspace"

const store = useWorkspace()
const bootError = ref("")

onMounted(async () => {
  try {
    // 初始化工作台，加载项目和数据
    await store.boot()
  } catch (error) {
    // 如果初始化失败，显示错误信息
    bootError.value = error instanceof Error ? error.message : "应用初始化失败，请稍后重试。"
  }
})
</script>

<template>
  <p class="narrow-note">墨织提示: 窗口宽度达到 960 像素以上使用效果更佳～</p>
  <p v-if="bootError" class="boot-error">{{ bootError }}</p>
  <RouterView />
</template>
