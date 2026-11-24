<script setup lang="ts">
import type { ThemeId } from "../../domain/types"
import { useFeedback } from "../../stores/feedback"
import { slotText } from "../../plugins/host"
import { useWorkspace } from "../../stores/workspace"
import SettingsDataPanel from "./SettingsDataPanel.vue"
import SettingsPageShell from "./SettingsPageShell.vue"
import SettingsShortcutsPanel from "./SettingsShortcutsPanel.vue"
import SettingsSnapshotPanel from "./SettingsSnapshotPanel.vue"
import SettingsThemePicker from "./SettingsThemePicker.vue"

const store = useWorkspace()
const feedback = useFeedback()
const slots = slotText("settings")

const sections = [
  { id: "theme" as const, label: "主题", keywords: "宣纸 夜墨 山海 龙凤 四君子 外观", icon: "palette" as const },
  { id: "draft" as const, label: "离开页面", keywords: "自动保存 草稿 切换", icon: "book-open" as const },
  { id: "data" as const, label: "数据路径", keywords: "文件 目录 sqlite", icon: "folder-open" as const },
  { id: "snapshots" as const, label: "快照", keywords: "备份 恢复", icon: "layers" as const },
  { id: "shortcuts" as const, label: "快捷键", keywords: "键盘 1 2 3", icon: "search" as const },
  { id: "plugins" as const, label: "插件", keywords: "扩展", icon: "layers" as const },
  { id: "model" as const, label: "模型", keywords: "AI 辅助", icon: "settings" as const },
  { id: "danger" as const, label: "危险操作", keywords: "删除 项目", icon: "close" as const },
]

async function confirmDeleteProject() {
  if (!store.project) return
  const ok = await feedback.askConfirm({
    title: "删除项目",
    message: "删除项目会移除本机上的项目文件和快照，此操作无法撤销。",
    confirmLabel: "删除",
    cancelLabel: "保留",
    danger: true,
  })
  if (!ok || !store.project) return
  await store.deleteProject(store.project.id)
}
</script>

<template>
  <SettingsPageShell :sections="sections">
    <template #default="{ active }">
      <div v-show="active === 'theme'" class="settings-panel-wrap">
        <SettingsThemePicker :current="store.theme" @pick="(id) => store.setTheme(id as ThemeId)" />
      </div>
      <article v-show="active === 'draft'" class="card settings-panel settings-panel-wrap">
        <h2>离开页面</h2>
        <p>切换功能栏时，若还有未落盘的改动：</p>
        <div class="toolbar">
          <label class="filter">
            <input v-model="store.leaveDraft" type="radio" value="autosave" @change="store.setLeaveDraft('autosave')">
            自动保存
          </label>
          <label class="filter">
            <input v-model="store.leaveDraft" type="radio" value="prompt" @change="store.setLeaveDraft('prompt')">
            询问我
          </label>
          <label class="filter">
            <input v-model="store.leaveDraft" type="radio" value="ignore" @change="store.setLeaveDraft('ignore')">
            忽略
          </label>
        </div>
      </article>
      <div v-show="active === 'data'" class="settings-panel-wrap">
        <SettingsDataPanel v-if="store.project?.path" :path="store.project.path" />
      </div>
      <div v-show="active === 'snapshots'" class="settings-panel-wrap">
        <SettingsSnapshotPanel
          :snapshots="store.snapshots"
          @backup="store.makeBackup()"
          @restore="(at) => store.restoreBackup(at)"
        />
      </div>
      <div v-show="active === 'shortcuts'" class="settings-panel-wrap">
        <SettingsShortcutsPanel />
      </div>
      <article v-show="active === 'plugins'" class="card settings-panel settings-panel-wrap">
        <h2>插件</h2>
        <p v-for="plugin in store.plugins" :key="plugin.id">{{ plugin.name }}</p>
        <p v-for="text in slots" :key="text">{{ text }}</p>
      </article>
      <article v-show="active === 'model'" class="card settings-panel settings-panel-wrap">
        <h2>模型</h2>
        <p>模型辅助不在当前版本里。这里没有可调用的模型，也不会发送正文。</p>
      </article>
      <article v-show="active === 'danger' && store.project" class="card settings-panel settings-panel-wrap">
        <h2>危险操作</h2>
        <p>删除项目会移除本机上的项目文件和快照。</p>
        <button class="btn danger" type="button" @click="confirmDeleteProject">删除当前项目</button>
      </article>
    </template>
  </SettingsPageShell>
</template>