import type { EditorView } from "@codemirror/view"

/**
 * 在光标处插入 Markdown 片段。
 *
 * @param view - CodeMirror 实例。
 * @param snippet - 要插入的文本。
 */
export function insertMarkdown(view: EditorView | undefined, snippet: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor: from + snippet.length },
  })
  view.focus()
}

/** 用选中文本包裹标记。 */
export function wrapSelection(view: EditorView | undefined, before: string, after: string) {
  if (!view) return
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const insert = selected ? `${before}${selected}${after}` : `${before}文字${after}`
  view.dispatch({
    changes: { from, to, insert },
    selection: { anchor: from + insert.length },
  })
  view.focus()
}

/** 常用 Markdown 工具动作。 */
export const editorActions = [
  { id: "h1", label: "标题", title: "插入二级标题", icon: "heading-2" as const, kind: "insert" as const, snippet: "## " },
  { id: "h2", label: "小标题", title: "插入三级标题", icon: "heading-1" as const, kind: "insert" as const, snippet: "### " },
  { id: "bold", label: "加粗", title: "加粗选区", icon: "bold" as const, kind: "wrap" as const, before: "**", after: "**" },
  { id: "list", label: "列表", title: "插入列表项", icon: "list" as const, kind: "insert" as const, snippet: "- " },
  { id: "quote", label: "引用", title: "插入引用", icon: "quote" as const, kind: "insert" as const, snippet: "> " },
  { id: "rule", label: "分隔", title: "插入分隔线", icon: "minus" as const, kind: "insert" as const, snippet: "\n\n---\n\n" },
] as const