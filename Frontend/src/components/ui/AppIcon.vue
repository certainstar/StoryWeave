<script setup lang="ts">
import type { Component } from "vue"
import {
  Bold,
  BookOpen,
  BookText,
  CalendarClock,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Copy,
  FolderOpen,
  HelpCircle,
  GitBranch,
  Heading1,
  Heading2,
  Layers,
  LayoutDashboard,
  List,
  Maximize2,
  Minimize2,
  Minus,
  PanelRight,
  Palette,
  Quote,
  Search,
  Settings,
  StickyNote,
  Users,
  X,
} from "lucide-vue-next"
import type { ViewIconId } from "../../domain/types"

const props = withDefaults(
  defineProps<{
    name:
      | ViewIconId
      | "search"
      | "chevron-up"
      | "chevron-down"
      | "chevron-left"
      | "copy"
      | "folder-open"
      | "help"
      | "close"
      | "panel-right"
      | "palette"
      | "heading-1"
      | "heading-2"
      | "bold"
      | "list"
      | "quote"
      | "minus"
      | "maximize"
      | "minimize"
      | "book-text"
      | "eye"
      | "eye-off"
    size?: number
    strokeWidth?: number
  }>(),
  { size: 18, strokeWidth: 1.75 },
)

const MAP: Record<string, Component> = {
  "layout-dashboard": LayoutDashboard,
  "panel-right": PanelRight,
  palette: Palette,
  users: Users,
  "git-branch": GitBranch,
  layers: Layers,
  "calendar-clock": CalendarClock,
  "book-open": BookOpen,
  "book-text": BookText,
  eye: Eye,
  "eye-off": EyeOff,
  "sticky-note": StickyNote,
  settings: Settings,
  search: Search,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  copy: Copy,
  "heading-1": Heading1,
  "heading-2": Heading2,
  bold: Bold,
  list: List,
  quote: Quote,
  minus: Minus,
  maximize: Maximize2,
  minimize: Minimize2,
  "folder-open": FolderOpen,
  help: HelpCircle,
  close: X,
}
</script>

<template>
  <component
    :is="MAP[name]"
    class="app-icon"
    :size="size"
    :stroke-width="strokeWidth"
    aria-hidden="true"
  />
</template>