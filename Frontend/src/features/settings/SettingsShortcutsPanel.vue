<script setup lang="ts">
import { VIEWS } from "../../domain/types"
import { viewShortcutLabel } from "../shell/viewShortcuts"

const rows = [
  ...VIEWS.map((view) => ({
    keys: viewShortcutLabel(view.index),
    action: view.label,
  })),
  { keys: "顶栏齿轮", action: "设置" },
  { keys: "Esc", action: "关闭浮层" },
]
</script>

<template>
  <article class="card settings-panel settings-shortcuts-card">
    <h2>快捷键</h2>
    <p class="lede">在输入框外使用；侧栏序号与键位一致。</p>
    <div class="shortcut-grid">
      <div v-for="row in rows" :key="`${row.keys}-${row.action}`" class="shortcut-chip">
        <kbd>{{ row.keys }}</kbd>
        <span>{{ row.action }}</span>
      </div>
    </div>
  </article>
</template>