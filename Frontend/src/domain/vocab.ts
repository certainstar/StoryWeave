import type { Vocab, VocabCategory } from "./types"
import { ARC_KINDS, CHAPTER_STATUS, CHARACTER_STATUS, RELATION_SPANS, RELATION_TYPES } from "./types"

/** 离线或命令失败时的默认词表，与 Rust `vocab` 模块一致。 */
export const DEFAULT_VOCAB: Vocab = {
  characterStatus: [...CHARACTER_STATUS],
  relationTypes: [...RELATION_TYPES],
  relationSpans: [...RELATION_SPANS],
  arcKinds: [...ARC_KINDS],
  chapterStatus: [...CHAPTER_STATUS],
}

/**
 * 合并远端词表。空数组时回退到默认，便于以后只增服务端字段。
 *
 * @param remote - `vocab_list` 返回值。
 */
function mergeLists(custom: string[], presets: readonly string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const label of custom) {
    if (!seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  for (const label of presets) {
    if (!seen.has(label)) {
      seen.add(label)
      out.push(label)
    }
  }
  return out
}

export function mergeVocab(remote: Partial<Vocab> | null | undefined): Vocab {
  if (!remote) return { ...DEFAULT_VOCAB }
  return {
    characterStatus: remote.characterStatus?.length
      ? mergeLists(remote.characterStatus, CHARACTER_STATUS)
      : DEFAULT_VOCAB.characterStatus,
    relationTypes: remote.relationTypes?.length
      ? mergeLists(remote.relationTypes, RELATION_TYPES)
      : DEFAULT_VOCAB.relationTypes,
    relationSpans: remote.relationSpans?.length
      ? mergeLists(remote.relationSpans, RELATION_SPANS)
      : DEFAULT_VOCAB.relationSpans,
    arcKinds: remote.arcKinds?.length ? mergeLists(remote.arcKinds, ARC_KINDS) : DEFAULT_VOCAB.arcKinds,
    chapterStatus: remote.chapterStatus?.length
      ? mergeLists(remote.chapterStatus, CHAPTER_STATUS)
      : DEFAULT_VOCAB.chapterStatus,
  }
}

/** 在现有词表前插入自定义项（去重）。 */
export function prependVocabLabel(vocab: Vocab, category: VocabCategory, label: string): Vocab {
  const list = vocab[category]
  if (list.includes(label)) return vocab
  return { ...vocab, [category]: [label, ...list] }
}