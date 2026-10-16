const VIEWS = [
  { id: "overview", index: "01", label: "概览", blurb: "这个示例项目演示人物、关系、事件和章节如何连在一起。" },
  { id: "characters", index: "02", label: "人物", blurb: "人物档案是关系图和章节引用的来源。" },
  { id: "graph", index: "03", label: "关系图", blurb: "拖动节点只改变布局。布局与人物资料分开保存。" },
  { id: "arcs", index: "04", label: "故事线", blurb: "故事线排列事件的叙事顺序，不改写事件本身。" },
  { id: "timeline", index: "05", label: "时间线", blurb: "这里按故事内时间排列。它不必和章节顺序相同。" },
  { id: "chapters", index: "06", label: "章节", blurb: "正文按 Markdown 原文保存，右侧是预览。" },
  { id: "notes", index: "07", label: "笔记", blurb: "还没升格为正式设定的记录放在这里。" },
  { id: "settings", index: "08", label: "设置", blurb: "主题保存在这台浏览器里。项目文件和快照要等正式版，原型不写入磁盘。" },
];

const RELATION_TYPES = ["亲属", "师徒", "恋爱", "合作", "敌对", "利用", "同门", "旧识", "未知"];
const CHARACTER_STATUS = ["在场", "离场", "下落不明"];
const CHAPTER_STATUS = ["构思中", "草稿", "修订中", "完成"];
const ARC_KINDS = ["主线", "支线", "人物线", "感情线"];
const NODE_W = 168;
const NODE_H = 72;

const state = {
  view: "overview",
  selection: null,
  confirm: null,
  draft: null,
  characterFilter: "",
  statusFilter: "全部",
  hiddenTypes: new Set(),
  project: seedProject(),
};

const searchInput = document.getElementById("search");
let drag = null;

function seedProject() {
  return {
    name: "北境剑录",
    description: "一部以北境剑庐为起点的长篇示例。沈照离庐三年，名册没有销名。",
    characters: [
      {
        id: "li-xuan",
        name: "李玄",
        aliases: "玄师",
        role: "剑庐主持",
        appearance: "头发花白，左手缺了小指。",
        personality: "很少解释自己的决定。",
        goal: "保住剑庐名册上尚未销名的人。",
        background: "原北境剑庐主持，边镇夜袭之后很少进城。",
        notes: "不承认沈照已经离开。",
        status: "在场",
      },
      {
        id: "lin-mo",
        name: "林默",
        aliases: "阿默",
        role: "弟子",
        appearance: "左眉有一道浅疤，常穿洗白的青布剑袍。",
        personality: "话少，答应过的事会做到。",
        goal: "找到离开剑庐的师姐沈照。",
        background: "北境猎户之子，承安元年被李玄收入剑庐。",
        notes: "不使用剑庐禁招。",
        status: "在场",
      },
      {
        id: "shen-zhao",
        name: "沈照",
        aliases: "照姐",
        role: "大师姐",
        appearance: "出门时把剑缠在包袱里，不佩在腰上。",
        personality: "对庐中规矩记得比谁都清。",
        goal: "未知。离庐时没有销名。",
        background: "李玄收下的第一个弟子。",
        notes: "名册上的名字还在。",
        status: "下落不明",
      },
      {
        id: "gu-heng",
        name: "顾衡",
        aliases: "",
        role: "边镇都尉",
        appearance: "右肩的甲片换过，颜色比其余的新。",
        personality: "说话先谈城防，再谈人。",
        goal: "查清承安四年秋的城北火。",
        background: "与剑庐有旧约：边镇遇袭时，庐中须出一人。",
        notes: "他不认为那把火是军中升起的。",
        status: "在场",
      },
    ],
    relations: [
      { id: "rel-1", sourceId: "li-xuan", targetId: "lin-mo", type: "师徒", description: "承安元年，李玄收林默为弟子。", directional: true },
      { id: "rel-2", sourceId: "li-xuan", targetId: "shen-zhao", type: "师徒", description: "沈照是李玄收下的第一个弟子。", directional: true },
      { id: "rel-3", sourceId: "lin-mo", targetId: "shen-zhao", type: "同门", description: "林默称沈照为师姐。", directional: true },
      { id: "rel-4", sourceId: "gu-heng", targetId: "li-xuan", type: "旧识", description: "边镇与剑庐有出人应援的旧约。", directional: false },
    ],
    events: [
      { id: "evt-enter", title: "林默入剑庐", storyTime: "承安元年春", sort: 1, description: "猎户之子林默被李玄收入名册。", participantIds: ["li-xuan", "lin-mo"] },
      { id: "evt-leave", title: "沈照离庐", storyTime: "承安三年冬", sort: 2, description: "沈照离开，名册没有销名。", participantIds: ["shen-zhao", "li-xuan"] },
      { id: "evt-raid", title: "边镇夜袭", storyTime: "承安四年秋", sort: 3, description: "城北起火，顾衡负伤。李玄当天不在镇上。", participantIds: ["gu-heng"] },
      { id: "evt-south", title: "林默南下", storyTime: "承安五年春", sort: 4, description: "林默沿官道离开北境，去找沈照。", participantIds: ["lin-mo", "li-xuan"] },
    ],
    arcs: [
      { id: "arc-main", title: "寻人", kind: "主线", summary: "林默查清沈照为什么没有销名。", eventIds: ["evt-leave", "evt-south"] },
      { id: "arc-side", title: "边镇旧约", kind: "支线", summary: "剑庐欠边镇一次出人。", eventIds: ["evt-raid"] },
    ],
    chapters: [
      {
        id: "ch-1",
        title: "雪线",
        status: "草稿",
        summary: "叙述从南下那天早晨开始。",
        sort: 1,
        content: "林默在官道边站到天色发白。剑还是离庐前那一把，鞘口的漆已经掉了。\n\n他没有再回头看剑庐的方向。名册上，沈照的名字还在。",
        characterIds: ["lin-mo"],
        eventIds: ["evt-south"],
      },
      {
        id: "ch-2",
        title: "旧约",
        status: "构思中",
        summary: "回溯边镇夜袭，并写明名册规矩。",
        sort: 2,
        content: "夜袭发生在承安四年秋。顾衡后来只说，城北的火不是军中升起的。\n\n李玄那天不在边上。他让林默记住：没销名的人，不算离开。",
        characterIds: ["gu-heng", "li-xuan", "lin-mo"],
        eventIds: ["evt-raid"],
      },
    ],
    scenes: [
      { id: "sc-1", chapterId: "ch-1", title: "官道", summary: "林默在雪线边等到天明。", storyTime: "承安五年春", sort: 1 },
    ],
    notes: [
      { id: "note-road", title: "北境道路", tags: "地理", content: "入冬之后，北境只剩一条官道还能走车。" },
      { id: "note-name", title: "销名", tags: "剑庐规矩", content: "弟子离庐要在名册上销名。没有销名的人，庐中仍视为未离开。" },
    ],
    layout: {
      "li-xuan": { x: 300, y: 28 },
      "lin-mo": { x: 36, y: 280 },
      "shen-zhao": { x: 300, y: 280 },
      "gu-heng": { x: 580, y: 280 },
    },
  };
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function byId(list, id) {
  return list.find((item) => item.id === id) || null;
}

function collectionName(entity) {
  const names = {
    character: "characters",
    relation: "relations",
    event: "events",
    arc: "arcs",
    chapter: "chapters",
    scene: "scenes",
    note: "notes",
  };
  return names[entity];
}

function characterName(id) {
  return byId(state.project.characters, id)?.name || "未命名人物";
}

function eventTitle(id) {
  return byId(state.project.events, id)?.title || "未命名事件";
}

function sortedEvents() {
  return [...state.project.events].sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title, "zh"));
}

function sortedChapters() {
  return [...state.project.chapters].sort((a, b) => a.sort - b.sort);
}

function firstChapter(eventId) {
  return sortedChapters().find((chapter) => chapter.eventIds.includes(eventId)) || null;
}

function visibleRelations() {
  return state.project.relations.filter((relation) => !state.hiddenTypes.has(relation.type));
}

function visibleCharacters() {
  const query = state.characterFilter.trim().toLowerCase();
  return state.project.characters.filter((character) => {
    const statusOk = state.statusFilter === "全部" || character.status === state.statusFilter;
    const textOk = !query || `${character.name} ${character.aliases}`.toLowerCase().includes(query);
    return statusOk && textOk;
  });
}

function viewOf(kind) {
  const views = {
    character: "characters",
    relation: "graph",
    event: "timeline",
    arc: "arcs",
    chapter: "chapters",
    note: "notes",
    scene: "chapters",
  };
  return views[kind] || state.view;
}

function selectedRecord() {
  if (!state.selection || state.selection.kind === "draft") return null;
  const name = collectionName(state.selection.kind);
  if (!name) return null;
  return byId(state.project[name], state.selection.id);
}

function markdown(source) {
  const lines = esc(source).split("\n");
  let html = "";
  let inList = false;
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  const inline = (text) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  lines.forEach((line) => {
    if (line.startsWith("### ")) {
      closeList();
      html += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (line.startsWith("## ")) {
      closeList();
      html += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inline(line.slice(2))}</li>`;
    } else if (line.trim() === "") {
      closeList();
    } else {
      closeList();
      html += `<p>${inline(line)}</p>`;
    }
  });
  closeList();
  return html || "<p>这一章还没有正文。</p>";
}

function head(viewId, meta) {
  const view = VIEWS.find((item) => item.id === viewId);
  return `
    <header class="ws-head">
      <div class="ws-title">
        <span class="folio">${view.index}</span>
        <div>
          <h1>${view.label}</h1>
          <p>${view.blurb}</p>
        </div>
      </div>
      <p class="ws-meta">${esc(meta)}</p>
    </header>
  `;
}

function renderNav() {
  document.getElementById("nav").innerHTML = VIEWS.filter((view) => view.id !== "settings").map((view) => `
    <button type="button" data-action="nav" data-view="${view.id}" ${state.view === view.id ? 'aria-current="page"' : ""}>
      <span class="nav-index">${view.index}</span>
      <span>${view.label}</span>
    </button>
  `).join("");
}

function render() {
  renderNav();
  renderWorkspace();
  renderInspector();
  document.getElementById("project-name").textContent = state.project.name.trim() || "未命名项目";
}

function renderWorkspace() {
  const pages = {
    overview: renderOverview,
    characters: renderCharacters,
    graph: renderGraph,
    arcs: renderArcs,
    timeline: renderTimeline,
    chapters: renderChapters,
    notes: renderNotes,
    settings: renderSettings,
  };
  document.getElementById("workspace").innerHTML = pages[state.view]();
  if (state.view === "graph") paintEdges();
}

function renderOverview() {
  const openChapters = state.project.chapters.filter((chapter) => chapter.status !== "完成").length;
  const mismatch = narrativeMismatch();
  return `
    ${head("overview", "示例项目")}
    <p class="lede">${esc(state.project.description)}</p>
    <div class="stats">
      <div class="stat"><b>${state.project.characters.length}</b><span>人物</span></div>
      <div class="stat"><b>${state.project.relations.length}</b><span>关系</span></div>
      <div class="stat"><b>${state.project.events.length}</b><span>事件</span></div>
      <div class="stat"><b>${openChapters}</b><span>未完成章节</span></div>
    </div>
    ${mismatch ? `<p>${esc(mismatch)}</p>` : ""}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-character">新增人物</button>
      <button class="btn" type="button" data-action="add-event">新增事件</button>
      <button class="btn" type="button" data-action="add-chapter">新建章节</button>
      <button class="btn" type="button" data-action="nav" data-view="timeline">打开时间线</button>
    </div>
  `;
}

function narrativeMismatch() {
  const told = sortedEvents().filter((event) => firstChapter(event.id));
  if (told.length < 2) return "";
  const byNarrative = [...told].sort((a, b) => firstChapter(a.id).sort - firstChapter(b.id).sort);
  const differs = told.some((event, index) => event.id !== byNarrative[index].id);
  return differs ? "有些事件的叙述顺序和故事内时间不一致。时间线会把两种顺序一起标出来。" : "";
}

function renderCharacters() {
  return `
    ${head("characters", `${visibleCharacters().length} / ${state.project.characters.length} 人`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-character">新增人物</button>
      <select aria-label="按状态筛选" data-action="filter-status">
        ${["全部", ...CHARACTER_STATUS].map((status) => `<option ${status === state.statusFilter ? "selected" : ""}>${esc(status)}</option>`).join("")}
      </select>
      <input id="character-filter" type="text" placeholder="按姓名或别名筛选" aria-label="按姓名或别名筛选" value="${esc(state.characterFilter)}">
    </div>
    <table class="table">
      <thead><tr><th>姓名</th><th>身份</th><th>状态</th><th>目标</th></tr></thead>
      <tbody id="character-rows">${characterRows()}</tbody>
    </table>
  `;
}

function characterRows() {
  const rows = visibleCharacters();
  if (!rows.length) {
    return `<tr><td colspan="4">没有匹配的人物。</td></tr>`;
  }
  return rows.map((character) => `
    <tr data-action="open" data-kind="character" data-id="${character.id}" data-view="characters" tabindex="0" aria-selected="${isSelected("character", character.id)}">
      <td><span data-bind="character:${character.id}">${esc(character.name)}</span></td>
      <td>${esc(character.role || "未填写")}</td>
      <td>${esc(character.status)}</td>
      <td>${esc(character.goal || "未填写")}</td>
    </tr>
  `).join("");
}

function renderGraph() {
  const types = [...new Set(state.project.relations.map((relation) => relation.type))];
  const filters = types.map((type) => `
    <label class="filter">
      <input type="checkbox" data-action="toggle-type" data-type="${esc(type)}" ${state.hiddenTypes.has(type) ? "" : "checked"}>
      ${esc(type)}
    </label>
  `).join("");
  const nodes = state.project.characters.map((character, index) => {
    const pos = state.project.layout[character.id] || { x: 24, y: 24 };
    return `
      <button type="button" class="node ${isSelected("character", character.id) ? "is-selected" : ""}" data-id="${character.id}" style="transform: translate(${pos.x}px, ${pos.y}px)">
        <span class="node-index">${String(index + 1).padStart(2, "0")}</span>
        <strong class="node-name">${esc(character.name)}</strong>
        <span class="node-role">${esc(character.role || "未填写身份")}</span>
      </button>
    `;
  }).join("");
  return `
    ${head("graph", `${state.project.characters.length} 个节点 · ${visibleRelations().length} 条关系`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="draft-relation">建立关系</button>
      <div class="filters">${filters || ""}</div>
    </div>
    <div class="graph-wrap" id="graph-board">
      <div class="graph-canvas" id="graph-canvas">
        <svg class="edges" id="edges"></svg>
        ${nodes}
      </div>
    </div>
  `;
}

function renderArcs() {
  const cards = state.project.arcs.map((arc) => `
    <article class="card" data-action="open" data-kind="arc" data-id="${arc.id}" data-view="arcs" tabindex="0" aria-selected="${isSelected("arc", arc.id)}">
      <header>
        <h2 data-bind="arc:${arc.id}">${esc(arc.title)}</h2>
        <span>${esc(arc.kind)}</span>
      </header>
      <p>${esc(arc.summary || "还没有简介。")}</p>
      <ol>
        ${arc.eventIds.map((id) => `<li>${esc(eventTitle(id))}</li>`).join("") || "<li>还没有事件。</li>"}
      </ol>
    </article>
  `).join("");
  return `
    ${head("arcs", `${state.project.arcs.length} 条故事线`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-arc">新建故事线</button>
    </div>
    ${cards || `<p class="empty">还没有故事线。</p>`}
  `;
}

function renderTimeline() {
  const items = sortedEvents().map((event) => {
    const chapter = firstChapter(event.id);
    const people = event.participantIds.map(characterName).join("、") || "没有参与者";
    return `
      <li data-action="open" data-kind="event" data-id="${event.id}" data-view="timeline" tabindex="0" aria-selected="${isSelected("event", event.id)}">
        <div class="when">${esc(event.storyTime || "未知")}</div>
        <div class="rail" aria-hidden="true"><span class="dot"></span></div>
        <div class="event-body">
          <strong data-bind="event:${event.id}">${esc(event.title)}</strong>
          <p class="lede">${esc(event.description || "没有说明。")}</p>
          <p class="lede">${esc(people)} · ${chapter ? `首次叙述于第 ${chapter.sort} 章 ${esc(chapter.title)}` : "尚未写入章节"}</p>
          <div class="toolbar">
            <button class="btn" type="button" data-action="move-event" data-id="${event.id}" data-delta="-1">上移</button>
            <button class="btn" type="button" data-action="move-event" data-id="${event.id}" data-delta="1">下移</button>
          </div>
        </div>
      </li>
    `;
  }).join("");
  return `
    ${head("timeline", `${state.project.events.length} 个事件`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-event">新增事件</button>
    </div>
    <ol class="timeline">${items || ""}</ol>
  `;
}

function renderChapters() {
  const selected = isSelected("chapter", state.selection?.id) ? selectedRecord() : null;
  const rows = sortedChapters().map((chapter) => `
    <tr data-action="open" data-kind="chapter" data-id="${chapter.id}" data-view="chapters" tabindex="0" aria-selected="${isSelected("chapter", chapter.id)}">
      <td>第 ${chapter.sort} 章</td>
      <td data-bind="chapter:${chapter.id}">${esc(chapter.title)}</td>
      <td>${esc(chapter.status)}</td>
      <td>${esc(chapter.summary || "没有摘要")}</td>
    </tr>
  `).join("");
  const editor = selected ? `
    <div class="split">
      <div class="editor">
        <textarea aria-label="章节正文" data-entity="chapter" data-id="${selected.id}" data-field="content">${esc(selected.content)}</textarea>
      </div>
      <div class="preview">${markdown(selected.content)}</div>
    </div>
  ` : `<p class="empty">选择一章后可以编辑正文。</p>`;
  return `
    ${head("chapters", `${state.project.chapters.length} 章`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-chapter">新建章节</button>
    </div>
    <table class="table">
      <thead><tr><th>顺序</th><th>标题</th><th>状态</th><th>摘要</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="4">还没有章节。</td></tr>`}</tbody>
    </table>
    ${editor}
  `;
}

function renderNotes() {
  const cards = state.project.notes.map((note) => `
    <article class="card" data-action="open" data-kind="note" data-id="${note.id}" data-view="notes" tabindex="0" aria-selected="${isSelected("note", note.id)}">
      <header>
        <h2 data-bind="note:${note.id}">${esc(note.title)}</h2>
        <span>${esc(note.tags || "无标签")}</span>
      </header>
      <p>${esc(note.content)}</p>
    </article>
  `).join("");
  return `
    ${head("notes", `${state.project.notes.length} 条笔记`)}
    <div class="toolbar">
      <button class="btn primary" type="button" data-action="add-note">新建笔记</button>
    </div>
    ${cards || `<p class="empty">还没有笔记。</p>`}
  `;
}

function currentTheme() {
  return document.documentElement.dataset.theme === "ink" ? "ink" : "paper";
}

function renderSettings() {
  const theme = currentTheme();
  const card = (id, name, note, swatch) => `
    <button class="theme-card ${theme === id ? "is-on" : ""}" type="button" data-action="theme" data-theme="${id}" aria-pressed="${theme === id}">
      <span class="swatch ${swatch}"></span>
      <strong>${name}</strong>
      <span>${note}</span>
    </button>
  `;
  return `
    ${head("settings", theme === "ink" ? "夜墨" : "宣纸")}
    <div class="theme-choices">
      ${card("paper", "宣纸", "浅色工作台，适合长时间看正文。", "paper")}
      ${card("ink", "夜墨", "深色工作台，关系图和正文仍保持同一套结构。", "ink")}
    </div>
    <article class="card"><h2>数据位置</h2><p>正式版把项目保存在本机的 SQLite 文件中。这个原型的修改只留在当前会话，刷新页面会回到示例项目。主题选择会留在这台浏览器里。</p></article>
    <article class="card"><h2>备份</h2><p>正式版默认保留最近 10 份快照。导入或恢复前会再做一份。原型没有快照。</p></article>
    <article class="card"><h2>模型</h2><p>模型辅助不在当前版本里。这里没有可调用的模型，也不会发送正文。</p></article>
    <article class="card"><h2>导出</h2><p>顶栏的导出 JSON 会下载当前会话。文件标记为 storyweave.prototype，不是将来的正式项目包。</p></article>
  `;
}

function renderInspector() {
  document.getElementById("inspector").innerHTML = inspectorHtml();
}

function inspectorHtml() {
  if (state.view === "overview") return projectInspector();
  if (state.view === "settings") {
    return `<h2>设置</h2><p class="lede">这里说明的是正式版会保存的内容。当前原型不写入磁盘。</p>`;
  }
  if (state.selection?.kind === "draft") return draftInspector();
  const record = selectedRecord();
  if (!record) return `<h2>详情</h2><p class="empty">${emptyHint()}</p>`;
  const renderers = {
    character: characterInspector,
    relation: relationInspector,
    event: eventInspector,
    arc: arcInspector,
    chapter: chapterInspector,
    note: noteInspector,
    scene: sceneInspector,
  };
  return renderers[state.selection.kind](record);
}

function emptyHint() {
  const hints = {
    characters: "选择一个人物查看档案。",
    graph: "选择一个节点或一条关系。",
    arcs: "选择一条故事线编辑事件顺序。",
    timeline: "选择一个事件。",
    chapters: "选择一章编辑正文和出场人物。",
    notes: "选择一条笔记。",
  };
  return hints[state.view] || "选择一条记录。";
}

function projectInspector() {
  return `
    <h2>项目</h2>
    <p class="lede">示例数据，只存在于这次打开的页面里。</p>
    ${textField("project", "project", "名称", "name", state.project.name)}
    ${areaField("project", "project", "简介", "description", state.project.description)}
  `;
}

function characterInspector(character) {
  const relations = state.project.relations.filter((relation) => relation.sourceId === character.id || relation.targetId === character.id);
  const events = state.project.events.filter((event) => event.participantIds.includes(character.id));
  const chapters = state.project.chapters.filter((chapter) => chapter.characterIds.includes(character.id));
  return `
    <h2>${esc(character.name)}</h2>
    <p class="lede">${esc(character.status)} · ${esc(character.role || "未填写身份")}</p>
    ${textField("character", character.id, "姓名", "name", character.name)}
    ${textField("character", character.id, "别名", "aliases", character.aliases)}
    ${textField("character", character.id, "身份", "role", character.role)}
    ${selectField("character", character.id, "状态", "status", CHARACTER_STATUS, character.status)}
    ${areaField("character", character.id, "外貌", "appearance", character.appearance)}
    ${areaField("character", character.id, "性格", "personality", character.personality)}
    ${areaField("character", character.id, "目标", "goal", character.goal)}
    ${areaField("character", character.id, "背景", "background", character.background)}
    ${areaField("character", character.id, "备注", "notes", character.notes)}
    <p class="field-label">关系</p>
    ${linkList(relations.map((relation) => ({
      kind: "relation",
      id: relation.id,
      view: "graph",
      label: `${relation.type} · ${characterName(relation.sourceId)} → ${characterName(relation.targetId)}`,
    })))}
    <p class="field-label">参与事件</p>
    ${linkList(events.map((event) => ({ kind: "event", id: event.id, view: "timeline", label: event.title })))}
    <p class="field-label">出场章节</p>
    ${linkList(chapters.map((chapter) => ({ kind: "chapter", id: chapter.id, view: "chapters", label: chapter.title })))}
    <div class="inspector-actions">
      <button class="btn" type="button" data-action="draft-relation">建立关系</button>
    </div>
    ${deleteBlock("character", character.id, "删除这个人物会同时移除相关关系。章节和事件会保留，只解除关联。")}
  `;
}

function relationInspector(relation) {
  return `
    <h2>${esc(relation.type)}</h2>
    <p class="lede">${esc(characterName(relation.sourceId))} → ${esc(characterName(relation.targetId))}</p>
    ${characterSelect("relation", relation.id, "起点", "sourceId", relation.sourceId)}
    ${characterSelect("relation", relation.id, "终点", "targetId", relation.targetId)}
    ${selectField("relation", relation.id, "类型", "type", RELATION_TYPES, relation.type)}
    ${areaField("relation", relation.id, "说明", "description", relation.description)}
    <label class="check">
      <input type="checkbox" data-entity="relation" data-id="${relation.id}" data-field="directional" ${relation.directional ? "checked" : ""}>
      <span>有方向</span>
    </label>
    ${deleteBlock("relation", relation.id, "只删除这条关系，两个人物都会保留。")}
  `;
}

function eventInspector(event) {
  return `
    <h2>${esc(event.title)}</h2>
    ${textField("event", event.id, "标题", "title", event.title)}
    ${textField("event", event.id, "故事内时间", "storyTime", event.storyTime)}
    ${areaField("event", event.id, "说明", "description", event.description)}
    <p class="field-label">参与人物</p>
    ${checkList("event", event.id, "participantIds", state.project.characters.map((character) => ({ id: character.id, label: character.name })))}
    ${deleteBlock("event", event.id, "事件会从故事线和章节引用中移除。人物档案保留。")}
  `;
}

function arcInspector(arc) {
  const items = arc.eventIds.map((eventId, index) => `
    <div class="toolbar">
      <span>${index + 1}. ${esc(eventTitle(eventId))}</span>
      <button class="btn" type="button" data-action="move-arc-event" data-id="${arc.id}" data-event="${eventId}" data-delta="-1">上移</button>
      <button class="btn" type="button" data-action="move-arc-event" data-id="${arc.id}" data-event="${eventId}" data-delta="1">下移</button>
      <button class="btn" type="button" data-action="remove-arc-event" data-id="${arc.id}" data-event="${eventId}">移出</button>
    </div>
  `).join("");
  const available = state.project.events.filter((event) => !arc.eventIds.includes(event.id));
  const adder = available.length ? `
    <div class="toolbar">
      <select id="arc-add-${arc.id}" aria-label="加入事件">
        ${available.map((event) => `<option value="${event.id}">${esc(event.title)}</option>`).join("")}
      </select>
      <button class="btn" type="button" data-action="add-arc-event" data-id="${arc.id}">加入</button>
    </div>
  ` : `<p class="empty">所有事件都已在这条故事线里。</p>`;
  return `
    <h2>${esc(arc.title)}</h2>
    ${textField("arc", arc.id, "标题", "title", arc.title)}
    ${selectField("arc", arc.id, "类型", "kind", ARC_KINDS, arc.kind)}
    ${areaField("arc", arc.id, "简介", "summary", arc.summary)}
    <p class="field-label">事件顺序</p>
    ${items || `<p class="empty">还没有事件。</p>`}
    ${adder}
    ${deleteBlock("arc", arc.id, "只删除这条故事线，事件本身保留。")}
  `;
}

function chapterInspector(chapter) {
  const scenes = state.project.scenes.filter((scene) => scene.chapterId === chapter.id).sort((a, b) => a.sort - b.sort);
  return `
    <h2>${esc(chapter.title)}</h2>
    ${textField("chapter", chapter.id, "标题", "title", chapter.title)}
    ${selectField("chapter", chapter.id, "状态", "status", CHAPTER_STATUS, chapter.status)}
    ${areaField("chapter", chapter.id, "摘要", "summary", chapter.summary)}
    <p class="field-label">出场人物</p>
    ${checkList("chapter", chapter.id, "characterIds", state.project.characters.map((character) => ({ id: character.id, label: character.name })))}
    <p class="field-label">相关事件</p>
    ${checkList("chapter", chapter.id, "eventIds", state.project.events.map((event) => ({ id: event.id, label: event.title })))}
    <p class="field-label">场景</p>
    ${scenes.map((scene) => `
      <div class="stack">
        ${textField("scene", scene.id, "场景标题", "title", scene.title)}
        ${textField("scene", scene.id, "故事内时间", "storyTime", scene.storyTime)}
        ${areaField("scene", scene.id, "摘要", "summary", scene.summary)}
      </div>
    `).join("") || `<p class="empty">这一章还没有场景。</p>`}
    <div class="inspector-actions">
      <button class="btn" type="button" data-action="add-scene" data-id="${chapter.id}">新增场景</button>
    </div>
    ${deleteBlock("chapter", chapter.id, "删除这一章和它下面的场景。人物和事件保留。")}
  `;
}

function noteInspector(note) {
  return `
    <h2>${esc(note.title)}</h2>
    ${textField("note", note.id, "标题", "title", note.title)}
    ${textField("note", note.id, "标签", "tags", note.tags)}
    ${areaField("note", note.id, "正文", "content", note.content)}
    ${deleteBlock("note", note.id, "删除这条笔记。")}
  `;
}

function sceneInspector(scene) {
  return `
    <h2>${esc(scene.title)}</h2>
    ${textField("scene", scene.id, "标题", "title", scene.title)}
    ${deleteBlock("scene", scene.id, "删除这个场景。章节会保留。")}
  `;
}

function draftInspector() {
  const draft = state.draft;
  return `
    <h2>建立关系</h2>
    <p class="lede">一条关系连接两个不同的人物。</p>
    ${characterSelect("draft", "draft", "起点", "sourceId", draft.sourceId)}
    ${characterSelect("draft", "draft", "终点", "targetId", draft.targetId)}
    ${selectField("draft", "draft", "类型", "type", RELATION_TYPES, draft.type)}
    ${areaField("draft", "draft", "说明", "description", draft.description)}
    <label class="check">
      <input type="checkbox" data-entity="draft" data-field="directional" ${draft.directional ? "checked" : ""}>
      <span>有方向</span>
    </label>
    <p class="lede" id="relation-error"></p>
    <div class="inspector-actions">
      <button class="btn primary" type="button" data-action="save-relation">保存关系</button>
      <button class="btn" type="button" data-action="cancel-draft">取消</button>
    </div>
  `;
}

function textField(entity, id, label, field, value) {
  const fieldId = `${entity}-${field}-${id}`;
  return `
    <label class="field-label" for="${fieldId}">${label}</label>
    <input id="${fieldId}" type="text" data-entity="${entity}" data-id="${id}" data-field="${field}" value="${esc(value)}">
  `;
}

function areaField(entity, id, label, field, value) {
  const fieldId = `${entity}-${field}-${id}`;
  return `
    <label class="field-label" for="${fieldId}">${label}</label>
    <textarea id="${fieldId}" data-entity="${entity}" data-id="${id}" data-field="${field}">${esc(value)}</textarea>
  `;
}

function selectField(entity, id, label, field, options, value) {
  const fieldId = `${entity}-${field}-${id}`;
  return `
    <label class="field-label" for="${fieldId}">${label}</label>
    <select id="${fieldId}" data-entity="${entity}" data-id="${id}" data-field="${field}">
      ${options.map((option) => `<option ${option === value ? "selected" : ""}>${esc(option)}</option>`).join("")}
    </select>
  `;
}

function characterSelect(entity, id, label, field, value) {
  const fieldId = `${entity}-${field}-${id}`;
  return `
    <label class="field-label" for="${fieldId}">${label}</label>
    <select id="${fieldId}" data-entity="${entity}" data-id="${id}" data-field="${field}">
      <option value="" ${value ? "" : "selected"}>选择人物</option>
      ${state.project.characters.map((character) => `<option value="${character.id}" ${character.id === value ? "selected" : ""}>${esc(character.name)}</option>`).join("")}
    </select>
  `;
}

function checkList(entity, id, field, options) {
  const record = byId(state.project[collectionName(entity)], id);
  const selected = new Set(record?.[field] || []);
  if (!options.length) return `<p class="empty">没有可选项。</p>`;
  return `<div class="stack">${options.map((option) => `
    <label class="check">
      <input type="checkbox" data-entity="${entity}" data-id="${id}" data-field="${field}" data-toggle="list" data-value="${esc(option.id)}" ${selected.has(option.id) ? "checked" : ""}>
      <span>${esc(option.label)}</span>
    </label>
  `).join("")}</div>`;
}

function linkList(items) {
  if (!items.length) return `<p class="empty">没有关联。</p>`;
  return `<ul class="links">${items.map((item) => `
    <li><button class="linkish" type="button" data-action="open" data-kind="${item.kind}" data-id="${item.id}" data-view="${item.view}">${esc(item.label)}</button></li>
  `).join("")}</ul>`;
}

function deleteBlock(kind, id, message) {
  const pending = state.confirm?.kind === kind && state.confirm?.id === id;
  if (!pending) {
    return `<div class="inspector-actions"><button class="btn danger" type="button" data-action="ask-delete" data-kind="${kind}" data-id="${id}">删除</button></div>`;
  }
  return `
    <div class="confirm">
      <p>${esc(message)}</p>
      <button class="btn danger" type="button" data-action="confirm-delete">确认删除</button>
      <button class="btn" type="button" data-action="cancel-delete">取消</button>
    </div>
  `;
}

function isSelected(kind, id) {
  return state.selection?.kind === kind && state.selection?.id === id;
}

function openRecord(kind, id, view) {
  state.selection = { kind, id };
  state.confirm = null;
  state.draft = null;
  if (view) state.view = view;
  history.replaceState(null, "", `#${state.view}`);
  render();
}

function writeField(el) {
  const { entity, id, field } = el.dataset;
  if (!field) return;
  if (entity === "project") {
    state.project[field] = el.value;
    return;
  }
  if (entity === "draft") {
    state.draft[field] = el.type === "checkbox" ? el.checked : el.value;
    return;
  }
  const record = byId(state.project[collectionName(entity)], id);
  if (!record) return;
  if (el.dataset.toggle === "list") {
    const values = new Set(record[field] || []);
    if (el.checked) values.add(el.dataset.value);
    else values.delete(el.dataset.value);
    record[field] = [...values];
    return;
  }
  if (el.type === "checkbox") record[field] = el.checked;
  else record[field] = el.value;
}

function patchLive(el) {
  if (el.dataset.entity === "project" && el.dataset.field === "name") {
    document.getElementById("project-name").textContent = el.value.trim() || "未命名项目";
  }
  if ((el.dataset.field === "name" || el.dataset.field === "title") && el.dataset.id) {
    document.querySelectorAll(`[data-bind="${el.dataset.entity}:${el.dataset.id}"]`).forEach((node) => {
      node.textContent = el.value;
    });
  }
  if (el.dataset.entity === "chapter" && el.dataset.field === "content") {
    const preview = document.querySelector(".preview");
    if (preview) preview.innerHTML = markdown(el.value);
  }
  if (el.dataset.entity === "character" && el.dataset.id) {
    const node = document.querySelector(`.node[data-id="${el.dataset.id}"]`);
    if (!node) return;
    if (el.dataset.field === "name") node.querySelector(".node-name").textContent = el.value;
    if (el.dataset.field === "role") node.querySelector(".node-role").textContent = el.value || "未填写身份";
  }
}

function addCharacter() {
  const id = uid("chr");
  const index = state.project.characters.length;
  state.project.characters.push({
    id,
    name: "未命名人物",
    aliases: "",
    role: "",
    appearance: "",
    personality: "",
    goal: "",
    background: "",
    notes: "",
    status: "在场",
  });
  state.project.layout[id] = { x: 36 + (index % 3) * 200, y: 36 + Math.floor(index / 3) * 130 };
  openRecord("character", id, "characters");
}

function addEvent() {
  const id = uid("evt");
  const sort = state.project.events.reduce((max, event) => Math.max(max, event.sort), 0) + 1;
  state.project.events.push({
    id,
    title: "未命名事件",
    storyTime: "",
    sort,
    description: "",
    participantIds: [],
  });
  openRecord("event", id, "timeline");
}

function addArc() {
  const id = uid("arc");
  state.project.arcs.push({ id, title: "未命名故事线", kind: "支线", summary: "", eventIds: [] });
  openRecord("arc", id, "arcs");
}

function addChapter() {
  const id = uid("ch");
  const sort = state.project.chapters.reduce((max, chapter) => Math.max(max, chapter.sort), 0) + 1;
  state.project.chapters.push({
    id,
    title: "未命名章节",
    status: "构思中",
    summary: "",
    sort,
    content: "",
    characterIds: [],
    eventIds: [],
  });
  openRecord("chapter", id, "chapters");
}

function addNote() {
  const id = uid("note");
  state.project.notes.push({ id, title: "未命名笔记", tags: "", content: "" });
  openRecord("note", id, "notes");
}

function addScene(chapterId) {
  const sort = state.project.scenes.filter((scene) => scene.chapterId === chapterId).length + 1;
  state.project.scenes.push({
    id: uid("scn"),
    chapterId,
    title: "未命名场景",
    summary: "",
    storyTime: "",
    sort,
  });
  state.selection = { kind: "chapter", id: chapterId };
  render();
}

function startDraft() {
  const sourceId = state.selection?.kind === "character"
    ? state.selection.id
    : (state.project.characters[0]?.id || "");
  state.draft = {
    sourceId,
    targetId: "",
    type: "未知",
    description: "",
    directional: true,
  };
  state.selection = { kind: "draft" };
  state.confirm = null;
  state.view = "graph";
  history.replaceState(null, "", "#graph");
  render();
}

function saveRelation() {
  const draft = state.draft;
  const error = document.getElementById("relation-error");
  if (!draft?.sourceId || !draft.targetId) {
    if (error) error.textContent = "选择关系的两端。";
    return;
  }
  if (draft.sourceId === draft.targetId) {
    if (error) error.textContent = "不能把人物连向自己。";
    return;
  }
  const id = uid("rel");
  state.project.relations.push({
    id,
    sourceId: draft.sourceId,
    targetId: draft.targetId,
    type: draft.type || "未知",
    description: draft.description || "",
    directional: Boolean(draft.directional),
  });
  state.draft = null;
  openRecord("relation", id, "graph");
}

function confirmDelete() {
  const target = state.confirm;
  if (!target) return;
  const { kind, id } = target;
  if (kind === "character") {
    state.project.characters = state.project.characters.filter((character) => character.id !== id);
    state.project.relations = state.project.relations.filter((relation) => relation.sourceId !== id && relation.targetId !== id);
    state.project.events.forEach((event) => {
      event.participantIds = event.participantIds.filter((personId) => personId !== id);
    });
    state.project.chapters.forEach((chapter) => {
      chapter.characterIds = chapter.characterIds.filter((personId) => personId !== id);
    });
    delete state.project.layout[id];
  } else if (kind === "relation") {
    state.project.relations = state.project.relations.filter((relation) => relation.id !== id);
  } else if (kind === "event") {
    state.project.events = state.project.events.filter((event) => event.id !== id);
    state.project.arcs.forEach((arc) => {
      arc.eventIds = arc.eventIds.filter((eventId) => eventId !== id);
    });
    state.project.chapters.forEach((chapter) => {
      chapter.eventIds = chapter.eventIds.filter((eventId) => eventId !== id);
    });
  } else if (kind === "arc") {
    state.project.arcs = state.project.arcs.filter((arc) => arc.id !== id);
  } else if (kind === "chapter") {
    state.project.chapters = state.project.chapters.filter((chapter) => chapter.id !== id);
    state.project.scenes = state.project.scenes.filter((scene) => scene.chapterId !== id);
  } else if (kind === "note") {
    state.project.notes = state.project.notes.filter((note) => note.id !== id);
  } else if (kind === "scene") {
    state.project.scenes = state.project.scenes.filter((scene) => scene.id !== id);
  }
  state.selection = null;
  state.confirm = null;
  render();
}

function moveEvent(id, delta) {
  const events = sortedEvents();
  const index = events.findIndex((event) => event.id === id);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= events.length) return;
  const current = events[index];
  events[index] = events[next];
  events[next] = current;
  events.forEach((event, order) => {
    event.sort = order + 1;
  });
  render();
}

function moveArcEvent(arcId, eventId, delta) {
  const arc = byId(state.project.arcs, arcId);
  if (!arc) return;
  const index = arc.eventIds.indexOf(eventId);
  const next = index + delta;
  if (index < 0 || next < 0 || next >= arc.eventIds.length) return;
  const [item] = arc.eventIds.splice(index, 1);
  arc.eventIds.splice(next, 0, item);
  render();
}

function exportProject() {
  const payload = {
    format: "storyweave.prototype",
    version: 0,
    note: "原型导出，不是正式项目包。",
    project: state.project,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${state.project.name || "storyweave"}.storyweave.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function searchItems(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hit = (...parts) => parts.some((part) => String(part || "").toLowerCase().includes(q));
  const items = [];
  state.project.characters.forEach((character) => {
    if (hit(character.name, character.aliases, character.role, character.goal, character.notes)) {
      items.push({ kind: "character", id: character.id, view: "characters", kindLabel: "人物", label: character.name });
    }
  });
  state.project.events.forEach((event) => {
    if (hit(event.title, event.description, event.storyTime)) {
      items.push({ kind: "event", id: event.id, view: "timeline", kindLabel: "事件", label: event.title });
    }
  });
  state.project.arcs.forEach((arc) => {
    if (hit(arc.title, arc.summary)) {
      items.push({ kind: "arc", id: arc.id, view: "arcs", kindLabel: "故事线", label: arc.title });
    }
  });
  state.project.chapters.forEach((chapter) => {
    if (hit(chapter.title, chapter.summary, chapter.content)) {
      items.push({ kind: "chapter", id: chapter.id, view: "chapters", kindLabel: "章节", label: chapter.title });
    }
  });
  state.project.notes.forEach((note) => {
    if (hit(note.title, note.content, note.tags)) {
      items.push({ kind: "note", id: note.id, view: "notes", kindLabel: "笔记", label: note.title });
    }
  });
  return items.slice(0, 12);
}

function renderSearchResults() {
  const box = document.getElementById("search-results");
  const results = searchItems(searchInput.value);
  if (!searchInput.value.trim()) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;
  if (!results.length) {
    box.innerHTML = `<p class="empty" style="padding:8px 10px;margin:0">没有匹配结果。</p>`;
    return;
  }
  box.innerHTML = results.map((item) => `
    <button type="button" data-action="open" data-kind="${item.kind}" data-id="${item.id}" data-view="${item.view}">
      <span class="search-kind">${esc(item.kindLabel)}</span>
      ${esc(item.label)}
    </button>
  `).join("");
}

function centerOf(id) {
  const pos = state.project.layout[id] || { x: 0, y: 0 };
  return { x: pos.x + NODE_W / 2, y: pos.y + NODE_H / 2 };
}

function shorten(from, to, directional) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const padFrom = 86;
  const padTo = directional ? 96 : 86;
  return {
    x1: from.x + (dx / length) * padFrom,
    y1: from.y + (dy / length) * padFrom,
    x2: to.x - (dx / length) * padTo,
    y2: to.y - (dy / length) * padTo,
  };
}

function curveOf(line) {
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const length = Math.hypot(dx, dy) || 1;
  const bend = Math.min(42, length * 0.18);
  const cx = (line.x1 + line.x2) / 2 + (-dy / length) * bend;
  const cy = (line.y1 + line.y2) / 2 + (dx / length) * bend;
  return {
    d: `M ${line.x1} ${line.y1} Q ${cx} ${cy} ${line.x2} ${line.y2}`,
    x: 0.25 * line.x1 + 0.5 * cx + 0.25 * line.x2,
    y: 0.25 * line.y1 + 0.5 * cy + 0.25 * line.y2,
  };
}

function paintEdges() {
  const svg = document.getElementById("edges");
  if (!svg) return;
  svg.innerHTML = `
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="var(--ink)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
      </marker>
      <marker id="arrow-hot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="var(--seal)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"></path>
      </marker>
    </defs>
    ${visibleRelations().map((relation) => {
      const from = centerOf(relation.sourceId);
      const to = centerOf(relation.targetId);
      const line = shorten(from, to, relation.directional);
      const curve = curveOf(line);
      const selected = isSelected("relation", relation.id);
      const label = esc(relation.type);
      const labelWidth = Math.max(36, relation.type.length * 14 + 12);
      return `
        <path class="edge-hit" data-action="select-relation" data-id="${relation.id}" d="${curve.d}"></path>
        <path class="edge-line ${selected ? "is-selected" : ""}" d="${curve.d}" ${relation.directional ? `marker-end="url(#${selected ? "arrow-hot" : "arrow"})"` : ""}></path>
        <rect x="${curve.x - labelWidth / 2}" y="${curve.y - 18}" width="${labelWidth}" height="18" rx="9" fill="var(--sheet)"></rect>
        <text class="edge-label" x="${curve.x}" y="${curve.y - 5}" text-anchor="middle">${label}</text>
      `;
    }).join("")}
  `;
}

function applyTheme(theme) {
  const next = theme === "ink" ? "ink" : "paper";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("storyweave-theme", next);
  } catch (error) {
    /* 文件页面可能禁止存储，主题仍会在这次打开里生效。 */
  }
  const button = document.getElementById("theme-toggle");
  if (!button) return;
  const dark = next === "ink";
  button.textContent = dark ? "宣纸" : "夜墨";
  button.setAttribute("aria-pressed", String(dark));
  button.setAttribute("aria-label", dark ? "切换到宣纸主题" : "切换到夜墨主题");
}

document.body.addEventListener("click", (event) => {
  if (!event.target.closest(".search-wrap")) {
    document.getElementById("search-results").hidden = true;
  }
  const target = event.target.closest("[data-action]");
  if (!target || target.dataset.action === "toggle-type") return;
  const action = target.dataset.action;
  if (action === "nav") {
    state.view = target.dataset.view;
    state.confirm = null;
    history.replaceState(null, "", `#${state.view}`);
    render();
    return;
  }
  if (action === "settings") {
    state.view = "settings";
    state.confirm = null;
    history.replaceState(null, "", "#settings");
    render();
    return;
  }
  if (action === "theme") {
    const chosen = target.dataset.theme;
    applyTheme(chosen || (currentTheme() === "ink" ? "paper" : "ink"));
    if (state.view === "settings") render();
    return;
  }
  if (action === "open" || action === "select-relation") {
    const kind = action === "select-relation" ? "relation" : target.dataset.kind;
    const view = action === "select-relation" ? "graph" : target.dataset.view;
    if (target.closest("#search-results")) {
      searchInput.value = "";
      document.getElementById("search-results").hidden = true;
    }
    openRecord(kind, target.dataset.id, view);
    return;
  }
  if (action === "add-character") addCharacter();
  else if (action === "add-event") addEvent();
  else if (action === "add-arc") addArc();
  else if (action === "add-chapter") addChapter();
  else if (action === "add-note") addNote();
  else if (action === "add-scene") addScene(target.dataset.id);
  else if (action === "draft-relation") startDraft();
  else if (action === "save-relation") saveRelation();
  else if (action === "cancel-draft") {
    state.draft = null;
    state.selection = null;
    render();
  } else if (action === "ask-delete") {
    state.confirm = { kind: target.dataset.kind, id: target.dataset.id };
    renderInspector();
  } else if (action === "cancel-delete") {
    state.confirm = null;
    renderInspector();
  } else if (action === "confirm-delete") confirmDelete();
  else if (action === "move-event") moveEvent(target.dataset.id, Number(target.dataset.delta));
  else if (action === "move-arc-event") moveArcEvent(target.dataset.id, target.dataset.event, Number(target.dataset.delta));
  else if (action === "remove-arc-event") {
    const arc = byId(state.project.arcs, target.dataset.id);
    if (arc) arc.eventIds = arc.eventIds.filter((eventId) => eventId !== target.dataset.event);
    render();
  } else if (action === "add-arc-event") {
    const arc = byId(state.project.arcs, target.dataset.id);
    const select = document.getElementById(`arc-add-${target.dataset.id}`);
    if (arc && select?.value && !arc.eventIds.includes(select.value)) arc.eventIds.push(select.value);
    render();
  } else if (action === "export") exportProject();
});

document.body.addEventListener("input", (event) => {
  const el = event.target;
  if (el.id === "character-filter") {
    state.characterFilter = el.value;
    const rows = document.getElementById("character-rows");
    if (rows) rows.innerHTML = characterRows();
    const meta = document.querySelector(".ws-meta");
    if (meta) meta.textContent = `${visibleCharacters().length} / ${state.project.characters.length} 人`;
    return;
  }
  if (!el.dataset.field || el.type === "checkbox" || el.tagName === "SELECT") return;
  writeField(el);
  patchLive(el);
});

document.body.addEventListener("change", (event) => {
  const el = event.target;
  if (el.dataset.action === "toggle-type") {
    if (el.checked) state.hiddenTypes.delete(el.dataset.type);
    else state.hiddenTypes.add(el.dataset.type);
    paintEdges();
    const meta = document.querySelector(".ws-meta");
    if (meta) meta.textContent = `${state.project.characters.length} 个节点 · ${visibleRelations().length} 条关系`;
    return;
  }
  if (el.dataset.action === "filter-status") {
    state.statusFilter = el.value;
    renderWorkspace();
    return;
  }
  if (!el.dataset.field) return;
  if (el.type === "checkbox" || el.tagName === "SELECT") writeField(el);
  if (el.dataset.entity === "relation" || el.dataset.toggle === "list") renderWorkspace();
  else if (!el.closest("#workspace") && el.tagName === "SELECT") renderWorkspace();
});

document.body.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && event.target.dataset.action === "open") {
    event.preventDefault();
    event.target.click();
  }
});

searchInput.addEventListener("input", renderSearchResults);
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    document.getElementById("search-results").hidden = true;
  }
});

document.addEventListener("pointerdown", (event) => {
  const node = event.target.closest(".node");
  if (!node || state.view !== "graph") return;
  const id = node.dataset.id;
  const pos = state.project.layout[id] || { x: 0, y: 0 };
  drag = {
    id,
    pointerId: event.pointerId,
    originX: pos.x,
    originY: pos.y,
    startX: event.clientX,
    startY: event.clientY,
    moved: false,
  };
  try {
    node.setPointerCapture(event.pointerId);
  } catch (error) {
    drag.captureFailed = true;
  }
});

document.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (Math.hypot(dx, dy) > 4) drag.moved = true;
  const x = Math.max(0, drag.originX + dx);
  const y = Math.max(0, drag.originY + dy);
  state.project.layout[drag.id] = { x, y };
  const node = document.querySelector(`.node[data-id="${CSS.escape(drag.id)}"]`);
  if (node) node.style.transform = `translate(${x}px, ${y}px)`;
  paintEdges();
});

function finishDrag(event) {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const moved = drag.moved;
  const id = drag.id;
  drag = null;
  state.selection = { kind: "character", id };
  state.confirm = null;
  state.draft = null;
  if (!moved) render();
  else {
    renderInspector();
    document.querySelectorAll(".node").forEach((node) => {
      node.classList.toggle("is-selected", node.dataset.id === id);
    });
    paintEdges();
  }
}

document.addEventListener("pointerup", finishDrag);
document.addEventListener("pointercancel", finishDrag);

document.addEventListener("dblclick", (event) => {
  const node = event.target.closest(".node");
  if (!node) return;
  openRecord("character", node.dataset.id, "characters");
});

function boot() {
  const params = new URLSearchParams(location.search);
  let saved = "paper";
  try {
    saved = localStorage.getItem("storyweave-theme") || "paper";
  } catch (error) {
    saved = "paper";
  }
  applyTheme(params.get("theme") || saved);
  const hash = location.hash.replace("#", "");
  if (VIEWS.some((view) => view.id === hash)) state.view = hash;
  render();
  if (params.get("selftest") === "1") runSelfTest();
}

function runSelfTest() {
  const errors = [];
  const assert = (condition, message) => {
    if (!condition) errors.push(message);
  };
  document.querySelector('[data-view="characters"]').click();
  assert(document.querySelector("h1")?.textContent === "人物", "人物页标题");
  assert(document.body.textContent.includes("林默"), "示例人物");
  document.querySelector('[data-action="add-character"]').click();
  assert(document.body.textContent.includes("未命名人物"), "新增人物");
  document.querySelector('[data-action="ask-delete"]').click();
  assert(document.body.textContent.includes("确认删除"), "删除确认");
  document.querySelector('[data-action="confirm-delete"]').click();
  assert(!document.body.textContent.includes("未命名人物"), "确认后移除新人物");

  document.querySelector('[data-view="graph"]').click();
  assert(document.querySelectorAll(".node").length === 4, "四个节点");
  const node = document.querySelector('.node[data-id="lin-mo"]');
  const before = node.style.transform;
  node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: 10, clientY: 10, pointerId: 1 }));
  document.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: 80, clientY: 60, pointerId: 1 }));
  document.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: 80, clientY: 60, pointerId: 1 }));
  const after = document.querySelector('.node[data-id="lin-mo"]')?.style.transform;
  assert(before !== after, "拖动节点改变位置");

  document.querySelector("[data-action='select-relation']")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  assert(document.getElementById("inspector").textContent.includes("有方向"), "选中关系");

  document.querySelector('[data-action="draft-relation"]').click();
  const source = document.querySelector('[data-entity="draft"][data-field="sourceId"]');
  const target = document.querySelector('[data-entity="draft"][data-field="targetId"]');
  target.value = source.value;
  target.dispatchEvent(new Event("change", { bubbles: true }));
  document.querySelector('[data-action="save-relation"]').click();
  assert(document.getElementById("relation-error")?.textContent.includes("不能把人物连向自己"), "禁止自关系");
  assert(state.project.relations.length === 4, "自关系没有写入");

  searchInput.value = "沈照";
  searchInput.dispatchEvent(new Event("input"));
  assert(document.getElementById("search-results").hidden === false, "搜索有结果");
  assert(document.getElementById("search-results").textContent.includes("沈照"), "搜索命中沈照");

  document.querySelector('#workspace [data-id="ch-1"]')?.click();
  if (!document.querySelector(".preview")) document.querySelector('[data-view="chapters"]').click();
  document.querySelector('#workspace [data-id="ch-1"]')?.click();
  assert(document.querySelector(".preview")?.textContent.includes("名册上，沈照的名字还在"), "章节预览");

  document.querySelector('[data-view="timeline"]').click();
  assert(document.body.textContent.includes("尚未写入章节"), "未叙述事件");
  assert(document.body.textContent.includes("雪线"), "叙述章节");

  const themeBefore = document.documentElement.dataset.theme;
  document.getElementById("theme-toggle").click();
  assert(document.documentElement.dataset.theme !== themeBefore, "主题可切换");
  document.querySelector('[data-action="settings"]').click();
  assert(document.body.textContent.includes("宣纸") && document.body.textContent.includes("夜墨"), "设置里有两套主题");
  document.getElementById("theme-toggle").click();
  assert(document.documentElement.dataset.theme === themeBefore, "主题可切回");

  const out = document.createElement("p");
  out.id = "selftest";
  out.textContent = errors.length ? `FAIL ${errors.join(" | ")}` : "PASS";
  document.body.appendChild(out);
}

boot();
