/** 界面插槽。设置页按插槽名把文案渲染出来。 */
export interface UiPlugin {
  id: string
  /** 插槽文案的记录。 */
  slots: Record<string, string>
}

/** 界面插件列表。 */
const plugins: UiPlugin[] = []

/**
 * 注册一个界面插件。同一个 id 再注册会覆盖旧的。无返回值。插槽只负责展示，不读取正文。
 *
 * @param plugin - 插件。
*/
export function register(plugin: UiPlugin): void {
  const index = plugins.findIndex((item) => item.id === plugin.id)
  if (index >= 0) plugins[index] = plugin
  else plugins.push(plugin)
}

/**
 * 某个插槽上的全部文案。
 *
 * @param slot - 插槽名，例如 `settings`。
 *
 * @returns 返回按注册顺序排列的插槽文案。
*/
export function slotText(slot: string): string[] {
  return plugins.map((plugin) => plugin.slots[slot]).filter((text): text is string => Boolean(text))
}

register({
  id: "sample",
  slots: {
    settings: "示例插槽已挂上。以后的远端仓库或模型从这里接入，当前不会发送正文。",
  },
})
