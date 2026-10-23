import { createInvokeRepository } from "./invoke"
import { createMemoryRepository } from "./memory"
import type { StoryRepository } from "./story"

/** 缓存仓库。 */
let cached: StoryRepository | undefined

/**
 * 当前页面使用的仓库。
 *
 * 在 Tauri 窗口里走本机命令。用浏览器打开开发服务器时走内存实现，方便看界面。
 * 即：实际打包后，走本机命令仓库createInvokeRepository。
 * 开发时，访问浏览器页面走内存仓库createMemoryRepository，方便开发。
 * 
 * 返回同一个仓库实例。
 */
export function repository(): StoryRepository {
  if (!cached) {
    // 判断是否在 Tauri 窗口里
    const desktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
    // 如果是在 Tauri 窗口里，则创建本机命令仓库，否则创建内存仓库
    cached = desktop ? createInvokeRepository() : createMemoryRepository()
  }
  return cached
}

/** 导出仓库类型和错误码。 */
export type { StoryRepository } from "./story"
export { ApiError } from "./errors"
