<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from "vue"
import { useWorkspace } from "../../../stores/workspace"
import { useInspector } from "../inspectorContext"

const props = defineProps<{ kind: string; id: string; message: string }>()
const store = useWorkspace()
const inspector = useInspector()

const active = computed(() => store.confirm?.kind === props.kind && store.confirm.id === props.id)
const panel = useTemplateRef("panel")

watch(active, (on) => {
  if (!on) return
  void nextTick(() => {
    panel.value?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    panel.value?.focus?.()
  })
})

async function onConfirm() {
  await store.confirmDelete()
  inspector.close()
}
</script>

<template>
  <div v-if="active" ref="panel" class="confirm confirm-in-inspector" tabindex="-1">
    <p>{{ message }}</p>
    <button class="btn danger" type="button" @click="onConfirm">确认删除</button>
    <button class="btn" type="button" @click="store.confirm = null">取消</button>
  </div>
  <div v-else class="inspector-actions">
    <slot />
    <button class="btn danger" type="button" @click="store.askDelete(kind, id, '')">删除</button>
  </div>
</template>