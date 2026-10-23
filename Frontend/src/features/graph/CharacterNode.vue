<script setup lang="ts">
import { Handle, Position } from "@vue-flow/core"

/** 定义节点数据。 
 * 
 * @param data 节点数据。
 * @param selected 是否选中。
 * 
 * @returns 无返回值。
*/
defineProps<{ data: { name: string; role: string; index: string }; selected?: boolean }>()
</script>

<template>
  <div class="flow-node" :class="{ 'is-selected': selected }">
    <Handle type="target" :position="Position.Top" />
    <span class="node-index">{{ data.index }}</span>
    <strong class="node-name">{{ data.name }}</strong>
    <span class="node-role">{{ data.role || "未填写身份" }}</span>
    <Handle type="source" :position="Position.Bottom" />
  </div>
</template>
