<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue"
import { markdown } from "@codemirror/lang-markdown"
import { EditorState } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { basicSetup } from "codemirror"

const props = defineProps<{ chapterId: string; content: string }>()
const emit = defineEmits<{ input: [string] }>()
const host = ref<HTMLElement | null>(null)
let view: EditorView | undefined

/** 初始化编辑器。 
 * 
 * @returns 无返回值。
*/
onMounted(() => {
  if (!host.value) return
  view = new EditorView({
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
})

/** 监听章节 ID 变化，更新章节内容。
 * 
 * @param chapterId 章节 ID。
 * 
 * @returns 无返回值。
*/
watch(
  () => props.chapterId,
  () => {
    if (!view) return
    const current = view.state.doc.toString()
    if (current === props.content) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: props.content } })
  },
)

onBeforeUnmount(() => view?.destroy())
</script>

<template>
  <div ref="host" class="editor"></div>
</template>
