<script setup lang="ts">
import { ref } from "vue"
import { ApiError } from "../../repositories"
import { useWorkspace } from "../../stores/workspace"

const store = useWorkspace()
const name = ref("")
const description = ref("")
const error = ref("")
const busy = ref(false)

/** 创建项目。 */
async function create() {
  error.value = ""
  busy.value = true
  try {
    await store.createProject(name.value, description.value)
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "刚才这次没有保存。可以重试。"
  } finally {
    busy.value = false
  }
}

/** 写入北境剑录示例。
 * 
 * @returns 无返回值。
*/
async function sample() {
  error.value = ""
  busy.value = true
  try {
    await store.seedSample()
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "刚才这次没有保存。可以重试。"
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="home">
    <div class="home-card">
      <div class="home-brand">
        <img class="mark" src="/icon.png" width="40" height="40" alt="">
        <div>
          <h1>墨织</h1>
          <p class="lede">小说设定留在这台电脑上。不建账号。</p>
        </div>
      </div>
      <form @submit.prevent="create">
        <label for="project-name">项目名称</label>
        <input id="project-name" v-model="name" type="text" required>
        <label for="project-description">简介</label>
        <textarea id="project-description" v-model="description" rows="3"></textarea>
        <div class="toolbar" style="margin-top: 16px">
          <button class="btn primary" type="submit" :disabled="busy">新建项目</button>
          <button class="btn" type="button" :disabled="busy" @click="sample">写入示例《北境剑录》</button>
        </div>
        <p v-if="error" class="lede">{{ error }}</p>
      </form>
      <section class="recent">
        <h2>最近项目</h2>
        <p v-if="!store.recent.length" class="empty">还没有项目。</p>
        <button v-for="item in store.recent" :key="item.id" class="row" type="button" @click="store.openProject(item.id)">
          <span>{{ item.name }}</span>
          <span class="ws-meta">{{ item.description || "没有简介" }}</span>
        </button>
      </section>
    </div>
  </div>
</template>
