<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue"
import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"
import AppIcon from "../../components/ui/AppIcon.vue"
import UiTooltip from "../../components/ui/UiTooltip.vue"
import { editorActions, insertMarkdown, wrapSelection } from "./editorToolbar"

const props = defineProps<{ chapterId: string; content: string; fullscreen?: boolean }>()
const emit = defineEmits<{ input: [string]; exitFullscreen: []; toggleFullscreen: [] }>()
const focusMode = defineModel<boolean>("focusMode", { default: false })

const host = ref<HTMLElement | null>(null)
const viewRef = ref<EditorView>()

const wordCount = computed(() => props.content.replace(/\s+/g, "").length)
const shellClass = computed(() => ({
  "is-fullscreen": props.fullscreen,
  "is-focus": focusMode.value && !props.fullscreen,
}))

function runAction(action: (typeof editorActions)[number]) {
  const view = viewRef.value
  if (!view) return
  if (action.kind === "wrap") {
    wrapSelection(view, action.before, action.after)
    return
  }
  insertMarkdown(view, action.snippet)
}

function onDocKey(event: KeyboardEvent) {
  if (event.key !== "Escape") return
  if (props.fullscreen) {
    event.preventDefault()
    emit("exitFullscreen")
    return
  }
  if (focusMode.value) {
    event.preventDefault()
    focusMode.value = false
  }
}

onMounted(() => {
  if (!host.value) return
  const view = new EditorView({
    parent: host.value,
    state: EditorState.create({
      doc: props.content,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) emit("input", update.state.doc.toString())
        }),
      ],
    }),
  })
  viewRef.value = view
  document.addEventListener("keydown", onDocKey)
})

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onDocKey)
  viewRef.value?.destroy()
})

function syncDoc(content: string) {
  const view = viewRef.value
  if (!view) return
  const current = view.state.doc.toString()
  if (current === content) return
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: content } })
}

watch(() => props.chapterId, () => syncDoc(props.content))

watch(
  () => props.content,
  (content) => syncDoc(content),
)

watch(
  () => props.fullscreen,
  (on) => {
    if (on) focusMode.value = false
  },
)
</script>

<template>
  <div class="editor-shell" :class="shellClass">
    <div v-if="fullscreen" class="editor-fullscreen-hint">
      <span>按 Esc 退出全屏</span>
      <button class="icon-btn" type="button" title="退出全屏 (Esc)" aria-label="退出全屏" @click="emit('exitFullscreen')">
        <AppIcon name="minimize" :size="18" />
      </button>
    </div>
    <div class="editor-toolbar" role="toolbar" aria-label="正文格式">
      <UiTooltip v-for="action in editorActions" :key="action.id" :label="action.title" placement="bottom">
        <button
          class="icon-btn editor-tool-btn"
          type="button"
          :aria-label="action.title"
          @click="runAction(action)"
        >
          <AppIcon :name="action.icon" :size="26" :stroke-width="1.85" />
        </button>
      </UiTooltip>
      <UiTooltip :label="fullscreen ? '退出全屏 (Esc)' : '全屏编写'" placement="bottom">
        <button
          class="icon-btn editor-tool-btn"
          type="button"
          :aria-pressed="fullscreen"
          :aria-label="fullscreen ? '退出全屏' : '全屏编写'"
          @click="emit('toggleFullscreen')"
        >
          <AppIcon :name="fullscreen ? 'minimize' : 'maximize'" :size="26" :stroke-width="1.85" />
        </button>
      </UiTooltip>
      <UiTooltip :label="focusMode ? '显示右侧预览' : '专注写作（隐藏预览）'" placement="bottom">
        <button
          class="icon-btn editor-tool-btn"
          type="button"
          :aria-pressed="focusMode"
          :aria-label="focusMode ? '显示右侧预览' : '专注写作'"
          @click="focusMode = !focusMode"
        >
          <AppIcon :name="focusMode ? 'eye-off' : 'eye'" :size="26" :stroke-width="1.85" />
        </button>
      </UiTooltip>
      <span class="editor-meta">{{ wordCount }} 字</span>
    </div>
    <div ref="host" class="editor"></div>
  </div>
</template>