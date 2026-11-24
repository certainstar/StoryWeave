import type { ViewId } from "./types"

/** 工作台侧栏用的小型线性图标（内联 SVG）。 */
export const NAV_GLYPH: Record<ViewId, string> = {
  overview: "M4 10h16M6 6h12M8 14h8",
  characters: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm-7 14c0-4 3.2-6 7-6s7 2 7 6",
  graph: "M6 18 12 4l6 14M8 12h8",
  arcs: "M5 12c3-4 11-4 14 0M5 16c4-3 10-3 14 0",
  timeline: "M6 4v16M18 4v16M6 8h12M6 16h8",
  chapters: "M6 4h12v16H6zM9 8h6M9 12h6",
  notes: "M7 4h10l3 4v12H7zM12 4v4h5",
  reader: "M6 4h12v16H6zM9 8h6M9 12h4M14 16h2",
}