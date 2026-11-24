/** 把快照文件名里的紧凑 UTC 时间（如 20261019T033154Z）格式化为本地可读时间。 */
export function formatSnapshotAt(raw: string): string {
  const compact = raw.trim()
  if (!compact) return raw
  const direct = Date.parse(compact)
  if (!Number.isNaN(direct)) {
    return formatLocal(new Date(direct))
  }
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/i.exec(compact)
  if (match) {
    const [, y, mo, d, h, mi, s] = match
    const utc = Date.UTC(
      Number(y),
      Number(mo) - 1,
      Number(d),
      Number(h),
      Number(mi),
      Number(s),
    )
    return formatLocal(new Date(utc))
  }
  return raw
}

function formatLocal(date: Date): string {
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}