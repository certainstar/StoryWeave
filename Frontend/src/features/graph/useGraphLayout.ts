import { computed } from "vue"
import { MarkerType, type DefaultEdgeOptions, type Edge, type Node } from "@vue-flow/core"
import { useWorkspace } from "../../stores/workspace"

const baseStroke = "color-mix(in srgb, var(--ink) 82%, transparent)"

export const defaultEdgeOptions: DefaultEdgeOptions = {
  type: "smoothstep",
  animated: false,
  markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: baseStroke },
  style: { stroke: baseStroke, strokeWidth: 1.8 },
  labelStyle: { fill: "var(--ink)", fontSize: 12, fontFamily: "var(--sans)" },
  labelBgStyle: { fill: "color-mix(in srgb, var(--sheet) 92%, transparent)", fillOpacity: 0.95 },
  labelBgPadding: [6, 4] as [number, number],
  labelBgBorderRadius: 6,
}

/** 关系图节点与边。 */
export function useGraphLayout() {
  const store = useWorkspace()

  const types = computed(() => {
    const set = new Set(store.vocab.relationTypes)
    for (const relation of store.relations) set.add(relation.type)
    return [...set]
  })

  const typesInUse = computed(() => {
    const set = new Set<string>()
    for (const relation of store.relations) {
      if (relation.type) set.add(relation.type)
    }
    return [...set].sort((a, b) => a.localeCompare(b, "zh"))
  })
  const visibleRelations = computed(() => store.relations.filter((relation) => !store.hiddenTypes.includes(relation.type)))

  const visibleCharacterIds = computed(() => {
    const ids = new Set<string>()
    for (const relation of visibleRelations.value) {
      ids.add(relation.sourceId)
      ids.add(relation.targetId)
    }
    return ids
  })

  const graphEmpty = computed(() => visibleRelations.value.length === 0)

  const nodes = computed<Node[]>(() => {
    if (graphEmpty.value) return []
    return store.characters
      .filter((character) => visibleCharacterIds.value.has(character.id))
      .map((character, index) => {
        const pos = store.layout.nodes[character.id] ?? { x: 40 + (index % 4) * 210, y: 40 + Math.floor(index / 4) * 150 }
        return {
          id: character.id,
          type: "character",
          position: { ...pos },
          data: {
            name: character.name,
            role: character.role,
            index: String(index + 1).padStart(2, "0"),
          },
        }
      })
  })

  const edges = computed<Edge[]>(() =>
    visibleRelations.value.map((relation) => {
      const selected = store.selection?.kind === "relation" && store.selection.id === relation.id
      const stroke = selected ? "var(--seal)" : baseStroke
      return {
        id: relation.id,
        source: relation.sourceId,
        target: relation.targetId,
        label: relation.type,
        ariaLabel: `${relation.type}关系`,
        type: "smoothstep",
        markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18, color: stroke },
        style: { stroke, strokeWidth: selected ? 2.4 : 1.8 },
      }
    }),
  )

  return { store, types, typesInUse, visibleRelations, graphEmpty, nodes, edges, defaultEdgeOptions }
}