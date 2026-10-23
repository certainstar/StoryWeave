import { createRouter, createWebHistory } from "vue-router"
import ArcsView from "./features/arcs/ArcsView.vue"
import ChaptersView from "./features/chapters/ChaptersView.vue"
import CharactersView from "./features/characters/CharactersView.vue"
import GraphView from "./features/graph/GraphView.vue"
import HomeView from "./features/home/HomeView.vue"
import NotesView from "./features/notes/NotesView.vue"
import OverviewView from "./features/overview/OverviewView.vue"
import SettingsView from "./features/settings/SettingsView.vue"
import TimelineView from "./features/timeline/TimelineView.vue"
import Workbench from "./features/shell/Workbench.vue"


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
        { path: "arcs", name: "arcs", component: ArcsView },
        { path: "chapters", name: "chapters", component: ChaptersView },
        { path: "characters", name: "characters", component: CharactersView },
        { path: "graph", name: "graph", component: GraphView },
        { path: "notes", name: "notes", component: NotesView },
        { path: "overview", name: "overview", component: OverviewView },
        { path: "timeline", name: "timeline", component: TimelineView },
        { path: "settings", name: "settings", component: SettingsView },
      ],
    },
  ],
})
