import { createApp } from "vue"  // 创建应用
import { createPinia } from "pinia"  // 状态管理
import App from "./App.vue"  // 应用组件
import { router } from "./router"  // 路由
import "./styles.css"  // 样式
import "./app.css"  // 应用样式

const app = createApp(App)  // 创建应用
app.use(createPinia())  // 使用状态管理
app.use(router)  // 使用路由
app.mount("#app")  // 挂载应用
