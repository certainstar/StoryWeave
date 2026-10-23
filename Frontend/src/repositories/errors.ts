/** 命令失败。`message` 可以直接给作者看。 */
export class ApiError extends Error {
  /**
   * * `code` - 稳定错误码，例如 `VALIDATION_ERROR`。
   * * `message` - 给作者看的句子。
   * * `reason` - 细分原因，例如 `EMPTY_NAME`。可以省略。
   */
  readonly code: string
  readonly reason?: string
  constructor(code: string, message: string, reason?: string) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.reason = reason
  }
}

/**
 * 参数不合法。
 *
 * @param reason - 细分原因。
 * @param message - 给作者看的句子。
 *
 * @returns 返回 `VALIDATION_ERROR`。调用方不得当作已保存。
 */
export function validation(reason: string, message: string): ApiError {
  return new ApiError("VALIDATION_ERROR", message, reason)
}

/**
 * 对象不存在。
 *
 * @returns 返回 `NOT_FOUND`。
 */
export function notFound(): ApiError {
  return new ApiError("NOT_FOUND", "操作对象不存在。已回到列表。")
}
