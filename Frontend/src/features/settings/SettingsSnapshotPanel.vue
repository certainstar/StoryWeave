<script setup lang="ts">
import { computed } from "vue"
import AppIcon from "../../components/ui/AppIcon.vue"
import { formatSnapshotDisplay } from "../../domain/formatTime"
import type { Snapshot } from "../../domain/types"
import { useFeedback } from "../../stores/feedback"

const props = defineProps<{ snapshots: Snapshot[] }>()

const emit = defineEmits<{ backup: []; restore: [snapshotAt: string] }>()

const feedback = useFeedback()

const rows = computed(() =>
  props.snapshots.map((snapshot) => ({
    ...snapshot,
    display: formatSnapshotDisplay(snapshot.snapshotAt),
  })),
)

async function confirmRestore(snapshotAt: string) {
  const ok = await feedback.askConfirm({
    title: "恢复快照",
    message: "用这份快照替换当前项目？替换前会再留一份。",
    confirmLabel: "恢复",
    cancelLabel: "取消",
  })
  if (!ok) return
  emit("restore", snapshotAt)
}
</script>

<template>
  <article class="card settings-panel settings-snapshot-card">
    <div class="settings-panel-head">
      <h2>快照</h2>
      <button class="btn primary" type="button" @click="emit('backup')">做一份快照</button>
    </div>
    <p class="lede">默认保留最近 10 份。恢复前会再做一份。</p>
    <p v-if="!rows.length" class="empty">还没有快照。</p>
    <ul v-else class="snapshot-list snapshot-list-rich">
      <li v-for="snapshot in rows" :key="snapshot.snapshotAt" class="snapshot-row-rich">
        <div class="snapshot-icon" aria-hidden="true">
          <AppIcon name="layers" :size="18" />
        </div>
        <p class="snapshot-meta">
          <time class="snapshot-at" :datetime="snapshot.snapshotAt">{{ snapshot.display.primary }}</time>
          <span v-if="snapshot.display.relative" class="snapshot-relative">{{ snapshot.display.relative }}</span>
        </p>
        <button class="btn snapshot-restore-btn" type="button" @click="confirmRestore(snapshot.snapshotAt)">恢复</button>
      </li>
    </ul>
  </article>
</template>