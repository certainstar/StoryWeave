<script setup lang="ts">
import { useFeedback } from "../../stores/feedback"

const feedback = useFeedback()
</script>

<template>
  <div class="toast-stack" aria-live="polite">
    <p
      v-for="item in feedback.toasts"
      :key="item.id"
      class="toast"
      :class="`toast-${item.tone}`"
      role="status"
    >
      {{ item.message }}
    </p>
  </div>
  <div
    v-if="feedback.confirm"
    class="modal-backdrop"
    role="presentation"
    @click.self="feedback.answerConfirm(false)"
  >
    <div class="modal-card" role="alertdialog" :aria-label="feedback.confirm.title">
      <h2>{{ feedback.confirm.title }}</h2>
      <p class="lede">{{ feedback.confirm.message }}</p>
      <div class="toolbar">
        <button
          class="btn"
          :class="{ danger: feedback.confirm.danger, primary: !feedback.confirm.danger }"
          type="button"
          @click="feedback.answerConfirm(true)"
        >
          {{ feedback.confirm.confirmLabel || "确认" }}
        </button>
        <button class="btn" type="button" @click="feedback.answerConfirm(false)">
          {{ feedback.confirm.cancelLabel || "取消" }}
        </button>
      </div>
    </div>
  </div>
</template>