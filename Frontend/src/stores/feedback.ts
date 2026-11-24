import { defineStore } from "pinia"
import { ref } from "vue"

export type ToastTone = "info" | "success" | "error"

export type ToastItem = {
  id: number
  message: string
  tone: ToastTone
}

export type ConfirmRequest = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  resolve: (ok: boolean) => void
}

let toastSeq = 0

export const useFeedback = defineStore("feedback", () => {
  const toasts = ref<ToastItem[]>([])
  const confirm = ref<ConfirmRequest | null>(null)

  function pushToast(message: string, tone: ToastTone = "info", ms = 3200) {
    const id = ++toastSeq
    toasts.value = [...toasts.value, { id, message, tone }]
    window.setTimeout(() => {
      toasts.value = toasts.value.filter((item) => item.id !== id)
    }, ms)
  }

  function askConfirm(options: Omit<ConfirmRequest, "resolve">): Promise<boolean> {
    return new Promise((resolve) => {
      confirm.value = { ...options, resolve }
    })
  }

  function answerConfirm(ok: boolean) {
    const current = confirm.value
    if (!current) return
    confirm.value = null
    current.resolve(ok)
  }

  return { toasts, confirm, pushToast, askConfirm, answerConfirm }
})