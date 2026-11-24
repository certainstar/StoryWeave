import type { Character } from "../../domain/types"

/** 按状态与关键词筛选人物列表。 */
export function filterCharacters(characters: Character[], statusFilter: string, query: string) {
  const needle = query.trim().toLowerCase()
  return characters.filter((character) => {
    const statusOk = statusFilter === "全部" || character.status === statusFilter
    if (!statusOk) return false
    if (!needle) return true
    const text = `${character.name} ${character.aliases.join(" ")}`.toLowerCase()
    return text.includes(needle)
  })
}