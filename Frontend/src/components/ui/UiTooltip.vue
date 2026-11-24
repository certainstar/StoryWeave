<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from "vue"

const props = withDefaults(
  defineProps<{ label: string; placement?: "top" | "bottom" | "left" | "right" }>(),
  { placement: "bottom" },
)

const open = ref(false)
const host = useTemplateRef<HTMLElement>("host")
const tipRef = useTemplateRef<HTMLElement>("tip")
const tipStyle = ref<Record<string, string>>({})

async function position() {
  const el = host.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const margin = 10
  let left = rect.left + rect.width / 2
  let top = props.placement === "bottom" ? rect.bottom + 8 : rect.top - 8
  let transform = props.placement === "bottom" ? "translate(-50%, 0)" : "translate(-50%, -100%)"

  if (props.placement === "right") {
    left = rect.right + 8
    top = rect.top + rect.height / 2
    transform = "translate(0, -50%)"
  }
  if (props.placement === "left") {
    left = rect.left - 8
    top = rect.top + rect.height / 2
    transform = "translate(-100%, -50%)"
  }

  tipStyle.value = { left: `${left}px`, top: `${top}px`, transform }
  await nextTick()
  const tip = tipRef.value
  if (!tip) return
  const box = tip.getBoundingClientRect()
  let dx = 0
  let dy = 0
  if (box.left < margin) dx = margin - box.left
  if (box.right > window.innerWidth - margin) dx = window.innerWidth - margin - box.right
  if (box.top < margin) dy = margin - box.top
  if (box.bottom > window.innerHeight - margin) dy = window.innerHeight - margin - box.bottom
  if (dx || dy) {
    tipStyle.value = {
      left: `${left + dx}px`,
      top: `${top + dy}px`,
      transform,
    }
  }
}

function show() {
  open.value = true
  void position()
}

function hide() {
  open.value = false
}
</script>

<template>
  <span
    ref="host"
    class="ui-tooltip-host"
    @mouseenter="show"
    @mouseleave="hide"
    @focusin="show"
    @focusout="hide"
  >
    <slot />
  </span>
  <Teleport to="body">
    <span v-if="open" ref="tip" class="ui-tooltip-float" :style="tipStyle" role="tooltip">{{ label }}</span>
  </Teleport>
</template>