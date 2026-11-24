import { createApp } from "vue"  // 创建应用
import { createPinia } from "pinia"  // 状态管理
import App from "./App.vue"  // 应用组件
import { router } from "./router"  // 路由
import "./styles/main.scss"  // 样式

const app = createApp(App)  // 创建应用
const pinia = createPinia()
app.use(pinia)  // 使用状态管理
app.use(router)  // 使用路由

import { useWorkspace } from "./stores/workspace"
router.beforeEach(async (to, from) => {
  if (!from.name || to.name === from.name) return true
  const store = useWorkspace()
  if (!store.project && to.name !== "home") return true
  return store.guardLeave()
})

app.mount("#app")  // 挂载应用
