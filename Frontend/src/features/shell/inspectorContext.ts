import { inject, provide, type InjectionKey } from "vue"

type InspectorApi = { open: () => void; close: () => void; toggle: () => void }

const inspectorKey: InjectionKey<InspectorApi> = Symbol("storyweave-inspector")

export function provideInspector(api: InspectorApi) {
  provide(inspectorKey, api)
}

export function useInspector() {
  return inject(inspectorKey, {
    open: () => undefined,
    close: () => undefined,
    toggle: () => undefined,
  })
}