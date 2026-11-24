<script setup lang="ts">
import AppIcon from "../../components/ui/AppIcon.vue"
import { THEME_BLURB, THEME_IDS, THEME_LABEL, THEME_PREVIEW } from "../../domain/themes"
import type { ThemeId } from "../../domain/types"

const { current } = defineProps<{ current: ThemeId }>()

const emit = defineEmits<{ pick: [id: ThemeId] }>()

const themes = THEME_IDS.map((id) => ({
  id,
  label: THEME_LABEL[id],
  blurb: THEME_BLURB[id],
  preview: THEME_PREVIEW[id],
}))
</script>

<template>
  <section class="settings-theme-section">
    <h2 class="settings-section-title">主题</h2>
    <p class="settings-section-lede">方形画框完整展示缩略图，选中后即刻生效。</p>
    <div class="theme-tile-grid">
      <button
        v-for="item in themes"
        :key="item.id"
        class="theme-tile"
        :class="{ 'is-on': current === item.id }"
        type="button"
        :aria-pressed="current === item.id"
        @click="emit('pick', item.id)"
      >
        <span class="theme-tile-frame">
          <img class="theme-tile-img" :src="item.preview" :alt="`${item.label}主题预览`" loading="lazy">
          <span v-if="current === item.id" class="theme-tile-check" aria-hidden="true">
            <AppIcon name="palette" :size="16" />
          </span>
        </span>
        <span class="theme-tile-copy">
          <strong>{{ item.label }}</strong>
          <span class="theme-tile-blurb">{{ item.blurb }}</span>
        </span>
      </button>
    </div>
  </section>
</template>