export type BookSlice = { title: string; markdown: string }

export type BookPageKind = "cover" | "content" | "end"

export type BookPage = {
  kind: BookPageKind
  chapterIndex: number
  chapterTitle: string
  markdown: string
  /** 扉页书名（仅 kind=cover） */
  bookTitle?: string
}

export type ChapterNavItem = {
  chapterIndex: number
  title: string
  pageIndex: number
}

function paginateChapter(chapterIndex: number, title: string, markdown: string, limit: number): BookPage[] {
  const text = markdown.trim()
  if (!text) {
    return [
      {
        kind: "content",
        chapterIndex,
        chapterTitle: title,
        markdown: "（本章暂无正文）",
      },
    ]
  }
  const pages: BookPage[] = []
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  let chunk = ""
  const flush = () => {
    if (!chunk.trim()) return
    pages.push({
      kind: "content",
      chapterIndex,
      chapterTitle: title,
      markdown: chunk.trim(),
    })
    chunk = ""
  }
  for (const block of blocks) {
    const next = chunk ? `${chunk}\n\n${block}` : block
    if (next.length > limit && chunk.length > 24) {
      flush()
      chunk = block
    } else {
      chunk = next
    }
  }
  flush()
  return pages
}

/**
 * 全书分页：扉页 + 正文 + 终页，并生成章节目录跳转索引。
 */
export function buildReaderPages(
  bookTitle: string,
  chapters: BookSlice[],
  limit = 340,
): { pages: BookPage[]; chapterNav: ChapterNavItem[] } {
  const pages: BookPage[] = [
    {
      kind: "cover",
      chapterIndex: 0,
      chapterTitle: "",
      markdown: "",
      bookTitle: bookTitle.trim() || "未命名作品",
    },
  ]
  const chapterNav: ChapterNavItem[] = []

  if (!chapters.length) {
    pages.push({
      kind: "content",
      chapterIndex: 0,
      chapterTitle: "",
      markdown: "（还没有可翻阅的正文。）",
    })
  } else {
    chapters.forEach((chapter, idx) => {
      const chapterIndex = idx + 1
      const slice = paginateChapter(chapterIndex, chapter.title, chapter.markdown, limit)
      chapterNav.push({
        chapterIndex,
        title: chapter.title,
        pageIndex: pages.length,
      })
      pages.push(...slice)
    })
  }

  pages.push({
    kind: "end",
    chapterIndex: 0,
    chapterTitle: "",
    markdown: "",
  })

  return { pages, chapterNav }
}

/** @deprecated 兼容旧名 */
export function paginateBook(chapters: BookSlice[], limit = 340): BookPage[] {
  return buildReaderPages("", chapters, limit).pages.filter((p) => p.kind === "content")
}