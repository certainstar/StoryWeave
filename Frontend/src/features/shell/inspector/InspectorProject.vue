<script setup lang="ts">
import { useWorkspace } from "../../../stores/workspace"
import InspectorTextArea from "./InspectorTextArea.vue"
import InspectorTextField from "./InspectorTextField.vue"

const store = useWorkspace()
</script>

<template>
  <h2>项目</h2>
  <p class="lede">名称和简介保存在这个项目文件里。</p>
  <InspectorTextField
    id="project-name-field"
    v-model="store.project!.name"
    label="名称"
    @input="store.scheduleProject()"
  />
  <InspectorTextArea
    id="project-description-field"
    v-model="store.project!.description"
    label="简介"
    :rows="4"
    @input="store.scheduleProject()"
  />
</template>