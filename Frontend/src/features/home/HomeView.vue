<script setup lang="ts">
import { ref } from "vue"
import { ApiError } from "../../repositories"
import { useWorkspace } from "../../stores/workspace"
import ProjectCreateForm from "./ProjectCreateForm.vue"
import RecentProjectRow from "./RecentProjectRow.vue"

const store = useWorkspace()
const name = ref("")
const description = ref("")
const error = ref("")
const busy = ref(false)

async function run(action: () => Promise<unknown>) {
  error.value = ""
  busy.value = true
  try {
    await action()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "刚才这次没有保存。可以重试。"
  } finally {
    busy.value = false
  }
}

function create() {
  return run(() => store.createProject(name.value, description.value))
}

function sample() {
  return run(() => store.seedSample())
}
</script>

<template>
  <div class="home">
    <div class="home-card">
      <div class="home-brand">
        <img class="mark" src="/icon.png" width="56" height="56" alt="">
        <div>
          <h1>墨织</h1>
          <p class="lede home-tagline">轻量级本地小说工作台：人物、关系、时间线与章节写作。</p>
        </div>
      </div>
      <div class="home-panel">
        <ProjectCreateForm v-model:name="name" v-model:description="description" :busy="busy" :error="error" @submit="create" @sample="sample" />
      </div>
      <section class="recent home-panel">
        <h2>最近项目</h2>
        <p v-if="!store.recentDisplay.length" class="empty">还没有项目。</p>
        <RecentProjectRow
          v-for="item in store.recentDisplay"
          :key="item.id"
          :item="item"
          @open="store.openProject(item.id)"
          @remove="store.deleteProject(item.id)"
        />
      </section>
    </div>
  </div>
</template>