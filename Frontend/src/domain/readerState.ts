export type ReaderBookmark = {
  id: string
  pageIndex: number
  label: string
  createdAt: string
}

export type ReaderPersist = {
  lastPage: number
  bookmarks: ReaderBookmark[]
}

const PREFIX = "storyweave.reader:"

function key(projectId: string) {
  return `${PREFIX}${projectId}`
}

const empty: ReaderPersist = { lastPage: 0, bookmarks: [] }

export function loadReaderState(projectId: string): ReaderPersist {
  try {
    const raw = localStorage.getItem(key(projectId))
    if (!raw) return { ...empty }
    const parsed = JSON.parse(raw) as Partial<ReaderPersist>
    return {
      lastPage: typeof parsed.lastPage === "number" && parsed.lastPage >= 0 ? parsed.lastPage : 0,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks.filter(isBookmark) : [],
    }
  } catch {
    return { ...empty }
  }
}

function isBookmark(value: unknown): value is ReaderBookmark {
  if (!value || typeof value !== "object") return false
  const b = value as ReaderBookmark
  return typeof b.id === "string" && typeof b.pageIndex === "number" && typeof b.label === "string"
}

export function saveReaderState(projectId: string, state: ReaderPersist) {
  localStorage.setItem(key(projectId), JSON.stringify(state))
}

export function newBookmarkId() {
  return `bm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}