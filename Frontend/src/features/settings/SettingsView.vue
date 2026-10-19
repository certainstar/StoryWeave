<script setup lang="ts">
import { slotText } from "../../plugins/host"
import { useWorkspace } from "../../stores/workspace"
import PageHead from "../shell/PageHead.vue"

const store = useWorkspace()
const slots = slotText("settings")

async function restore(snapshotAt: string) {
  if (!window.confirm("用这份快照替换当前项目？替换前会再留一份。")) return
  await store.restoreBackup(snapshotAt)
}
</script>

<template>
  <PageHead view="settings" :meta="store.theme === 'ink' ? '夜墨' : '宣纸'" />
  <div class="theme-choices">
    <button class="theme-card" :class="{ 'is-on': store.theme === 'paper' }" type="button" :aria-pressed="store.theme === 'paper'" @click="store.setTheme('paper')">
      <span class="swatch paper"></span>
      <strong>宣纸</strong>
      <span>浅色工作台，适合长时间看正文。</span>
    </button>
    <button class="theme-card" :class="{ 'is-on': store.theme === 'ink' }" type="button" :aria-pressed="store.theme === 'ink'" @click="store.setTheme('ink')">
      <span class="swatch ink"></span>
      <strong>夜墨</strong>
      <span>深色工作台，关系图和正文仍保持同一套结构。</span>
    </button>
  </div>
  <article class="card">
    <h2>数据位置</h2>
    <p>{{ store.project?.path || "项目还没有打开。" }}</p>
  </article>
  <article class="card">
    <h2>快照</h2>
    <p>默认保留最近 10 份。恢复前会再做一份。</p>
    <div class="toolbar">
      <button class="btn primary" type="button" @click="store.makeBackup()">做一份快照</button>
    </div>
    <p v-if="!store.snapshots.length" class="empty">还没有快照。</p>
    <div v-for="snapshot in store.snapshots" :key="snapshot.snapshotAt" class="toolbar">
      <span>{{ snapshot.snapshotAt }}</span>
      <button class="btn" type="button" @click="restore(snapshot.snapshotAt)">恢复</button>
    </div>
  </article>
  <article class="card">
    <h2>插件</h2>
    <p v-for="plugin in store.plugins" :key="plugin.id">{{ plugin.name }}</p>
    <p v-for="text in slots" :key="text">{{ text }}</p>
  </article>
  <article class="card">
    <h2>模型</h2>
    <p>模型辅助不在当前版本里。这里没有可调用的模型，也不会发送正文。</p>
  </article>
</template>
