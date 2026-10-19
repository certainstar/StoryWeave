import { createInvokeRepository } from "./invoke"
import { createMemoryRepository } from "./memory"
import type { StoryRepository } from "./story"

let cached: StoryRepository | undefined

/**
 * 当前页面使用的仓库。
 *
 * 在 Tauri 窗口里走本机命令。用浏览器打开开发服务器时走内存实现，方便看界面。
 *
 * 返回同一个仓库实例。
 */
export function repository(): StoryRepository {
  if (!cached) {
    const desktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    cached = desktop ? createInvokeRepository() : createMemoryRepository()
  }
  return cached
}

export type { StoryRepository } from "./story"
export { ApiError } from "./errors"
