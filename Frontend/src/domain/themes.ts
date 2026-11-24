import type { ThemeId } from "./types"

export const THEME_IDS: ThemeId[] = ["paper", "ink", "fourgentlemen", "mountain", "dragon"]

const LEGACY_THEMES = ["bamboo", "plum", "orchid", "chrysanthemum"] as const

/** 旧主题 id → 四君子 */
export function migrateThemeId(raw: string): ThemeId {
  if ((LEGACY_THEMES as readonly string[]).includes(raw)) return "fourgentlemen"
  if ((THEME_IDS as readonly string[]).includes(raw)) return raw as ThemeId
  return "paper"
}

export const THEME_LABEL: Record<ThemeId, string> = {
  paper: "宣纸",
  ink: "夜墨",
  fourgentlemen: "四君子",
  mountain: "山海",
  dragon: "龙凤",
}

export const THEME_BLURB: Record<ThemeId, string> = {
  paper: "浅色宣纸，适合长时间看正文。",
  ink: "深色夜墨，关系图与正文共用同一结构。",
  fourgentlemen: "梅兰竹菊四象限纹样，一纸四季。",
  mountain: "山海远黛，层峦晕染。",
  dragon: "金墨龙凤纹，庄重而不喧宾。",
}

export const THEME_PREVIEW: Record<ThemeId, string> = {
  paper: "/themes/paper/preview.jpg",
  ink: "/themes/ink/preview.jpg",
  fourgentlemen: "/themes/fourgentlemen/preview.jpg",
  mountain: "/themes/mountain/preview.jpg",
  dragon: "/themes/dragon/preview.jpg",
}