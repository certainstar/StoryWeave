<script setup lang="ts">
const name = defineModel<string>("name", { default: "" })
const description = defineModel<string>("description", { default: "" })

defineProps<{
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: []
  sample: []
}>()
</script>

<template>
  <form class="home-form" @submit.prevent="emit('submit')">
    <div class="sw-field sw-field-span">
      <label class="sw-label" for="project-name">项目名称</label>
      <input id="project-name" v-model="name" class="sw-input" type="text" required autocomplete="off" placeholder="例如：北境剑录">
    </div>
    <div class="sw-field sw-field-span">
      <label class="sw-label" for="project-description">简介</label>
      <textarea
        id="project-description"
        v-model="description"
        class="sw-textarea home-form-desc"
        rows="4"
        placeholder="一两句话介绍这本书（可选）"
      />
    </div>
    <div class="toolbar home-form-actions">
      <button class="btn primary" type="submit" :disabled="busy">新建项目</button>
      <button class="btn" type="button" :disabled="busy" @click="emit('sample')">写入示例《北境剑录》</button>
    </div>
    <p v-if="error" class="lede home-form-error" role="alert">{{ error }}</p>
  </form>
</template>