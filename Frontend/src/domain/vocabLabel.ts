/** 与后端 `require_vocab_label` 对齐：允许自定义短标签。 */
export function normalizeVocabLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) throw new Error("EMPTY_NAME")
  if ([...trimmed].length > 16) throw new Error("LABEL_TOO_LONG")
  return trimmed
}