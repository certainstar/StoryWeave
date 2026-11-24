import type { SearchHit } from "../../domain/types"

const KIND_ORDER = ["character", "event", "arc", "chapter", "note"] as const

export const SEARCH_KIND_LABEL: Record<string, string> = {
  character: "人物",
  event: "事件",
  arc: "故事线",
  chapter: "章节",
  note: "笔记",
}

export interface SearchGroup {
  kind: string
  label: string
  hits: SearchHit[]
}

/** 按实体类型分组，顺序固定。 */
export function groupSearchHits(hits: SearchHit[]): SearchGroup[] {
  const buckets = new Map<string, SearchHit[]>()
  for (const hit of hits) {
    const list = buckets.get(hit.kind) ?? []
    list.push(hit)
    buckets.set(hit.kind, list)
  }
  return KIND_ORDER.filter((kind) => buckets.has(kind)).map((kind) => ({
    kind,
    label: SEARCH_KIND_LABEL[kind] ?? kind,
    hits: buckets.get(kind)!,
  }))
}