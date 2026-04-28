const state = {
  workspacePath: "",
  hasOpenRouterKey: false,
  defaultWorkspace: "",
  settings: {},
  pages: [],
  page: null,
  crops: [],
  messages: [],
  scratchpad: [],
  models: [],
  modelSearch: "",
  visionOnly: true,
  selectedModel: "google/gemini-3.1-pro-preview",
  mode: "translation",
  sideTab: "chat",
  workbenchFilter: "all",
  selectedEntryId: "",
  onboardingDismissed: false,
  apiKeyModal: false,
  settingsModal: false,
  attachments: [],
  pendingChatText: "",
  drawing: null,
  selection: null,
  busy: false,
};

const LANGUAGES = ["Auto", "Japanese", "Korean", "Chinese", "English", "Spanish", "French", "German", "Italian", "Portuguese"];

const icons = {
  login: '<svg viewBox="0 0 24 24"><path d="M10 17l5-5-5-5v3H3v4h7v3z"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7v-2h7V5h-7V3z"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M3 20l18-8L3 4v6l11 2-11 2v6z"/></svg>',
  crop: '<svg viewBox="0 0 24 24"><path d="M7 3h2v4h8v8h4v2h-4v4h-2v-4H7V9H3V7h4V3zm2 6v6h6V9H9z"/></svg>',
  page: '<svg viewBox="0 0 24 24"><path d="M6 2h9l5 5v15H6V2zm8 1.5V8h4.5"/></svg>',
  export: '<svg viewBox="0 0 24 24"><path d="M12 3l4 4h-3v8h-2V7H8l4-4z"/><path d="M5 19h14v2H5v-2z"/></svg>',
  key: '<svg viewBox="0 0 24 24"><path d="M7 14a5 5 0 1 1 4.6-7H22v4h-3v3h-4v-3h-3.4A5 5 0 0 1 7 14zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5-2-3.5-2.4 1a7.7 7.7 0 0 0-2.6-1.5L14 2h-4l-.4 2.5A7.7 7.7 0 0 0 7 6L4.6 5 2.6 8.5l2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5 2 3.5L7 18a7.7 7.7 0 0 0 2.6 1.5L10 22h4l.4-2.5A7.7 7.7 0 0 0 17 18l2.4 1 2-3.5-2-1.5zM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>',
};

const SCRATCH_SAVE_DELAY = 650;
const scratchTimers = new Map();

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(data.error || response.statusText);
  return data;
}

function fileUrl(relativePath) {
  return `/api/file?path=${encodeURIComponent(relativePath)}`;
}

async function boot() {
  try {
    const data = await api("/api/status");
    Object.assign(state, {
      workspacePath: data.workspacePath,
      hasOpenRouterKey: data.hasOpenRouterKey,
      defaultWorkspace: data.defaultWorkspace,
      pages: data.pages || [],
      settings: data.settings || {},
      selectedModel: data.settings?.defaultModel || data.defaultModel,
    });
    if (state.pages[0]) await loadPage(state.pages[0].id, false);
    render();
    loadModels();
  } catch (error) {
    toast(error.message);
    render();
  }
}

async function loadModels() {
  try {
    const data = await api("/api/models");
    state.models = data.data || [];
    render();
  } catch (_error) {
    state.models = [];
  }
}

async function loadPage(pageId, shouldRender = true) {
  const data = await api(`/api/page?id=${encodeURIComponent(pageId)}`);
  state.page = data.page;
  state.crops = data.crops || [];
  state.messages = data.messages || [];
  state.scratchpad = data.scratchpad || [];
  state.attachments = [];
  state.selection = null;
  if (shouldRender) render();
}

function render() {
  document.querySelector("#app").innerHTML = `
    <div class="shell">
      ${topbar()}
      <main class="main">
      ${state.mode === "translation" ? translationMode() : typesettingMode()}
      </main>
      ${!state.workspacePath && !state.onboardingDismissed ? onboarding() : ""}
      ${state.apiKeyModal ? apiKeyModal() : ""}
      ${state.settingsModal ? settingsModal() : ""}
    </div>
  `;
  bindEvents();
}

function topbar() {
  return `
    <header class="topbar">
      <div class="brand">
        <div class="mark">文</div>
        <div>
          <strong>Manga Translation Tool</strong>
          <span>${state.workspacePath || "No workspace selected"}</span>
        </div>
      </div>
      <nav class="mode-tabs">
        <button class="${state.mode === "translation" ? "active" : ""}" data-mode="translation">Translation</button>
        <button class="${state.mode === "typesetting" ? "active" : ""}" data-mode="typesetting">Typesetting</button>
      </nav>
      <div class="top-actions">
        <select id="sourceLanguage">${LANGUAGES.map((lang) => `<option ${currentSource() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
        <select id="targetLanguage">${LANGUAGES.filter((lang) => lang !== "Auto").map((lang) => `<option ${currentTarget() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
        ${modelPicker()}
        <button class="icon-text ${state.hasOpenRouterKey ? "connected" : ""}" id="loginButton" title="Connect OpenRouter">${icons.login}<span>${state.hasOpenRouterKey ? "Connected" : "Login"}</span></button>
        <button class="icon-text" id="apiKeyButton" title="Use API key">${icons.key}<span>Key</span></button>
        <button class="icon-only" id="settingsButton" title="Settings">${icons.settings}</button>
      </div>
    </header>
  `;
}

function currentSource() {
  return state.settings.sourceLanguage || "Auto";
}

function currentTarget() {
  return state.settings.targetLanguage || "English";
}

function modelPicker() {
  const filtered = state.models
    .filter((model) => {
      const haystack = `${model.id} ${model.name || ""} ${model.description || ""}`.toLowerCase();
      const matchesSearch = haystack.includes(state.modelSearch.toLowerCase());
      const modalities = [
        ...(model.architecture?.input_modalities || []),
        ...(model.input_modalities || []),
        model.description || "",
      ].join(" ").toLowerCase();
      const isVision = /image|vision|multimodal/.test(modalities);
      return matchesSearch && (!state.visionOnly || isVision || model.id.includes("gemini"));
    })
    .slice(0, 80);
  const selected = state.models.find((model) => model.id === state.selectedModel);
  return `
    <div class="model-picker">
      <input id="modelSearch" placeholder="Search models" value="${escapeAttr(state.modelSearch)}" />
      <label class="mini-toggle"><input type="checkbox" id="visionOnly" ${state.visionOnly ? "checked" : ""}/> Vision</label>
      <select id="modelSelect">
        ${!selected ? `<option value="${state.selectedModel}">${state.selectedModel}</option>` : ""}
        ${filtered.map((model) => `<option value="${escapeAttr(model.id)}" ${state.selectedModel === model.id ? "selected" : ""}>${escapeHtml(model.name || model.id)} · ${escapeHtml(model.id)}</option>`).join("")}
      </select>
      <div class="model-meta">${modelMeta(selected)}</div>
    </div>
  `;
}

function modelMeta(model) {
  if (!model) return "Model metadata loads from OpenRouter.";
  const context = model.context_length ? `${compactNumber(model.context_length)} ctx` : "ctx ?";
  const output = model.top_provider?.max_completion_tokens ? `${compactNumber(model.top_provider.max_completion_tokens)} out` : "out ?";
  const modalities = [
    ...(model.architecture?.input_modalities || []),
  ].join("+") || model.architecture?.modality || "text";
  const prompt = formatPerMillion(model.pricing?.prompt);
  const completion = formatPerMillion(model.pricing?.completion);
  const provider = model.id.split("/")[0] || "provider";
  return `${provider} · ${modalities} · ${context} · ${output} · ${prompt} in / ${completion} out`;
}

function compactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "?";
  if (number >= 1_000_000) return `${(number / 1_000_000).toFixed(number % 1_000_000 ? 1 : 0)}M`;
  if (number >= 1_000) return `${Math.round(number / 1_000)}K`;
  return String(number);
}

function formatPerMillion(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return "$?";
  if (number === 0) return "$0/M";
  return `$${(number * 1_000_000).toFixed(number * 1_000_000 >= 1 ? 2 : 4)}/M`;
}

function translationMode() {
  return `
    <section class="translation-grid mt-product">
      ${pageStrip()}
      <div class="workspace-panel">
        <div class="viewer-toolbar">
          <div>
            <strong>${state.page ? escapeHtml(state.page.file_name) : "No page selected"}</strong>
            <span>${state.page?.width || "?"} x ${state.page?.height || "?"}</span>
          </div>
          <div class="toolbar-actions">
            <button class="icon-text" id="attachPage" ${!state.page ? "disabled" : ""}>${icons.page}<span>Page</span></button>
            <button class="icon-text" id="saveCrop" ${!state.selection ? "disabled" : ""}>${icons.crop}<span>Save crop</span></button>
            <button class="icon-text" id="exportPage" ${!state.page ? "disabled" : ""}>${icons.export}<span>Page MD</span></button>
            <button class="icon-text" id="exportProject" ${!state.workspacePath ? "disabled" : ""}>${icons.export}<span>Project MD</span></button>
            <button class="icon-text danger" id="removePage" ${!state.page ? "disabled" : ""}>Remove</button>
          </div>
        </div>
        ${viewer()}
        ${viewerStatus()}
      </div>
      ${workbenchPanel()}
      <aside class="right-panel chat-column">
        ${chatPanel()}
      </aside>
    </section>
  `;
}

function pageStrip() {
  return `
    <aside class="page-strip">
      <div class="page-strip-head">
        <span>Pages</span>
        <div>
          <label class="icon-only mini-file" title="Import files">
            <input type="file" id="fileImportStrip" multiple accept="image/*,.zip,.cbz" />
            +
          </label>
          <button class="icon-only" id="importPathButton" title="Import path">⌁</button>
        </div>
      </div>
      <div class="page-list mt-scroll">
        ${state.pages.map((page, index) => `
          <button class="page-thumb ${state.page?.id === page.id ? "active" : ""}" data-page-id="${page.id}" title="${escapeAttr(page.file_name)}">
            <img src="${fileUrl(page.workspace_path)}" alt="" />
            <span>${String(index + 1).padStart(2, "0")}</span>
            <small>${escapeHtml(pathTail(page.file_name))}</small>
          </button>
        `).join("") || `<div class="empty-strip">Drop pages into the viewer.</div>`}
      </div>
    </aside>
  `;
}

function viewerStatus() {
  const speechCount = state.crops.filter((crop) => crop.name?.match(/^S\d+/i)).length;
  return `
    <div class="viewer-status">
      <span>Saved locally</span>
      <span>${state.crops.length} crops</span>
      <span>${speechCount} speech</span>
      <span class="kbd">C</span><span>Crop</span>
      <span class="kbd">Shift Enter</span><span>Send</span>
    </div>
  `;
}

function viewer() {
  if (!state.page) {
    return `
      <div class="empty-view drop-zone" id="dropZone">
        <strong>Drop images or ZIP files here</strong>
        <span>Or choose a workspace, then import pages into the project.</span>
        <input type="file" id="fileImport" multiple accept="image/*,.zip,.cbz" />
      </div>
    `;
  }
  return `
    <div class="viewer" id="viewer">
      <div class="image-frame">
        <img id="pageImage" draggable="false" src="${fileUrl(state.page.workspace_path)}" alt="${escapeAttr(state.page.file_name)}" />
        <div class="crop-layer" id="cropLayer">
          ${state.crops.map(cropBox).join("")}
          ${state.selection ? cropBox({ ...state.selection, name: "New crop", id: "selection" }, true) : ""}
        </div>
      </div>
    </div>
  `;
}

function cropBox(crop, pending = false) {
  if (!state.page?.width || !state.page?.height) return "";
  const left = (crop.x / state.page.width) * 100;
  const top = (crop.y / state.page.height) * 100;
  const width = (crop.width / state.page.width) * 100;
  const height = (crop.height / state.page.height) * 100;
  return `<button class="crop-box ${pending ? "pending" : ""}" style="left:${left}%;top:${top}%;width:${width}%;height:${height}%;" data-crop-id="${crop.id}" title="${escapeAttr(crop.name)}"><span>${escapeHtml(crop.name)}</span></button>`;
}

function filmstrip() {
  return `
    <div class="filmstrip">
      <label class="import-button">
        <input type="file" id="fileImportStrip" multiple accept="image/*,.zip,.cbz" />
        Files
      </label>
      <button class="import-button" id="importPathButton">Path</button>
      ${state.pages.map((page) => `
        <button class="thumb ${state.page?.id === page.id ? "active" : ""}" data-page-id="${page.id}">
          <img src="${fileUrl(page.workspace_path)}" alt="" />
          <span>${escapeHtml(page.file_name)}</span>
        </button>
      `).join("")}
    </div>
  `;
}

function chatPanel() {
  return `
    <div class="chat-panel">
      <div class="panel-title-row">
        <div><strong>Translation chat</strong><span>auto-saved</span></div>
        <button class="icon-only" title="More">⋯</button>
      </div>
      <div class="chat-context-row">
        <select id="sourceLanguageChat">${LANGUAGES.map((lang) => `<option ${currentSource() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
        <span>→</span>
        <select id="targetLanguageChat">${LANGUAGES.filter((lang) => lang !== "Auto").map((lang) => `<option ${currentTarget() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
      </div>
      <div class="attachment-bar">
        ${state.attachments.length ? state.attachments.map((attachment, index) => `<button class="chip" data-remove-attachment="${index}">${escapeHtml(attachment.name || attachment.type)} x</button>`).join("") : "<span>No context attached</span>"}
      </div>
      <div class="messages">
        ${state.messages.map((message) => `<article class="message ${message.role}"><span>${message.role}</span><p>${escapeHtml(message.content)}</p></article>`).join("")}
      </div>
      <form id="chatForm" class="composer">
        <div class="quick-actions">
          <button type="button" id="chatAttachPage" ${!state.page ? "disabled" : ""}>Current page</button>
          <button type="button" id="chatQueueCrops" ${!state.crops.length ? "disabled" : ""}>All crops</button>
          <button type="button" id="fillTranslationPass" ${!state.page && !state.attachments.length ? "disabled" : ""}>Translation pass</button>
        </div>
        <textarea id="chatInput" placeholder="Ask for a translation pass, compare options, or focus on one label." ${state.busy ? "disabled" : ""}>${escapeHtml(state.pendingChatText || "")}</textarea>
        <button class="send-button" ${state.busy || !state.hasOpenRouterKey ? "disabled" : ""} title="Send">${icons.send}</button>
      </form>
    </div>
  `;
}

function workbenchPanel() {
  const rows = filteredScratchpad();
  const selected = selectedScratchpadEntry(rows);
  return `
    <aside class="workbench-panel">
      <div class="workbench-head">
        <div>
          <strong>Workbench</strong>
          <span>${state.page ? pathTail(state.page.file_name) : "No page"}</span>
        </div>
        <button class="icon-only" id="newScratchEntry" title="New line">+</button>
      </div>
      <div class="workbench-stats">
        ${workbenchFilterButton("all", "All", state.scratchpad.length)}
        ${workbenchFilterButton("draft", "Draft", state.scratchpad.filter((entry) => entry.draft && !entry.final).length)}
        ${workbenchFilterButton("final", "Final", state.scratchpad.filter((entry) => entry.final).length)}
        ${workbenchFilterButton("crops", "Crops", state.crops.length)}
      </div>
      ${state.workbenchFilter === "crops" ? cropWorkbench() : scratchWorkbench(rows, selected)}
    </aside>
  `;
}

function workbenchFilterButton(id, label, count) {
  return `<button class="workbench-filter ${state.workbenchFilter === id ? "active" : ""}" data-workbench-filter="${id}">${label}<span>${count}</span></button>`;
}

function filteredScratchpad() {
  if (state.workbenchFilter === "draft") return state.scratchpad.filter((entry) => entry.draft && !entry.final);
  if (state.workbenchFilter === "final") return state.scratchpad.filter((entry) => entry.final);
  return state.scratchpad;
}

function selectedScratchpadEntry(rows) {
  return rows.find((entry) => entry.id === state.selectedEntryId) || rows[0] || null;
}

function scratchWorkbench(rows, selected) {
  return `
    <div class="workbench-body">
      <div class="line-list mt-scroll">
        ${rows.map((entry) => `
          <button class="line-row ${selected?.id === entry.id ? "active" : ""}" data-select-entry="${entry.id}">
            <span class="pill dot ${entryTypeClass(entry)}">${escapeHtml(entry.label || "S?")}</span>
            <span>${escapeHtml(entry.final || entry.draft || "No translation yet")}</span>
            ${entry.final ? icons.check : ""}
          </button>
        `).join("") || `<div class="quiet">Model first-pass lines will appear here automatically.</div>`}
      </div>
      <div class="line-editor">
        ${selected ? entryCard(selected) : `<div class="quiet">Select or create a line to edit translation text.</div>`}
      </div>
    </div>
  `;
}

function cropWorkbench() {
  return `
    <div class="crops-panel crop-workbench">
      <div class="panel-head">
        <strong>Saved Crops</strong>
        <button id="sendAllCrops" ${!state.crops.length ? "disabled" : ""}>Queue all</button>
      </div>
      ${state.crops.map((crop) => `
        <article class="crop-item">
          <img src="${fileUrl(crop.workspace_path)}" alt="" />
          <div>
            <strong>${escapeHtml(crop.name)}</strong>
            <span>${Math.round(crop.width)} x ${Math.round(crop.height)}</span>
          </div>
          <button data-attach-crop="${crop.id}">Queue</button>
          <button class="danger" data-remove-crop="${crop.id}">Remove</button>
        </article>
      `).join("") || `<div class="quiet">Draw over the page to create crops.</div>`}
    </div>
  `;
}

function scratchpadPanel() {
  return `
    <div class="scratchpad">
      <div class="panel-head">
        <strong>Page Scratchpad</strong>
        <button id="newScratchEntry">New line</button>
      </div>
      ${state.scratchpad.length ? state.scratchpad.map(entryCard).join("") : `<div class="quiet">Model first-pass lines will appear here automatically.</div>`}
    </div>
  `;
}

function entryCard(entry) {
  return `
    <article class="entry" data-entry-id="${entry.id}">
      <div class="entry-row">
        <input class="entry-label" value="${escapeAttr(entry.label || "")}" placeholder="S1" />
        <input class="entry-type" value="${escapeAttr(entry.type || "")}" placeholder="speech / sfx / narration" />
      </div>
      <textarea class="entry-source" placeholder="Source text">${escapeHtml(entry.source || "")}</textarea>
      <textarea class="entry-draft" placeholder="Draft translation">${escapeHtml(entry.draft || "")}</textarea>
      <textarea class="entry-final" placeholder="Final translation">${escapeHtml(entry.final || "")}</textarea>
      <textarea class="entry-notes" placeholder="Notes">${escapeHtml(entry.notes || "")}</textarea>
      <div class="entry-actions">
        <button class="promote-draft" title="Copy draft to final">${icons.check}<span>Use draft</span></button>
        <button class="save-entry">Save</button>
        <button class="remove-entry danger" title="Remove this line">Remove</button>
      </div>
    </article>
  `;
}

function cropsPanel() {
  return `
    <div class="crops-panel">
      <div class="panel-head">
        <strong>Saved Crops</strong>
        <button id="sendAllCrops" ${!state.crops.length ? "disabled" : ""}>Queue all</button>
      </div>
      ${state.crops.map((crop) => `
        <article class="crop-item">
          <img src="${fileUrl(crop.workspace_path)}" alt="" />
          <div>
            <strong>${escapeHtml(crop.name)}</strong>
            <span>${Math.round(crop.width)} x ${Math.round(crop.height)}</span>
          </div>
          <button data-attach-crop="${crop.id}">Queue</button>
          <button class="danger" data-remove-crop="${crop.id}">Remove</button>
        </article>
      `).join("") || `<div class="quiet">Draw over the page to create crops.</div>`}
    </div>
  `;
}

function typesettingMode() {
  return `
    <section class="typesetting">
      <div>
        <span class="eyebrow">Mode 2</span>
        <h1>Typesetting workspace</h1>
        <p>This mode is intentionally blank for now. TODO: text clearing, image generation assists, lettering tools, final text placement, layer export, and round-trip page output.</p>
        <ul>
          <li>Clear source text with brush, selection, and image-generation assist tools.</li>
          <li>Place final scratchpad lines back onto the page with typography presets.</li>
          <li>Export flattened pages and editable project layers.</li>
        </ul>
      </div>
    </section>
  `;
}

function onboarding() {
  return `
    <div class="overlay">
      <section class="onboarding">
        <div>
          <span class="eyebrow">First launch</span>
          <h1>Choose your translation workspace</h1>
          <p>Use the default local folder or point the app at a manga project folder. Imported files are copied into the workspace by default.</p>
        </div>
        <div class="onboard-actions">
          <button id="useDefaultWorkspace">Use default folder</button>
          <form id="openWorkspaceForm">
            <input id="workspacePath" placeholder="${escapeAttr(state.defaultWorkspace || "~/MangaTranslationWorkspace")}" />
            <button>Open folder</button>
          </form>
          <button class="secondary" id="skipLoginFirst">${state.hasOpenRouterKey ? "Open app" : "Skip login for now"}</button>
          <button class="icon-text" id="loginButtonOnboard">${icons.login}<span>Connect OpenRouter</span></button>
          <button class="icon-text" id="apiKeyButtonOnboard">${icons.key}<span>Use API key</span></button>
        </div>
      </section>
    </div>
  `;
}

function apiKeyModal() {
  return `
    <div class="overlay">
      <section class="key-modal">
        <div>
          <span class="eyebrow">OpenRouter</span>
          <h1>Use an API key</h1>
          <p>OAuth can be flaky while OpenRouter creates the local app authorization. Paste a key here to store it locally on this machine.</p>
        </div>
        <form id="apiKeyForm">
          <label>
            API key
            <input id="apiKeyInput" type="password" autocomplete="off" placeholder="sk-or-v1-..." />
          </label>
          <div class="modal-actions">
            <button type="button" class="secondary" id="closeApiKeyModal">Cancel</button>
            <button>Save key</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function settingsModal() {
  return `
    <div class="overlay">
      <section class="settings-modal">
        <div class="settings-head">
          <div>
            <span class="eyebrow">Project settings</span>
            <h1>Translation behavior</h1>
            <p>These settings are saved in the current workspace and used for new model requests.</p>
          </div>
          <button class="icon-only" id="closeSettings" title="Close">x</button>
        </div>
        <form id="settingsForm">
          <div class="settings-grid">
            <label>
              Source language
              <select id="settingsSourceLanguage">${LANGUAGES.map((lang) => `<option ${currentSource() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
            </label>
            <label>
              Target language
              <select id="settingsTargetLanguage">${LANGUAGES.filter((lang) => lang !== "Auto").map((lang) => `<option ${currentTarget() === lang ? "selected" : ""}>${lang}</option>`).join("")}</select>
            </label>
          </div>
          <label>
            System prompt
            <textarea id="settingsSystemPrompt">${escapeHtml(state.settings.systemPrompt || "")}</textarea>
          </label>
          <div class="modal-actions">
            <button type="button" id="resetPrompt">Reset prompt</button>
            <button>Save settings</button>
          </div>
        </form>
      </section>
    </div>
  `;
}

function bindEvents() {
  document.querySelectorAll("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    state.mode = button.dataset.mode;
    render();
  }));
  document.querySelectorAll("[data-side-tab]").forEach((button) => button.addEventListener("click", () => {
    state.sideTab = button.dataset.sideTab;
    render();
  }));
  document.querySelector("#loginButton")?.addEventListener("click", loginOpenRouter);
  document.querySelector("#loginButtonOnboard")?.addEventListener("click", loginOpenRouter);
  document.querySelector("#apiKeyButton")?.addEventListener("click", () => {
    state.apiKeyModal = true;
    render();
  });
  document.querySelector("#apiKeyButtonOnboard")?.addEventListener("click", () => {
    state.apiKeyModal = true;
    render();
  });
  document.querySelector("#settingsButton")?.addEventListener("click", () => {
    state.settingsModal = true;
    render();
  });
  document.querySelector("#closeSettings")?.addEventListener("click", () => {
    state.settingsModal = false;
    render();
  });
  document.querySelector("#settingsForm")?.addEventListener("submit", saveProjectSettings);
  document.querySelector("#resetPrompt")?.addEventListener("click", resetPrompt);
  document.querySelector("#closeApiKeyModal")?.addEventListener("click", () => {
    state.apiKeyModal = false;
    render();
  });
  document.querySelector("#apiKeyForm")?.addEventListener("submit", saveApiKey);
  document.querySelector("#skipLoginFirst")?.addEventListener("click", () => {
    state.onboardingDismissed = true;
    render();
  });
  document.querySelector("#useDefaultWorkspace")?.addEventListener("click", async () => {
    await withBusy(async () => {
      const data = await api("/api/workspace/default", { method: "POST", body: "{}" });
      state.workspacePath = data.workspacePath;
      await boot();
    });
  });
  document.querySelector("#openWorkspaceForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.querySelector("#workspacePath").value.trim();
    await withBusy(async () => {
      const data = await api("/api/workspace/open", { method: "POST", body: JSON.stringify({ path: input || state.defaultWorkspace }) });
      state.workspacePath = data.workspacePath;
      await boot();
    });
  });
  document.querySelector("#sourceLanguage")?.addEventListener("change", (event) => saveSettings({ sourceLanguage: event.target.value }));
  document.querySelector("#targetLanguage")?.addEventListener("change", (event) => saveSettings({ targetLanguage: event.target.value }));
  document.querySelector("#sourceLanguageChat")?.addEventListener("change", (event) => saveSettings({ sourceLanguage: event.target.value }));
  document.querySelector("#targetLanguageChat")?.addEventListener("change", (event) => saveSettings({ targetLanguage: event.target.value }));
  document.querySelector("#modelSelect")?.addEventListener("change", (event) => {
    state.selectedModel = event.target.value;
    saveSettings({ defaultModel: event.target.value });
  });
  document.querySelector("#modelSearch")?.addEventListener("input", (event) => {
    state.modelSearch = event.target.value;
    render();
  });
  document.querySelector("#visionOnly")?.addEventListener("change", (event) => {
    state.visionOnly = event.target.checked;
    render();
  });
  document.querySelectorAll("[data-workbench-filter]").forEach((button) => button.addEventListener("click", () => {
    state.workbenchFilter = button.dataset.workbenchFilter;
    render();
  }));
  document.querySelectorAll("[data-select-entry]").forEach((button) => button.addEventListener("click", () => {
    state.selectedEntryId = button.dataset.selectEntry;
    render();
  }));
  document.querySelectorAll("[data-page-id]").forEach((button) => button.addEventListener("click", () => loadPage(button.dataset.pageId)));
  document.querySelector("#attachPage")?.addEventListener("click", () => {
    if (!state.page) return;
    addAttachment({ type: "page", id: state.page.id, name: state.page.file_name });
  });
  document.querySelector("#chatAttachPage")?.addEventListener("click", () => {
    if (!state.page) return;
    addAttachment({ type: "page", id: state.page.id, name: state.page.file_name });
  });
  document.querySelector("#chatQueueCrops")?.addEventListener("click", queueAllCrops);
  document.querySelector("#fillTranslationPass")?.addEventListener("click", fillTranslationPrompt);
  document.querySelectorAll("[data-attach-crop]").forEach((button) => button.addEventListener("click", () => {
    const crop = state.crops.find((item) => item.id === button.dataset.attachCrop);
    addAttachment({ type: "crop", id: crop.id, name: crop.name });
  }));
  document.querySelector("#sendAllCrops")?.addEventListener("click", () => {
    queueAllCrops();
  });
  document.querySelectorAll("[data-remove-attachment]").forEach((button) => button.addEventListener("click", () => {
    state.attachments.splice(Number(button.dataset.removeAttachment), 1);
    render();
  }));
  document.querySelector("#saveCrop")?.addEventListener("click", saveCrop);
  document.querySelector("#removePage")?.addEventListener("click", removeCurrentPage);
  document.querySelectorAll("[data-remove-crop]").forEach((button) => button.addEventListener("click", () => removeCrop(button.dataset.removeCrop)));
  document.querySelector("#chatForm")?.addEventListener("submit", sendChat);
  document.querySelector("#newScratchEntry")?.addEventListener("click", newScratchEntry);
  document.querySelectorAll(".save-entry").forEach((button) => button.addEventListener("click", saveEntry));
  document.querySelectorAll(".promote-draft").forEach((button) => button.addEventListener("click", promoteDraft));
  document.querySelectorAll(".remove-entry").forEach((button) => button.addEventListener("click", removeEntry));
  document.querySelectorAll(".entry input, .entry textarea").forEach((field) => field.addEventListener("input", scheduleEntrySave));
  document.querySelector("#exportPage")?.addEventListener("click", () => exportMarkdown("/api/export/page", { pageId: state.page?.id }));
  document.querySelector("#exportProject")?.addEventListener("click", () => exportMarkdown("/api/export/project", {}));
  document.querySelectorAll("#fileImport, #fileImportStrip").forEach((input) => input?.addEventListener("change", (event) => importFiles([...event.target.files])));
  document.querySelector("#importPathButton")?.addEventListener("click", importPath);
  const dropZone = document.querySelector("#dropZone") || document.querySelector(".viewer");
  dropZone?.addEventListener("dragover", (event) => event.preventDefault());
  dropZone?.addEventListener("drop", (event) => {
    event.preventDefault();
    importFiles([...event.dataTransfer.files]);
  });
  bindCropDrawing();
}

function bindCropDrawing() {
  const viewer = document.querySelector("#viewer");
  const image = document.querySelector("#pageImage");
  if (!viewer || !image || !state.page) return;
  viewer.addEventListener("pointerdown", (event) => {
    if (event.target.closest(".crop-box")) return;
    const point = imagePoint(event, image);
    state.drawing = { start: point, current: point };
    state.selection = null;
    viewer.setPointerCapture(event.pointerId);
  });
  viewer.addEventListener("pointermove", (event) => {
    if (!state.drawing) return;
    state.drawing.current = imagePoint(event, image);
    const x = Math.min(state.drawing.start.x, state.drawing.current.x);
    const y = Math.min(state.drawing.start.y, state.drawing.current.y);
    const width = Math.abs(state.drawing.start.x - state.drawing.current.x);
    const height = Math.abs(state.drawing.start.y - state.drawing.current.y);
    state.selection = { x, y, width, height };
    paintPendingCrop();
  });
  viewer.addEventListener("pointerup", () => {
    if (state.selection && (state.selection.width < 8 || state.selection.height < 8)) state.selection = null;
    state.drawing = null;
    render();
  });
}

function paintPendingCrop() {
  const layer = document.querySelector("#cropLayer");
  if (!layer || !state.selection || !state.page?.width || !state.page?.height) return;
  layer.querySelector('[data-crop-id="selection"]')?.remove();
  const button = document.createElement("button");
  button.className = "crop-box pending";
  button.dataset.cropId = "selection";
  button.innerHTML = "<span>New crop</span>";
  button.style.left = `${(state.selection.x / state.page.width) * 100}%`;
  button.style.top = `${(state.selection.y / state.page.height) * 100}%`;
  button.style.width = `${(state.selection.width / state.page.width) * 100}%`;
  button.style.height = `${(state.selection.height / state.page.height) * 100}%`;
  layer.appendChild(button);
}

function imagePoint(event, image) {
  const rect = image.getBoundingClientRect();
  const x = Math.max(0, Math.min(state.page.width, ((event.clientX - rect.left) / rect.width) * state.page.width));
  const y = Math.max(0, Math.min(state.page.height, ((event.clientY - rect.top) / rect.height) * state.page.height));
  return { x, y };
}

async function loginOpenRouter() {
  try {
    const data = await api("/api/auth/openrouter/start");
    window.open(data.url, "_blank", "width=960,height=800");
    toast("OpenRouter login opened. If it fails, use the Key button.");
    setTimeout(boot, 3500);
    setTimeout(boot, 8000);
  } catch (error) {
    state.apiKeyModal = true;
    render();
    toast(error.message);
  }
}

async function saveApiKey(event) {
  event.preventDefault();
  const key = document.querySelector("#apiKeyInput").value.trim();
  if (!key) return;
  await api("/api/auth/openrouter/key", { method: "POST", body: JSON.stringify({ key }) });
  state.apiKeyModal = false;
  await boot();
  toast("OpenRouter key saved locally.");
}

async function saveSettings(settings) {
  Object.assign(state.settings, settings);
  await api("/api/settings", { method: "POST", body: JSON.stringify(settings) });
}

async function saveProjectSettings(event) {
  event.preventDefault();
  const settings = {
    sourceLanguage: document.querySelector("#settingsSourceLanguage").value,
    targetLanguage: document.querySelector("#settingsTargetLanguage").value,
    systemPrompt: document.querySelector("#settingsSystemPrompt").value,
  };
  await saveSettings(settings);
  state.settingsModal = false;
  render();
  toast("Project settings saved.");
}

async function resetPrompt() {
  const data = await api("/api/prompt/default");
  const field = document.querySelector("#settingsSystemPrompt");
  if (field) field.value = data.systemPrompt;
}

function addAttachment(attachment, shouldRender = true) {
  if (!state.attachments.some((item) => item.type === attachment.type && item.id === attachment.id)) {
    state.attachments.push(attachment);
  }
  if (shouldRender) render();
}

function queueAllCrops() {
  state.crops.forEach((crop) => addAttachment({ type: "crop", id: crop.id, name: crop.name }, false));
  render();
}

function fillTranslationPrompt() {
  if (!state.attachments.length && state.page) {
    addAttachment({ type: "page", id: state.page.id, name: state.page.file_name }, false);
  }
  state.pendingChatText = "Please produce the structured translation pass first, then the detailed line-by-line localization analysis.";
  render();
  const input = document.querySelector("#chatInput");
  if (input) {
    input.value = state.pendingChatText;
    input.focus();
  }
}

async function saveCrop() {
  if (!state.selection || !state.page) return;
  const name = prompt("Name this crop:", `Crop ${state.crops.length + 1}`);
  if (!name) return;
  await withBusy(async () => {
    const data = await api("/api/crops", {
      method: "POST",
      body: JSON.stringify({ pageId: state.page.id, name, ...state.selection }),
    });
    state.crops = data.crops;
    state.selection = null;
    state.sideTab = "crops";
    render();
  });
}

async function removeCurrentPage() {
  if (!state.page) return;
  const ok = confirm(`Remove ${state.page.file_name} from this project? The image file will stay on disk.`);
  if (!ok) return;
  await withBusy(async () => {
    const data = await api("/api/page/remove", { method: "POST", body: JSON.stringify({ pageId: state.page.id }) });
    state.pages = data.pages;
    state.page = null;
    state.crops = [];
    state.messages = [];
    state.scratchpad = [];
    if (state.pages[0]) await loadPage(state.pages[0].id, false);
    render();
  });
}

async function removeCrop(cropId) {
  const crop = state.crops.find((item) => item.id === cropId);
  const ok = confirm(`Remove ${crop?.name || "this crop"} from this project? The crop image will stay on disk.`);
  if (!ok) return;
  await withBusy(async () => {
    const data = await api("/api/crops/remove", { method: "POST", body: JSON.stringify({ cropId }) });
    state.crops = data.crops;
    state.attachments = state.attachments.filter((item) => item.id !== cropId);
    render();
  });
}

async function sendChat(event) {
  event.preventDefault();
  const input = document.querySelector("#chatInput");
  const message = input.value.trim();
  if (!message && !state.attachments.length) return;
  state.pendingChatText = "";
  state.busy = true;
  const assistant = { id: `pending_${Date.now()}`, role: "assistant", content: "" };
  state.messages.push({ role: "user", content: message, attachments_json: JSON.stringify(state.attachments) }, assistant);
  render();
  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pageId: state.page?.id,
        message,
        model: state.selectedModel,
        sourceLanguage: currentSource(),
        targetLanguage: currentTarget(),
        attachments: state.attachments,
      }),
    });
    if (!response.ok || !response.body) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Chat request failed.");
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      assistant.content += decoder.decode(value, { stream: true });
      const messageEls = document.querySelectorAll(".message.assistant p");
      const last = messageEls[messageEls.length - 1];
      if (last) last.textContent = assistant.content;
    }
    state.attachments = [];
    if (state.page) await loadPage(state.page.id, false);
  } catch (error) {
    toast(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

async function importFiles(files) {
  if (!state.workspacePath) {
    toast("Choose a workspace first.");
    return;
  }
  await withBusy(async () => {
    const encoded = [];
    for (const file of files) {
      encoded.push({ name: file.webkitRelativePath || file.name, dataUrl: await readFileDataUrl(file) });
    }
    const data = await api("/api/import", { method: "POST", body: JSON.stringify({ files: encoded }) });
    state.pages = data.pages;
    if (!state.page && state.pages[0]) await loadPage(state.pages[0].id, false);
    toast(`Imported ${data.imported} page${data.imported === 1 ? "" : "s"}.`);
    render();
  });
}

async function importPath() {
  if (!state.workspacePath) {
    toast("Choose a workspace first.");
    return;
  }
  const sourcePath = prompt("Folder, ZIP/CBZ, or image path to import:");
  if (!sourcePath) return;
  await withBusy(async () => {
    const data = await api("/api/import/path", { method: "POST", body: JSON.stringify({ path: sourcePath }) });
    state.pages = data.pages;
    if (!state.page && state.pages[0]) await loadPage(state.pages[0].id, false);
    toast(`Imported ${data.imported} page${data.imported === 1 ? "" : "s"}.`);
    render();
  });
}

function readFileDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function newScratchEntry() {
  const tempId = `temp_${Date.now()}`;
  state.selectedEntryId = tempId;
  state.workbenchFilter = "all";
  state.scratchpad.push({
    id: tempId,
    page_id: state.page?.id,
    label: `S${state.scratchpad.length + 1}`,
    type: "speech",
    source: "",
    draft: "",
    final: "",
    notes: "",
  });
  render();
}

async function saveEntry(event) {
  const card = event.target.closest(".entry");
  await saveEntryCard(card, true);
}

async function saveEntryCard(card, shouldRender = true) {
  if (!card || !state.page) return;
  const entry = {
    id: card.dataset.entryId.startsWith("entry_") ? card.dataset.entryId : "",
    pageId: state.page.id,
    label: card.querySelector(".entry-label").value,
    type: card.querySelector(".entry-type").value,
    source: card.querySelector(".entry-source").value,
    draft: card.querySelector(".entry-draft").value,
    final: card.querySelector(".entry-final").value,
    notes: card.querySelector(".entry-notes").value,
  };
  const data = await api("/api/scratchpad", { method: "POST", body: JSON.stringify(entry) });
  state.scratchpad = data.scratchpad;
  const saved = state.scratchpad.find((item) => item.label === entry.label);
  if (saved) state.selectedEntryId = saved.id;
  if (shouldRender || !entry.id) render();
}

function scheduleEntrySave(event) {
  const card = event.target.closest(".entry");
  if (!card) return;
  const key = card.dataset.entryId || `new-${state.scratchpad.length}`;
  clearTimeout(scratchTimers.get(key));
  scratchTimers.set(key, setTimeout(async () => {
    try {
      await saveEntryCard(card, false);
      markEntrySaved(card);
    } catch (error) {
      toast(error.message);
    }
  }, SCRATCH_SAVE_DELAY));
}

function markEntrySaved(card) {
  const button = card.querySelector(".save-entry");
  if (!button) return;
  const original = button.textContent;
  button.textContent = "Saved";
  setTimeout(() => {
    button.textContent = original || "Save";
  }, 900);
}

async function promoteDraft(event) {
  const card = event.target.closest(".entry");
  const draft = card?.querySelector(".entry-draft")?.value || "";
  const finalField = card?.querySelector(".entry-final");
  if (!finalField) return;
  finalField.value = draft;
  await saveEntryCard(card, true);
}

async function removeEntry(event) {
  const card = event.target.closest(".entry");
  if (!card || !state.page) return;
  const entryId = card.dataset.entryId;
  const entry = state.scratchpad.find((item) => item.id === entryId);
  const label = entry?.label || "this line";
  const ok = confirm(`Remove ${label} from this page scratchpad?`);
  if (!ok) return;
  clearTimeout(scratchTimers.get(entryId));
  scratchTimers.delete(entryId);
  if (!entryId?.startsWith("entry_")) {
    state.scratchpad = state.scratchpad.filter((item) => item.id !== entryId);
    state.selectedEntryId = state.scratchpad[0]?.id || "";
    render();
    return;
  }
  await withBusy(async () => {
    const data = await api("/api/scratchpad/remove", { method: "POST", body: JSON.stringify({ entryId }) });
    state.scratchpad = data.scratchpad;
    state.selectedEntryId = state.scratchpad[0]?.id || "";
    render();
  });
}

async function exportMarkdown(endpoint, body) {
  const data = await api(endpoint, { method: "POST", body: JSON.stringify(body) });
  toast(`Exported ${data.file}`);
}

async function withBusy(fn) {
  try {
    state.busy = true;
    render();
    await fn();
  } catch (error) {
    toast(error.message);
  } finally {
    state.busy = false;
    render();
  }
}

function toast(message) {
  const existing = document.querySelector(".toast");
  existing?.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function pathTail(value) {
  return String(value || "").split(/[\\/]/).pop();
}

function entryTypeClass(entry) {
  const label = String(entry?.label || "");
  const type = String(entry?.type || "").toLowerCase();
  if (type.includes("sfx") || label.startsWith("SFX")) return "sfx";
  if (type.includes("narr") || label.startsWith("N")) return "narration";
  return "speech";
}

boot();
