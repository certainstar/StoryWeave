/** 解析快照时间戳（ISO 或 `YYYYMMDDTHHMMSSZ`）。 */
export function parseSnapshotAt(raw: string): Date | null {
  const text = raw.trim()
  if (!text) return null
  if (text.includes("-")) {
    const d = new Date(text)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i.exec(text)
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)))
}

export function formatLocalDateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

export function formatRelativeZh(date: Date, now = new Date()): string {
  const sec = Math.round((now.getTime() - date.getTime()) / 1000)
  if (sec < 60) return "刚刚"
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return formatLocalDateTime(date)
}

export function formatSnapshotDisplay(raw: string): { primary: string; relative: string } {
  const date = parseSnapshotAt(raw)
  if (!date) return { primary: raw, relative: "" }
  return {
    primary: formatLocalDateTime(date),
    relative: formatRelativeZh(date),
  }
}