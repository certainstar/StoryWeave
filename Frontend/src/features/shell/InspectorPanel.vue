<script setup lang="ts">
import { computed, ref } from "vue"
import { useRoute } from "vue-router"
import { ARC_KINDS, CHAPTER_STATUS, CHARACTER_STATUS, RELATION_SPANS, RELATION_TYPES } from "../../domain/types"
import type { Character, Note, StoryArc, StoryEvent } from "../../domain/types"
import { useWorkspace } from "../../stores/workspace"

const store = useWorkspace()
const route = useRoute()
const arcAddId = ref("")
const view = computed(() => String(route.name ?? ""))

const character = computed(() => store.characters.find((item) => store.selection?.kind === "character" && item.id === store.selection.id))
const relation = computed(() => store.relations.find((item) => store.selection?.kind === "relation" && item.id === store.selection.id))
const event = computed(() => store.events.find((item) => store.selection?.kind === "event" && item.id === store.selection.id))
const arc = computed(() => store.arcs.find((item) => store.selection?.kind === "arc" && item.id === store.selection.id))
const chapter = computed(() => store.chapters.find((item) => store.selection?.kind === "chapter" && item.id === store.selection.id))
const note = computed(() => store.notes.find((item) => store.selection?.kind === "note" && item.id === store.selection.id))
const chapterScenes = computed(() => store.scenes.filter((scene) => scene.chapterId === chapter.value?.id).sort((a, b) => a.sortOrder - b.sortOrder))

const hints: Record<string, string> = {
  characters: "选择一个人物查看档案。",
  graph: "选择一个节点或一条关系。",
  arcs: "选择一条故事线编辑事件顺序。",
  timeline: "选择一个事件。",
  chapters: "选择一章编辑正文和出场人物。",
  notes: "选择一条笔记。",
}

function aliases(value: string, person: Character) {
  person.aliases = value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
  store.scheduleCharacter(person.id)
}

function tags(value: string, item: Note) {
  item.tags = value.split(/[、,，]/).map((part) => part.trim()).filter(Boolean)
  store.scheduleNote(item.id)
}

function toggleParticipant(item: StoryEvent, id: string, checked: boolean) {
  item.participants = checked
    ? [...item.participants, { characterId: id, role: "" }]
    : item.participants.filter((person) => person.characterId !== id)
  store.scheduleEvent(item.id)
}

function toggleId(list: string[], id: string, checked: boolean) {
  return checked ? [...list, id] : list.filter((item) => item !== id)
}

function nameOf(id: string) {
  return store.characters.find((item) => item.id === id)?.name || "未命名人物"
}

function eventTitle(id: string) {
  return store.events.find((item) => item.id === id)?.title || "未命名事件"
}

async function moveArcEvent(item: StoryArc, eventId: string, delta: number) {
  const ids = [...item.eventIds]
  const index = ids.indexOf(eventId)
  const next = index + delta
  if (index < 0 || next < 0 || next >= ids.length) return
  const [moved] = ids.splice(index, 1)
  ids.splice(next, 0, moved)
  await store.setArcEvents(item.id, ids)
}

async function addArcEvent(item: StoryArc, eventId: string) {
  if (!eventId) return
  await store.setArcEvents(item.id, [...item.eventIds, eventId])
}

function relationsOf(id: string) {
  return store.relations.filter((entry) => entry.sourceId === id || entry.targetId === id)
}

function eventsNotIn(ids: string[]) {
  return store.events.filter((entry) => !ids.includes(entry.id))
}

function asking(kind: string, id: string) {
  return store.confirm?.kind === kind && store.confirm.id === id
}
</script>

<template>
  <template v-if="view === 'overview' && store.project">
    <h2>项目</h2>
    <p class="lede">名称和简介保存在这个项目文件里。</p>
    <label class="field-label" for="project-name-field">名称</label>
    <input id="project-name-field" v-model="store.project.name" type="text" @input="store.scheduleProject()">
    <label class="field-label" for="project-description-field">简介</label>
    <textarea id="project-description-field" v-model="store.project.description" @input="store.scheduleProject()"></textarea>
  </template>

  <template v-else-if="view === 'settings'">
    <h2>设置</h2>
    <p class="lede">主题、快照和插件都留在这台电脑上。</p>
  </template>

  <template v-else-if="store.draft">
    <h2>建立关系</h2>
    <p class="lede">一条关系连接两个不同的人物。</p>
    <label class="field-label">起点</label>
    <select v-model="store.draft.sourceId">
      <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
    </select>
    <label class="field-label">终点</label>
    <select v-model="store.draft.targetId">
      <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
    </select>
    <label class="field-label">类型</label>
    <select v-model="store.draft.type">
      <option v-for="type in RELATION_TYPES" :key="type">{{ type }}</option>
    </select>
    <label class="field-label">区间</label>
    <select v-model="store.draft.span">
      <option v-for="span in RELATION_SPANS" :key="span">{{ span }}</option>
    </select>
    <label class="field-label">说明</label>
    <textarea v-model="store.draft.description"></textarea>
    <label class="check">
      <input v-model="store.draft.directional" type="checkbox">
      <span>有方向</span>
    </label>
    <p v-if="store.notice" class="lede">{{ store.notice }}</p>
    <div class="inspector-actions">
      <button class="btn primary" type="button" @click="store.saveDraft()">保存关系</button>
      <button class="btn" type="button" @click="store.draft = null">取消</button>
    </div>
  </template>

  <template v-else-if="character">
    <h2>{{ character.name }}</h2>
    <p class="lede">{{ character.status }} · {{ character.role || "未填写身份" }}</p>
    <label class="field-label">姓名</label>
    <input v-model="character.name" type="text" @input="store.scheduleCharacter(character.id)">
    <label class="field-label">别名</label>
    <input :value="character.aliases.join('、')" type="text" @input="aliases(($event.target as HTMLInputElement).value, character)">
    <label class="field-label">身份</label>
    <input v-model="character.role" type="text" @input="store.scheduleCharacter(character.id)">
    <label class="field-label">状态</label>
    <select v-model="character.status" @change="store.scheduleCharacter(character.id)">
      <option v-for="status in CHARACTER_STATUS" :key="status">{{ status }}</option>
    </select>
    <label class="field-label">外貌</label>
    <textarea v-model="character.appearance" @input="store.scheduleCharacter(character.id)"></textarea>
    <label class="field-label">性格</label>
    <textarea v-model="character.personality" @input="store.scheduleCharacter(character.id)"></textarea>
    <label class="field-label">目标</label>
    <textarea v-model="character.goal" @input="store.scheduleCharacter(character.id)"></textarea>
    <label class="field-label">背景</label>
    <textarea v-model="character.background" @input="store.scheduleCharacter(character.id)"></textarea>
    <label class="field-label">备注</label>
    <textarea v-model="character.notes" @input="store.scheduleCharacter(character.id)"></textarea>
    <p class="field-label">关系</p>
    <ul class="links">
      <li v-for="item in relationsOf(character.id)" :key="item.id">
        <button class="linkish" type="button" @click="store.select({ kind: 'relation', id: item.id }, 'graph')">
          {{ item.type }} · {{ nameOf(item.sourceId) }} → {{ nameOf(item.targetId) }}
        </button>
      </li>
    </ul>
    <div class="inspector-actions">
      <button class="btn" type="button" @click="store.beginRelation(character.id)">建立关系</button>
    </div>
    <div v-if="asking('character', character.id)" class="confirm">
      <p>删除这个人物会同时移除相关关系。章节和事件会保留，只解除关联。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('character', character.id, '')">删除</button>
    </div>
  </template>

  <template v-else-if="relation">
    <h2>{{ relation.type }}</h2>
    <p class="lede">{{ nameOf(relation.sourceId) }} → {{ nameOf(relation.targetId) }}</p>
    <label class="field-label">起点</label>
    <select v-model="relation.sourceId" @change="store.scheduleRelation(relation.id)">
      <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
    </select>
    <label class="field-label">终点</label>
    <select v-model="relation.targetId" @change="store.scheduleRelation(relation.id)">
      <option v-for="person in store.characters" :key="person.id" :value="person.id">{{ person.name }}</option>
    </select>
    <label class="field-label">类型</label>
    <select v-model="relation.type" @change="store.scheduleRelation(relation.id)">
      <option v-for="type in RELATION_TYPES" :key="type">{{ type }}</option>
    </select>
    <label class="field-label">区间</label>
    <select v-model="relation.span" @change="store.scheduleRelation(relation.id)">
      <option v-for="span in RELATION_SPANS" :key="span">{{ span }}</option>
    </select>
    <label class="field-label">说明</label>
    <textarea v-model="relation.description" @input="store.scheduleRelation(relation.id)"></textarea>
    <label class="check">
      <input v-model="relation.directional" type="checkbox" @change="store.scheduleRelation(relation.id)">
      <span>有方向</span>
    </label>
    <div v-if="asking('relation', relation.id)" class="confirm">
      <p>只删除这条关系，两个人物都会保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('relation', relation.id, '')">删除</button>
    </div>
  </template>

  <template v-else-if="event">
    <h2>{{ event.title }}</h2>
    <label class="field-label">标题</label>
    <input v-model="event.title" type="text" @input="store.scheduleEvent(event.id)">
    <label class="field-label">故事内时间</label>
    <input :value="event.storyTime ?? ''" type="text" @input="event.storyTime = ($event.target as HTMLInputElement).value; store.scheduleEvent(event.id)">
    <label class="field-label">说明</label>
    <textarea v-model="event.description" @input="store.scheduleEvent(event.id)"></textarea>
    <p class="field-label">参与人物</p>
    <div class="stack">
      <label v-for="person in store.characters" :key="person.id" class="check">
        <input
          type="checkbox"
          :checked="event.participants.some((item) => item.characterId === person.id)"
          @change="toggleParticipant(event, person.id, ($event.target as HTMLInputElement).checked)"
        >
        <span>{{ person.name }}</span>
      </label>
    </div>
    <div v-if="asking('event', event.id)" class="confirm">
      <p>事件会从故事线和章节引用中移除。人物档案保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('event', event.id, '')">删除</button>
    </div>
  </template>

  <template v-else-if="arc">
    <h2>{{ arc.title }}</h2>
    <label class="field-label">标题</label>
    <input v-model="arc.title" type="text" @input="store.scheduleArc(arc.id)">
    <label class="field-label">类型</label>
    <select v-model="arc.kind" @change="store.scheduleArc(arc.id)">
      <option v-for="kind in ARC_KINDS" :key="kind">{{ kind }}</option>
    </select>
    <label class="field-label">简介</label>
    <textarea v-model="arc.summary" @input="store.scheduleArc(arc.id)"></textarea>
    <p class="field-label">事件顺序</p>
    <div v-for="(eventId, index) in arc.eventIds" :key="eventId" class="toolbar">
      <span>{{ index + 1 }}. {{ eventTitle(eventId) }}</span>
      <button class="btn" type="button" @click="moveArcEvent(arc, eventId, -1)">上移</button>
      <button class="btn" type="button" @click="moveArcEvent(arc, eventId, 1)">下移</button>
      <button class="btn" type="button" @click="store.setArcEvents(arc.id, arc.eventIds.filter((id) => id !== eventId))">移出</button>
    </div>
    <p v-if="!arc.eventIds.length" class="empty">还没有事件。</p>
    <div class="toolbar">
      <select v-model="arcAddId" aria-label="加入事件">
        <option v-for="item in eventsNotIn(arc.eventIds)" :key="item.id" :value="item.id">{{ item.title }}</option>
      </select>
      <button class="btn" type="button" @click="addArcEvent(arc, arcAddId)">加入</button>
    </div>
    <div v-if="asking('arc', arc.id)" class="confirm">
      <p>只删除这条故事线，事件本身保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('arc', arc.id, '')">删除</button>
    </div>
  </template>

  <template v-else-if="chapter">
    <h2>{{ chapter.title }}</h2>
    <label class="field-label">标题</label>
    <input v-model="chapter.title" type="text" @input="store.scheduleChapter(chapter.id)">
    <label class="field-label">状态</label>
    <select v-model="chapter.status" @change="store.scheduleChapter(chapter.id)">
      <option v-for="status in CHAPTER_STATUS" :key="status">{{ status }}</option>
    </select>
    <label class="field-label">摘要</label>
    <textarea v-model="chapter.summary" @input="store.scheduleChapter(chapter.id)"></textarea>
    <div class="toolbar">
      <button class="btn" type="button" @click="store.moveChapter(chapter.id, -1)">上移</button>
      <button class="btn" type="button" @click="store.moveChapter(chapter.id, 1)">下移</button>
    </div>
    <p class="field-label">出场人物</p>
    <div class="stack">
      <label v-for="person in store.characters" :key="person.id" class="check">
        <input
          type="checkbox"
          :checked="chapter.characterIds.includes(person.id)"
          @change="chapter.characterIds = toggleId(chapter.characterIds, person.id, ($event.target as HTMLInputElement).checked); store.scheduleChapter(chapter.id)"
        >
        <span>{{ person.name }}</span>
      </label>
    </div>
    <p class="field-label">相关事件</p>
    <div class="stack">
      <label v-for="item in store.events" :key="item.id" class="check">
        <input
          type="checkbox"
          :checked="chapter.eventIds.includes(item.id)"
          @change="chapter.eventIds = toggleId(chapter.eventIds, item.id, ($event.target as HTMLInputElement).checked); store.scheduleChapter(chapter.id)"
        >
        <span>{{ item.title }}</span>
      </label>
    </div>
    <p class="field-label">场景</p>
    <div v-for="scene in chapterScenes" :key="scene.id" class="stack">
      <label class="field-label">场景标题</label>
      <input v-model="scene.title" type="text" @input="store.scheduleScene(scene.id)">
      <label class="field-label">故事内时间</label>
      <input :value="scene.storyTime ?? ''" type="text" @input="scene.storyTime = ($event.target as HTMLInputElement).value; store.scheduleScene(scene.id)">
      <label class="field-label">摘要</label>
      <textarea v-model="scene.summary" @input="store.scheduleScene(scene.id)"></textarea>
      <button class="btn danger" type="button" @click="store.askDelete('scene', scene.id, '')">删除场景</button>
    </div>
    <div v-if="asking('scene', store.confirm?.id || '')" class="confirm">
      <p>删除这个场景。章节会保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <p v-if="!chapterScenes.length" class="empty">这一章还没有场景。</p>
    <div class="inspector-actions">
      <button class="btn" type="button" @click="store.createScene(chapter.id)">新增场景</button>
    </div>
    <div v-if="asking('chapter', chapter.id)" class="confirm">
      <p>删除这一章和它下面的场景。人物和事件保留。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('chapter', chapter.id, '')">删除</button>
    </div>
  </template>

  <template v-else-if="note">
    <h2>{{ note.title }}</h2>
    <label class="field-label">标题</label>
    <input v-model="note.title" type="text" @input="store.scheduleNote(note.id)">
    <label class="field-label">标签</label>
    <input :value="note.tags.join('、')" type="text" @input="tags(($event.target as HTMLInputElement).value, note)">
    <label class="field-label">正文</label>
    <textarea v-model="note.content" @input="store.scheduleNote(note.id)"></textarea>
    <div v-if="asking('note', note.id)" class="confirm">
      <p>删除这条笔记。</p>
      <button class="btn danger" type="button" @click="store.confirmDelete()">确认删除</button>
      <button class="btn" type="button" @click="store.confirm = null">取消</button>
    </div>
    <div v-else class="inspector-actions">
      <button class="btn danger" type="button" @click="store.askDelete('note', note.id, '')">删除</button>
    </div>
  </template>

  <template v-else>
    <h2>详情</h2>
    <p class="empty">{{ hints[view] || "选择一条记录。" }}</p>
  </template>
</template>
