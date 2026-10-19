import { createRouter, createWebHistory } from "vue-router"
import HomeView from "./features/home/HomeView.vue"
import Workbench from "./features/shell/Workbench.vue"
import OverviewView from "./features/overview/OverviewView.vue"
import CharactersView from "./features/characters/CharactersView.vue"
import GraphView from "./features/graph/GraphView.vue"
import ArcsView from "./features/arcs/ArcsView.vue"
import TimelineView from "./features/timeline/TimelineView.vue"
import ChaptersView from "./features/chapters/ChaptersView.vue"
import NotesView from "./features/notes/NotesView.vue"
import SettingsView from "./features/settings/SettingsView.vue"

/** 工作台路由。项目 id 在地址里，刷新后仍打开同一个项目。 */
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: HomeView },
    {
      path: "/project/:id",
      component: Workbench,
      children: [
        { path: "", redirect: { name: "overview" } },
        { path: "overview", name: "overview", component: OverviewView },
        { path: "characters", name: "characters", component: CharactersView },
        { path: "graph", name: "graph", component: GraphView },
        { path: "arcs", name: "arcs", component: ArcsView },
        { path: "timeline", name: "timeline", component: TimelineView },
        { path: "chapters", name: "chapters", component: ChaptersView },
        { path: "notes", name: "notes", component: NotesView },
        { path: "settings", name: "settings", component: SettingsView },
      ],
    },
  ],
})
