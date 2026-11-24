<script setup lang="ts">
import { computed } from "vue"
import { useFeedback } from "../../stores/feedback"

const props = defineProps<{ path: string }>()
const feedback = useFeedback()

const parts = computed(() => {
  const raw = props.path.trim()
  if (!raw) return { dir: "", file: "", short: "" }
  const slash = Math.max(raw.lastIndexOf("/"), raw.lastIndexOf("\\"))
  if (slash < 0) return { dir: "", file: raw, short: raw }
  return {
    dir: raw.slice(0, slash),
    file: raw.slice(slash + 1),
    short: raw,
  }
})

async function copyPath() {
  const text = parts.value.short
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    feedback.pushToast("路径已复制", "success", 1800)
  } catch {
    feedback.pushToast("无法复制到剪贴板", "error")
  }
}
</script>

<template>
  <article class="card settings-panel data-path-card">
    <div class="data-path-head">
      <h2>数据位置</h2>
      <button
        v-if="parts.short"
        class="icon-btn"
        type="button"
        title="复制完整路径"
        aria-label="复制完整路径"
        @click="copyPath"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M8 4h9a2 2 0 0 1 2 2v11h-2V6H8V4zm-3 3h9a2 2 0 0 1 2 2v11H7a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" /></svg>
      </button>
    </div>
    <p v-if="!parts.short" class="empty">项目还没有打开。</p>
    <template v-else>
      <p class="lede">本机 SQLite 项目文件</p>
      <div class="data-path-body">
        <span class="data-path-dir" :title="parts.dir">{{ parts.dir }}</span>
        <strong class="data-path-file">{{ parts.file }}</strong>
      </div>
    </template>
  </article>
</template>