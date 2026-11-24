import { computed } from "vue"
import { useRoute } from "vue-router"
import { useWorkspace } from "../../stores/workspace"

/** 详情面板：当前视图与选中实体。 */
export function useInspectorSelection() {
  const store = useWorkspace()
  const route = useRoute()
  const view = computed(() => String(route.name ?? ""))

  const character = computed(() => store.characters.find((item) => store.selection?.kind === "character" && item.id === store.selection.id))
  const relation = computed(() => store.relations.find((item) => store.selection?.kind === "relation" && item.id === store.selection.id))
  const event = computed(() => store.events.find((item) => store.selection?.kind === "event" && item.id === store.selection.id))
  const arc = computed(() => store.arcs.find((item) => store.selection?.kind === "arc" && item.id === store.selection.id))
  const chapter = computed(() => store.chapters.find((item) => store.selection?.kind === "chapter" && item.id === store.selection.id))
  const note = computed(() => store.notes.find((item) => store.selection?.kind === "note" && item.id === store.selection.id))
  const chapterScenes = computed(() =>
    store.scenes.filter((scene) => scene.chapterId === chapter.value?.id).sort((a, b) => a.sortOrder - b.sortOrder),
  )

  return { store, view, character, relation, event, arc, chapter, note, chapterScenes }
}
