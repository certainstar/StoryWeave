import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import HomeView from "./features/home/HomeView.vue"
import Workbench from "./features/shell/Workbench.vue"

const workbenchChildren: RouteRecordRaw[] = [
  { path: "", redirect: { name: "overview" } },
  { path: "overview", name: "overview", component: () => import("./features/overview/OverviewView.vue") },
  { path: "characters", name: "characters", component: () => import("./features/characters/CharactersView.vue") },
  { path: "graph", name: "graph", component: () => import("./features/graph/GraphView.vue") },
  { path: "arcs", name: "arcs", component: () => import("./features/arcs/ArcsView.vue") },
  { path: "timeline", name: "timeline", component: () => import("./features/timeline/TimelineView.vue") },
  { path: "chapters", name: "chapters", component: () => import("./features/chapters/ChaptersView.vue") },
  { path: "notes", name: "notes", component: () => import("./features/notes/NotesView.vue") },
  { path: "reader", name: "reader", component: () => import("./features/reader/ReaderView.vue") },
  { path: "settings", name: "settings", component: () => import("./features/settings/SettingsView.vue") },
]

/** 工作台路由。项目 id 在地址里，刷新后仍打开同一个项目。 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    {
      path: "/project/:id",
      component: Workbench,
      children: workbenchChildren,
    },
  ],
})