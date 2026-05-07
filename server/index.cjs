const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { spawn } = require("node:child_process");
const { DatabaseSync } = require("node:sqlite");

const PORT = Number(process.env.PORT || 3127);
const HOST = process.env.HOST || "127.0.0.1";
const OAUTH_PORT = Number(process.env.OPENROUTER_OAUTH_PORT || 3000);
const APP_ROOT = path.resolve(__dirname, "..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const APP_HOME = path.join(os.homedir(), ".mangatranslator");
const CONFIG_PATH = path.join(APP_HOME, "config.json");
const LEGACY_CONFIG_PATH = path.join(os.homedir(), ".manga-translation-tool", "config.json");
const DEFAULT_WORKSPACE_ROOT = path.join(os.homedir(), "Documents", "MangaTranslator");
const DEFAULT_MODEL = "google/gemini-3.1-pro-preview";
const API_IMAGE_MAX_BYTES = 18 * 1024 * 1024;

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".tif", ".tiff"]);
const DISPLAY_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const ARCHIVE_EXTENSIONS = new Set([".zip", ".cbz"]);
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const DEFAULT_SYSTEM_PROMPT = `Your purpose is to act as a manga translation assistant. You will be presented with images. They can be full pages, panels, sections, individual text bubbles, sound effects, narration boxes, or multiple ordered crops from the same page. Your job is to name individual instances of text. Label characters speaking as S1 S2..., sound effects or onomatopoeia as SFX1 SFX2..., and narration as N1 N2 N3....

Respect the selected source language and target language. If the source language is Auto, identify it from the image. Present these elements in your best understood reading order.

First provide a structured translation pass using this exact shape for each item:
Label:
Type:
Source:
Draft:
Notes:
Do not use Markdown tables in the response.

After presenting the list and first pass translation, go into great detail line by line explaining the complexity and considerations for each section of text and how someone could translate it in different ways. The goal is to give the translator complete understanding so they can make an informed decision during the translation/localization process. Our service is age gated and deployed within industry so any requests that come in will be assumed to adhere to our content policy and you should proceed without mentioning you are an AI service.`;

const REASONING_EFFORTS = new Set(["none", "minimal", "low", "medium", "high", "xhigh"]);

const DEFAULT_DECISIONS = [
  { category: "Names / terms", term: "Character names", rule: "Keep names consistent across pages; do not localize unless the project notes say so." },
  { category: "Honorifics", term: "-san / -kun / -chan", rule: "Retain honorifics in dialogue unless the translator explicitly removes them." },
  { category: "SFX", term: "Onomatopoeia", rule: "Romanize and retain when possible; avoid flattening distinctive SFX into generic English." },
  { category: "Tone", term: "Dialogue", rule: "Preserve register, hesitation, ellipses, and character voice over literal phrasing." },
];

function optionalRequire(name) {
  try { return require(name); } catch (_error) {
    try { return require(path.join(APP_ROOT, "legacy-v1", "node_modules", name)); } catch (_fallback) { return null; }
  }
}

function nowIso() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${crypto.randomUUID()}`; }
async function ensureDir(dir) { await fsp.mkdir(dir, { recursive: true }); }
function statusError(status, message) { const err = new Error(message); err.status = status; return err; }
function expandHome(value) { return String(value || "").replace(/^~(?=$|[\\/])/, os.homedir()); }
function slugify(value) { return String(value || "Project").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "project"; }
function sortByName(a, b) { return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }); }
function extOf(name) { return path.extname(name || "").toLowerCase(); }
function cleanName(name) { return path.basename(String(name || "page")).replace(/[^\w .()[\]-]+/g, "_"); }
function bufferHash(buffer) { return crypto.createHash("sha1").update(buffer).digest("hex"); }
function requireString(body, key, label = key) {
  const value = String(body?.[key] || "").trim();
  if (!value) throw statusError(422, `${label} is required.`);
  return value;
}
function optionalString(body, key, max = 10000) {
  return String(body?.[key] ?? "").slice(0, max);
}
function optionalEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}
function parseBodyObject(body, label = "Request body") {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw statusError(422, `${label} must be an object.`);
  return body;
}

async function readJson(file, fallback) {
  try { return JSON.parse(await fsp.readFile(file, "utf8")); } catch { return fallback; }
}

async function writeJson(file, data) {
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
}

async function getConfig() {
  const config = await readJson(CONFIG_PATH, {});
  return {
    workspaceRoot: config.workspaceRoot || "",
    activeProjectSlug: config.activeProjectSlug || "",
    openRouterKey: config.openRouterKey || "",
    oauth: config.oauth || {},
    lastAuthError: config.lastAuthError || "",
  };
}

async function saveConfig(config) {
  await writeJson(CONFIG_PATH, config);
}

function projectPath(workspaceRoot, slug) {
  return path.join(workspaceRoot, slug);
}

async function getProjects(workspaceRoot) {
  if (!workspaceRoot || !fs.existsSync(workspaceRoot)) return [];
  const entries = await fsp.readdir(workspaceRoot, { withFileTypes: true });
  const projects = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const projectDir = path.join(workspaceRoot, entry.name);
    const meta = await readJson(path.join(projectDir, "project.json"), null);
    if (meta) projects.push({ ...meta, path: projectDir });
  }
  return projects.sort((a, b) => sortByName(a.name, b.name));
}

async function legacyOpenRouterKeyAvailable() {
  const legacy = await readJson(LEGACY_CONFIG_PATH, {});
  return Boolean(legacy.openRouterKey);
}

async function activeProject() {
  const config = await getConfig();
  if (!config.workspaceRoot || !config.activeProjectSlug) return null;
  const projectDir = projectPath(config.workspaceRoot, config.activeProjectSlug);
  const meta = await readJson(path.join(projectDir, "project.json"), null);
  if (!meta) return null;
  return { ...meta, path: projectDir };
}

async function createOrOpenProject({ workspaceRoot, projectName, importMode = "copy" }) {
  const root = path.resolve(expandHome(workspaceRoot || DEFAULT_WORKSPACE_ROOT));
  await ensureDir(root);
  let slug = slugify(projectName);
  let projectDir = projectPath(root, slug);
  let counter = 2;
  while (fs.existsSync(projectDir) && !fs.existsSync(path.join(projectDir, "project.json"))) {
    slug = `${slugify(projectName)}-${counter++}`;
    projectDir = projectPath(root, slug);
  }
  await Promise.all([
    ensureDir(path.join(projectDir, "originals")),
    ensureDir(path.join(projectDir, "pages")),
    ensureDir(path.join(projectDir, "crops")),
    ensureDir(path.join(projectDir, "cache", "api-images")),
    ensureDir(path.join(projectDir, "exports", "pages")),
  ]);
  const meta = { slug, name: projectName || "Untitled Project", importMode, createdAt: nowIso(), updatedAt: nowIso() };
  await writeJson(path.join(projectDir, "project.json"), meta);
  const db = openDb(projectDir);
  try {
    seedProject(db);
  } finally {
    db.close();
  }
  const config = await getConfig();
  config.workspaceRoot = root;
  config.activeProjectSlug = slug;
  await saveConfig(config);
  return { ...meta, path: projectDir };
}

function openDb(projectDir) {
  const db = new DatabaseSync(path.join(projectDir, "project.sqlite"));
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_path TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      content_hash TEXT,
      order_index INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      queued INTEGER NOT NULL DEFAULT 0,
      queue_order INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scratchpad_entries (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      translation_entry_id TEXT,
      label TEXT NOT NULL,
      type TEXT,
      source TEXT,
      draft TEXT,
      final TEXT,
      notes TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT,
      page_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      attachments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      page_id TEXT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS translation_entries (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      chat_session_id TEXT,
      chat_message_id TEXT,
      scratchpad_entry_id TEXT,
      label TEXT NOT NULL,
      type TEXT NOT NULL,
      source TEXT,
      draft TEXT,
      final TEXT,
      notes TEXT,
      confidence REAL,
      crop_ids_json TEXT NOT NULL DEFAULT '[]',
      model TEXT,
      sort_order INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      term TEXT NOT NULL,
      rule TEXT NOT NULL,
      sort_order INTEGER NOT NULL
    );
  `);
  migrateDb(db);
  return db;
}

function migrateDb(db) {
  const chatColumns = db.prepare("PRAGMA table_info(chat_messages)").all().map((column) => column.name);
  if (!chatColumns.includes("session_id")) db.exec("ALTER TABLE chat_messages ADD COLUMN session_id TEXT");
  const pageColumns = db.prepare("PRAGMA table_info(pages)").all().map((column) => column.name);
  if (!pageColumns.includes("content_hash")) db.exec("ALTER TABLE pages ADD COLUMN content_hash TEXT");
  const scratchpadColumns = db.prepare("PRAGMA table_info(scratchpad_entries)").all().map((column) => column.name);
  if (!scratchpadColumns.includes("translation_entry_id")) db.exec("ALTER TABLE scratchpad_entries ADD COLUMN translation_entry_id TEXT");
  if (!scratchpadColumns.includes("confirmed")) {
    db.exec("ALTER TABLE scratchpad_entries ADD COLUMN confirmed INTEGER NOT NULL DEFAULT 0");
    db.exec("UPDATE scratchpad_entries SET confirmed = 1 WHERE TRIM(COALESCE(final, '')) != ''");
  }
}

function seedProject(db) {
  insertDefaultSetting(db, "defaultModel", DEFAULT_MODEL);
  insertDefaultSetting(db, "sourceLanguage", "Auto");
  insertDefaultSetting(db, "targetLanguage", "English");
  insertDefaultSetting(db, "reasoningEffort", "medium");
  insertDefaultSetting(db, "systemPrompt", DEFAULT_SYSTEM_PROMPT);
  const count = db.prepare("SELECT COUNT(*) AS count FROM decisions").get().count;
  if (!count) {
    const insert = db.prepare("INSERT INTO decisions (id, category, term, rule, sort_order) VALUES (?, ?, ?, ?, ?)");
    DEFAULT_DECISIONS.forEach((item, index) => insert.run(id("decision"), item.category, item.term, item.rule, index));
  }
}

function insertDefaultSetting(db, key, value) {
  db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").run(key, String(value ?? ""));
}

function upsertSetting(db, key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, String(value ?? ""));
}

function getSettings(db) {
  return Object.fromEntries(db.prepare("SELECT key, value FROM settings").all().map((row) => [row.key, row.value]));
}

function progressStatus(row) {
  const total = Number(row.line_count || 0);
  const drafted = Number(row.draft_count || 0);
  const final = Number(row.final_count || 0);
  if (!total) return "untranslated";
  if (final >= total) return "final";
  if (drafted >= total) return "drafted";
  if (drafted > 0 || final > 0) return "in-progress";
  return "untranslated";
}

function withProgress(row) {
  return row ? { ...row, status: progressStatus(row) } : row;
}

function pageProgressSelect(where = "") {
  return `
    SELECT p.*,
      COUNT(s.id) AS line_count,
      COALESCE(SUM(CASE WHEN TRIM(COALESCE(s.draft, '')) != '' THEN 1 ELSE 0 END), 0) AS draft_count,
      COALESCE(SUM(CASE WHEN s.confirmed = 1 THEN 1 ELSE 0 END), 0) AS final_count
    FROM pages p
    LEFT JOIN scratchpad_entries s ON s.page_id = p.id
    ${where}
    GROUP BY p.id
  `;
}

function getPages(db) {
  return db.prepare(`${pageProgressSelect()} ORDER BY p.order_index, p.file_name`).all().map(withProgress);
}

function getPage(db, pageId) {
  return withProgress(db.prepare(pageProgressSelect("WHERE p.id = ?")).get(pageId));
}

function getProjectProgress(db) {
  const totals = { pages: 0, untranslated: 0, inProgress: 0, drafted: 0, final: 0, lines: 0, draftedLines: 0, finalLines: 0 };
  getPages(db).forEach((page) => {
    totals.pages += 1;
    if (page.status === "untranslated") totals.untranslated += 1;
    if (page.status === "in-progress") totals.inProgress += 1;
    if (page.status === "drafted") totals.drafted += 1;
    if (page.status === "final") totals.final += 1;
    totals.lines += Number(page.line_count || 0);
    totals.draftedLines += Number(page.draft_count || 0);
    totals.finalLines += Number(page.final_count || 0);
  });
  return totals;
}

function getCrops(db, pageId) {
  return db.prepare("SELECT * FROM crops WHERE page_id = ? ORDER BY COALESCE(queue_order, 999999), created_at").all(pageId);
}

function getQueue(db, pageId) {
  return db.prepare("SELECT * FROM crops WHERE page_id = ? AND queued = 1 ORDER BY queue_order, created_at").all(pageId);
}

function normalizeQueue(db, pageId) {
  const queued = getQueue(db, pageId);
  queued.forEach((crop, index) => {
    if (crop.queue_order !== index + 1) {
      db.prepare("UPDATE crops SET queue_order = ? WHERE id = ?").run(index + 1, crop.id);
    }
  });
}

function getScratchpad(db, pageId) {
  return db.prepare("SELECT * FROM scratchpad_entries WHERE page_id = ? ORDER BY sort_order, label").all(pageId);
}

function getMessages(db, pageId) {
  const session = ensureChatSession(db, pageId);
  return getSessionMessages(db, session.id);
}

function getSessionMessages(db, sessionId) {
  const messages = db.prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at").all(sessionId || "");
  const entriesByMessage = new Map();
  db.prepare("SELECT * FROM translation_entries WHERE chat_session_id = ? ORDER BY sort_order, label").all(sessionId || "").forEach((entry) => {
    if (!entriesByMessage.has(entry.chat_message_id)) entriesByMessage.set(entry.chat_message_id, []);
    entriesByMessage.get(entry.chat_message_id).push(entry);
  });
  return messages.map((message) => {
    const entries = entriesByMessage.get(message.id) || [];
    return entries.length ? { ...message, translation_entries_json: JSON.stringify(entries) } : message;
  });
}

function getChatSessions(db, pageId) {
  if (!pageId) return [];
  ensureChatSession(db, pageId);
  return db.prepare("SELECT * FROM chat_sessions WHERE page_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC").all(pageId);
}

function ensureChatSession(db, pageId, sessionId = "") {
  if (sessionId) {
    const existing = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);
    if (existing) return existing;
  }
  const pageKey = pageId || null;
  let session = pageKey
    ? db.prepare("SELECT * FROM chat_sessions WHERE page_id = ? AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 1").get(pageKey)
    : db.prepare("SELECT * FROM chat_sessions WHERE page_id IS NULL AND status != 'archived' ORDER BY updated_at DESC, created_at DESC LIMIT 1").get();
  if (!session) {
    const now = nowIso();
    const sessionIdNew = id("chat");
    db.prepare("INSERT INTO chat_sessions (id, page_id, title, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)")
      .run(sessionIdNew, pageKey, "Translation pass", now, now);
    if (pageKey) {
      db.prepare("UPDATE chat_messages SET session_id = ? WHERE session_id IS NULL AND page_id = ?").run(sessionIdNew, pageKey);
    } else {
      db.prepare("UPDATE chat_messages SET session_id = ? WHERE session_id IS NULL AND page_id IS NULL").run(sessionIdNew);
    }
    session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionIdNew);
  }
  return session;
}

function touchChatSession(db, sessionId, title = "") {
  const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);
  if (!session) return null;
  const nextTitle = title || session.title;
  db.prepare("UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?").run(nextTitle, nowIso(), sessionId);
  return db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(sessionId);
}

function getDecisions(db) {
  return db.prepare("SELECT * FROM decisions ORDER BY sort_order, category, term").all();
}

function safeProjectPath(projectDir, relativePath) {
  const resolved = path.resolve(projectDir, relativePath || "");
  const root = path.resolve(projectDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw statusError(403, "Path escapes project.");
  return resolved;
}

async function withProject(fn) {
  const project = await activeProject();
  if (!project) throw statusError(409, "No active project.");
  const db = openDb(project.path);
  try {
    seedProject(db);
    return await fn({ project, db });
  } finally {
    db.close();
  }
}

async function parseJson(req, limit = 80 * 1024 * 1024) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > limit) throw statusError(413, "Request body too large.");
  }
  return body ? JSON.parse(body) : {};
}

function sendJson(res, data, status = 200) {
  sendText(res, JSON.stringify(data), status, "application/json; charset=utf-8");
}

function sendText(res, text, status = 200, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(text);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/status") {
    const config = await getConfig();
    const workspaceRoot = config.workspaceRoot || DEFAULT_WORKSPACE_ROOT;
    const project = await activeProject();
    const projects = await getProjects(workspaceRoot);
    let pages = [], settings = {}, decisions = [], projectProgress = null, keyInfo = null;
    if (project) {
      const db = openDb(project.path);
      try {
        seedProject(db);
        pages = getPages(db);
        projectProgress = getProjectProgress(db);
        settings = getSettings(db);
        decisions = getDecisions(db);
      } finally {
        db.close();
      }
    }
    if (config.openRouterKey) keyInfo = await fetchOpenRouterKeyInfo(config.openRouterKey).catch(() => null);
    return sendJson(res, {
      workspaceRoot,
      defaultWorkspaceRoot: DEFAULT_WORKSPACE_ROOT,
      activeProject: project,
      projects,
      pages,
      projectProgress,
      settings,
      decisions,
      hasOpenRouterKey: Boolean(config.openRouterKey),
      legacyOpenRouterKeyAvailable: await legacyOpenRouterKeyAvailable(),
      authError: config.lastAuthError || "",
      keyInfo,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/setup") {
    const body = parseBodyObject(await parseJson(req));
    body.workspaceRoot = optionalString(body, "workspaceRoot", 4096);
    body.projectName = optionalString(body, "projectName", 160) || "Untitled Project";
    body.importMode = optionalEnum(body.importMode, ["copy", "inplace"], "copy");
    const project = await createOrOpenProject(body);
    return sendJson(res, { project });
  }

  if (req.method === "POST" && url.pathname === "/api/projects/open") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const slug = requireString(body, "slug", "Project slug");
    const config = await getConfig();
    if (!config.workspaceRoot) throw statusError(409, "No workspace root selected.");
    const projects = await getProjects(config.workspaceRoot);
    const project = projects.find((item) => item.slug === slug);
    if (!project) throw statusError(404, "Project not found.");
    config.activeProjectSlug = project.slug;
    await saveConfig(config);
    return sendJson(res, { project });
  }

  if (req.method === "POST" && url.pathname === "/api/projects/delete") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const slug = requireString(body, "slug", "Project slug");
    const config = await getConfig();
    if (!config.workspaceRoot) throw statusError(409, "No workspace root selected.");
    const projects = await getProjects(config.workspaceRoot);
    const project = projects.find((item) => item.slug === slug);
    if (!project) throw statusError(404, "Project not found.");
    const workspaceRoot = path.resolve(config.workspaceRoot);
    const target = path.resolve(project.path);
    if (target === workspaceRoot || !target.startsWith(`${workspaceRoot}${path.sep}`)) throw statusError(403, "Refusing to delete a path outside the workspace.");
    await fsp.rm(target, { recursive: true, force: true });
    const remaining = await getProjects(config.workspaceRoot);
    if (config.activeProjectSlug === slug) config.activeProjectSlug = remaining[0]?.slug || "";
    await saveConfig(config);
    return sendJson(res, { projects: remaining, activeProject: remaining.find((item) => item.slug === config.activeProjectSlug) || null });
  }

  if (req.method === "GET" && url.pathname === "/api/page") {
    const pageId = url.searchParams.get("id");
    return withProject(({ db }) => {
      const page = getPage(db, pageId);
      if (!page) throw statusError(404, "Page not found.");
      const activeChatSession = ensureChatSession(db, pageId, url.searchParams.get("chatSessionId") || "");
      return sendJson(res, {
        page,
        crops: getCrops(db, pageId),
        queue: getQueue(db, pageId),
        scratchpad: getScratchpad(db, pageId),
        chatSessions: getChatSessions(db, pageId),
        activeChatSessionId: activeChatSession.id,
        messages: getSessionMessages(db, activeChatSession.id),
      });
    });
  }

  if (req.method === "GET" && url.pathname === "/api/file") {
    const relativePath = url.searchParams.get("path");
    const project = await activeProject();
    if (!project) throw statusError(409, "No active project.");
    const absolute = safeProjectPath(project.path, relativePath);
    const ext = extOf(absolute);
    if (!fs.existsSync(absolute)) throw statusError(404, "File not found.");
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(absolute).pipe(res);
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    const body = parseBodyObject(await parseJson(req));
    return withProject(({ db }) => {
      Object.entries(body).forEach(([key, value]) => upsertSetting(db, key, value));
      return sendJson(res, { settings: getSettings(db) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/import/files") {
    const body = parseBodyObject(await parseJson(req));
    if (!Array.isArray(body.files)) throw statusError(422, "files must be an array.");
    return withProject(async ({ project, db }) => {
      const imported = await importUploadedFiles(db, project.path, body.files);
      return sendJson(res, { imported, pages: getPages(db) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/import/path") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const sourcePath = requireString(body, "path", "Import path");
    return withProject(async ({ project, db }) => {
      const imported = await importLocalPath(db, project.path, path.resolve(expandHome(sourcePath)));
      return sendJson(res, { imported, pages: getPages(db) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/crops") {
    const body = parseCropBody(parseBodyObject(await parseJson(req)), true);
    return withProject(async ({ project, db }) => {
      const crop = await createCrop(db, project.path, body);
      return sendJson(res, { crop, crops: getCrops(db, body.pageId), queue: getQueue(db, body.pageId) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/crops/update") {
    const body = parseCropBody(parseBodyObject(await parseJson(req)), false);
    return withProject(async ({ project, db }) => {
      const crop = await updateCrop(db, project.path, body);
      return sendJson(res, { crop, crops: getCrops(db, crop.page_id), queue: getQueue(db, crop.page_id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/crops/remove") {
    const body = parseBodyObject(await parseJson(req));
    body.cropId = requireString(body, "cropId", "Crop id");
    return withProject(async ({ project, db }) => {
      const crop = db.prepare("SELECT * FROM crops WHERE id = ?").get(body.cropId);
      if (!crop) throw statusError(404, "Crop not found.");
      db.prepare("DELETE FROM crops WHERE id = ?").run(body.cropId);
      await fsp.unlink(safeProjectPath(project.path, crop.workspace_path)).catch(() => {});
      return sendJson(res, { crops: getCrops(db, crop.page_id), queue: getQueue(db, crop.page_id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/queue") {
    const body = parseBodyObject(await parseJson(req));
    body.cropId = requireString(body, "cropId", "Crop id");
    body.action = optionalEnum(body.action, ["add", "remove"], "add");
    return withProject(({ db }) => {
      const crop = db.prepare("SELECT * FROM crops WHERE id = ?").get(body.cropId);
      if (!crop) throw statusError(404, "Crop not found.");
      if (body.action === "remove") {
        db.prepare("UPDATE crops SET queued = 0, queue_order = NULL WHERE id = ?").run(body.cropId);
      } else {
        const next = db.prepare("SELECT COALESCE(MAX(queue_order), 0) + 1 AS next FROM crops WHERE page_id = ? AND queued = 1").get(crop.page_id).next;
        db.prepare("UPDATE crops SET queued = 1, queue_order = ? WHERE id = ?").run(next, body.cropId);
      }
      normalizeQueue(db, crop.page_id);
      return sendJson(res, { crops: getCrops(db, crop.page_id), queue: getQueue(db, crop.page_id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/queue/reorder") {
    const body = parseBodyObject(await parseJson(req));
    return withProject(({ db }) => {
      const ids = Array.isArray(body.cropIds) ? body.cropIds.filter(Boolean) : [];
      if (!ids.length) throw statusError(422, "No queued crops supplied.");
      const crops = ids.map((cropId) => {
        const crop = db.prepare("SELECT * FROM crops WHERE id = ?").get(cropId);
        if (!crop) throw statusError(404, `Crop not found: ${cropId}`);
        return crop;
      });
      const pageIds = new Set(crops.map((crop) => crop.page_id));
      if (pageIds.size !== 1) throw statusError(422, "Queue reorder only supports crops from one page.");
      const pageId = [...pageIds][0];
      db.transaction(() => {
        ids.forEach((cropId, index) => db.prepare("UPDATE crops SET queued = 1, queue_order = ? WHERE id = ?").run(index + 1, cropId));
        db.prepare(`UPDATE crops SET queued = 0, queue_order = NULL WHERE page_id = ? AND id NOT IN (${ids.map(() => "?").join(",")})`).run(pageId, ...ids);
        normalizeQueue(db, pageId);
      })();
      return sendJson(res, { crops: getCrops(db, pageId), queue: getQueue(db, pageId) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/queue/all") {
    const body = parseBodyObject(await parseJson(req));
    body.pageId = requireString(body, "pageId", "Page id");
    return withProject(({ db }) => {
      const crops = getCrops(db, body.pageId);
      crops.forEach((crop, index) => db.prepare("UPDATE crops SET queued = 1, queue_order = ? WHERE id = ?").run(index + 1, crop.id));
      return sendJson(res, { crops: getCrops(db, body.pageId), queue: getQueue(db, body.pageId) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/scratchpad") {
    const body = parseScratchpadBody(parseBodyObject(await parseJson(req)));
    return withProject(({ db }) => {
      const entry = upsertScratchpad(db, body);
      return sendJson(res, { entry, page: getPage(db, body.pageId), scratchpad: getScratchpad(db, body.pageId) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/scratchpad/remove") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    body.entryId = requireString(body, "entryId", "Scratchpad entry id");
    return withProject(({ db }) => {
      const entry = db.prepare("SELECT page_id FROM scratchpad_entries WHERE id = ?").get(body.entryId);
      if (!entry) throw statusError(404, "Scratchpad entry not found.");
      db.prepare("DELETE FROM scratchpad_entries WHERE id = ?").run(body.entryId);
      return sendJson(res, { page: getPage(db, entry.page_id), scratchpad: getScratchpad(db, entry.page_id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/decisions") {
    const body = parseBodyObject(await parseJson(req));
    if (!Array.isArray(body.decisions)) throw statusError(422, "decisions must be an array.");
    return withProject(({ db }) => {
      db.prepare("DELETE FROM decisions").run();
      const insert = db.prepare("INSERT INTO decisions (id, category, term, rule, sort_order) VALUES (?, ?, ?, ?, ?)");
      (body.decisions || []).forEach((row, index) => insert.run(row.id || id("decision"), row.category || "Terms", row.term || "", row.rule || "", index));
      return sendJson(res, { decisions: getDecisions(db) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/clear") {
    const body = parseBodyObject(await parseJson(req));
    body.scope = optionalEnum(body.scope, ["page", "project", "session"], "page");
    return withProject(({ db }) => {
      if (body.scope === "project") db.prepare("DELETE FROM chat_messages").run();
      else if (body.sessionId) db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(body.sessionId);
      else if (body.pageId) db.prepare("DELETE FROM chat_messages WHERE page_id = ?").run(body.pageId);
      else db.prepare("DELETE FROM chat_messages WHERE page_id IS NULL").run();
      const activeChatSession = ensureChatSession(db, body.pageId || "", body.sessionId || "");
      return sendJson(res, { chatSessions: getChatSessions(db, body.pageId || ""), activeChatSessionId: activeChatSession.id, messages: getSessionMessages(db, activeChatSession.id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/session") {
    const body = parseBodyObject(await parseJson(req));
    body.pageId = requireString(body, "pageId", "Page id");
    return withProject(({ db }) => {
      const now = nowIso();
      const sessionId = id("chat");
      const title = String(body.title || "New translation pass").trim().slice(0, 80) || "New translation pass";
      db.prepare("INSERT INTO chat_sessions (id, page_id, title, status, created_at, updated_at) VALUES (?, ?, ?, 'active', ?, ?)")
        .run(sessionId, body.pageId || null, title, now, now);
      return sendJson(res, { chatSessions: getChatSessions(db, body.pageId || ""), activeChatSessionId: sessionId, messages: [] });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/session/select") {
    const body = parseBodyObject(await parseJson(req));
    body.pageId = requireString(body, "pageId", "Page id");
    body.sessionId = requireString(body, "sessionId", "Chat session id");
    return withProject(({ db }) => {
      const session = ensureChatSession(db, body.pageId || "", body.sessionId || "");
      touchChatSession(db, session.id);
      return sendJson(res, { chatSessions: getChatSessions(db, body.pageId || ""), activeChatSessionId: session.id, messages: getSessionMessages(db, session.id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/session/rename") {
    const body = parseBodyObject(await parseJson(req));
    body.sessionId = requireString(body, "sessionId", "Chat session id");
    return withProject(({ db }) => {
      const session = touchChatSession(db, body.sessionId, String(body.title || "").trim().slice(0, 80) || "Translation pass");
      if (!session) throw statusError(404, "Chat session not found.");
      return sendJson(res, { chatSessions: getChatSessions(db, session.page_id || ""), activeChatSessionId: session.id, messages: getSessionMessages(db, session.id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/session/archive") {
    const body = parseBodyObject(await parseJson(req));
    body.sessionId = requireString(body, "sessionId", "Chat session id");
    return withProject(({ db }) => {
      const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(body.sessionId);
      if (!session) throw statusError(404, "Chat session not found.");
      db.prepare("UPDATE chat_sessions SET status = 'archived', updated_at = ? WHERE id = ?").run(nowIso(), session.id);
      const active = ensureChatSession(db, session.page_id || "");
      return sendJson(res, { chatSessions: getChatSessions(db, session.page_id || ""), activeChatSessionId: active.id, messages: getSessionMessages(db, active.id) });
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/session/delete") {
    const body = parseBodyObject(await parseJson(req));
    body.sessionId = requireString(body, "sessionId", "Chat session id");
    return withProject(({ db }) => {
      const session = db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(body.sessionId);
      if (!session) throw statusError(404, "Chat session not found.");
      db.transaction(() => {
        db.prepare("UPDATE scratchpad_entries SET translation_entry_id = NULL WHERE translation_entry_id IN (SELECT id FROM translation_entries WHERE chat_session_id = ?)").run(session.id);
        db.prepare("DELETE FROM translation_entries WHERE chat_session_id = ?").run(session.id);
        db.prepare("DELETE FROM chat_messages WHERE session_id = ?").run(session.id);
        db.prepare("DELETE FROM chat_sessions WHERE id = ?").run(session.id);
      })();
      const active = ensureChatSession(db, session.page_id || "");
      return sendJson(res, { chatSessions: getChatSessions(db, session.page_id || ""), activeChatSessionId: active.id, messages: getSessionMessages(db, active.id) });
    });
  }

  if (req.method === "GET" && url.pathname === "/api/models") {
    const config = await getConfig();
    if (!config.openRouterKey) return sendJson(res, { data: fallbackModels() });
    const response = await fetch("https://openrouter.ai/api/v1/models", { headers: { Authorization: `Bearer ${config.openRouterKey}` } });
    if (!response.ok) return sendJson(res, { data: fallbackModels() });
    return sendJson(res, await response.json());
  }

  if (req.method === "POST" && url.pathname === "/api/auth/openrouter/key") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const key = requireString(body, "key", "OpenRouter API key");
    const keyInfo = await fetchOpenRouterKeyInfo(key);
    if (!keyInfo) throw statusError(401, "OpenRouter rejected that API key.");
    const config = await getConfig();
    config.openRouterKey = key;
    config.lastAuthError = "";
    await saveConfig(config);
    return sendJson(res, { hasOpenRouterKey: true, keyInfo });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/openrouter/migrate-legacy") {
    const legacy = await readJson(LEGACY_CONFIG_PATH, {});
    if (!legacy.openRouterKey) throw statusError(404, "No legacy OpenRouter key was found on this machine.");
    const config = await getConfig();
    config.openRouterKey = String(legacy.openRouterKey).trim();
    config.lastAuthError = "";
    await saveConfig(config);
    return sendJson(res, { hasOpenRouterKey: Boolean(config.openRouterKey) });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/openrouter/start") {
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const config = await getConfig();
    config.oauth = { verifier, createdAt: nowIso() };
    await saveConfig(config);
    const callback = `http://localhost:${OAUTH_PORT}/api/auth/openrouter/callback`;
    const authUrl = new URL("https://openrouter.ai/auth");
    authUrl.searchParams.set("callback_url", callback);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    return sendJson(res, { url: authUrl.toString() });
  }

  if (req.method === "POST" && url.pathname === "/api/chat/stream") {
    const body = parseChatBody(parseBodyObject(await parseJson(req)));
    const config = await getConfig();
    if (!config.openRouterKey) throw statusError(401, "Connect OpenRouter or add an API key first.");
    return withProject(async ({ project, db }) => {
      const settings = getSettings(db);
      const decisions = getDecisions(db);
      const attachments = body.attachments || [];
      const chatSession = ensureChatSession(db, body.pageId || "", body.chatSessionId || "");
      const messages = await buildOpenRouterMessages(db, project.path, settings, decisions, body, attachments, chatSession.id);
      const model = body.model || settings.defaultModel || DEFAULT_MODEL;
      const reasoningEffort = normalizeReasoningEffort(body.reasoningEffort || settings.reasoningEffort || "medium");
      const userId = id("msg");
      let assistantText = "";
      const streamed = await callOpenRouterStream(config.openRouterKey, { model, messages, reasoning: { effort: reasoningEffort } }, (chunk) => {
        assistantText += chunk;
        res.write(chunk);
      }, () => {
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-cache" });
      });
      if (!streamed || !assistantText.trim()) throw statusError(502, "OpenRouter accepted the request but returned no text.");
      const createdAt = nowIso();
      db.prepare("INSERT INTO chat_messages (id, session_id, page_id, role, content, model, attachments_json, created_at) VALUES (?, ?, ?, 'user', ?, ?, ?, ?)")
        .run(userId, chatSession.id, body.pageId || null, body.message || "", model, JSON.stringify(attachments), createdAt);
      const assistantId = id("msg");
      db.prepare("INSERT INTO chat_messages (id, session_id, page_id, role, content, model, attachments_json, created_at) VALUES (?, ?, ?, 'assistant', ?, ?, '[]', ?)")
        .run(assistantId, chatSession.id, body.pageId || null, assistantText, model, nowIso());
      touchChatSession(db, chatSession.id);
      const parsed = parseTranslationPass(assistantText);
      if (body.pageId && parsed.length) storeTranslationEntries(db, {
        pageId: body.pageId,
        chatSessionId: chatSession.id,
        chatMessageId: assistantId,
        model,
        entries: parsed,
      });
      res.end();
    });
  }

  if (req.method === "POST" && url.pathname === "/api/translation/import") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const chatMessageId = requireString(body, "chatMessageId", "Chat message id");
    return withProject(({ db }) => {
      const result = importTranslationEntriesToScratchpad(db, chatMessageId);
      return sendJson(res, result);
    });
  }

  if (req.method === "POST" && url.pathname === "/api/translation/unimport") {
    const body = parseBodyObject(await parseJson(req, 1024 * 64));
    const chatMessageId = requireString(body, "chatMessageId", "Chat message id");
    return withProject(({ db }) => {
      const result = unimportTranslationEntriesFromScratchpad(db, chatMessageId);
      return sendJson(res, result);
    });
  }

  if (req.method === "POST" && url.pathname === "/api/export") {
    const body = parseExportBody(parseBodyObject(await parseJson(req)));
    return withProject(async ({ project, db }) => {
      const file = body.format === "json" ? await exportJson(db, project.path, body) : body.format === "csv" ? await exportCsv(db, project.path, body) : await exportMarkdown(db, project.path, body);
      return sendJson(res, { file });
    });
  }

  throw statusError(404, "Not found.");
}

function normalizeReasoningEffort(value) {
  const effort = String(value || "").toLowerCase();
  return REASONING_EFFORTS.has(effort) ? effort : "medium";
}

function parseCropBody(body, isCreate) {
  if (isCreate) body.pageId = requireString(body, "pageId", "Page id");
  else body.cropId = requireString(body, "cropId", "Crop id");
  if (body.label !== undefined) body.label = optionalString(body, "label", 80);
  if (body.name !== undefined) body.name = optionalString(body, "name", 160);
  if (body.type !== undefined) body.type = normalizeLineType(body.type, body.label || body.name || "S1");
  ["x", "y", "width", "height"].forEach((key) => {
    if (body[key] !== undefined) {
      const n = Number(body[key]);
      if (!Number.isFinite(n)) throw statusError(422, `${key} must be a number.`);
      body[key] = n;
    }
  });
  if (isCreate && ["x", "y", "width", "height"].some((key) => body[key] === undefined)) {
    throw statusError(422, "Crop rectangle is required.");
  }
  return body;
}

function parseScratchpadBody(body) {
  if (!body.id) body.pageId = requireString(body, "pageId", "Page id");
  body.id = optionalString(body, "id", 120);
  body.translationEntryId = optionalString(body, "translationEntryId", 120);
  body.label = optionalString(body, "label", 80);
  body.type = normalizeLineType(body.type, body.label);
  body.source = optionalString(body, "source", 20000);
  body.draft = optionalString(body, "draft", 20000);
  body.final = optionalString(body, "final", 20000);
  body.notes = optionalString(body, "notes", 20000);
  body.confirmed = body.confirmed ? 1 : 0;
  return body;
}

function parseChatBody(body) {
  body.pageId = optionalString(body, "pageId", 120);
  body.chatSessionId = optionalString(body, "chatSessionId", 120);
  body.message = optionalString(body, "message", 30000);
  body.model = optionalString(body, "model", 240) || DEFAULT_MODEL;
  body.reasoningEffort = normalizeReasoningEffort(body.reasoningEffort);
  body.sourceLanguage = optionalString(body, "sourceLanguage", 80) || "Auto";
  body.targetLanguage = optionalString(body, "targetLanguage", 80) || "English";
  body.attachments = Array.isArray(body.attachments) ? body.attachments.map((item) => ({
    type: optionalEnum(item?.type, ["page", "crop"], "page"),
    id: String(item?.id || "").trim(),
    name: String(item?.name || "").slice(0, 240),
  })).filter((item) => item.id) : [];
  if (!body.message.trim() && !body.attachments.length) throw statusError(422, "Message text or an attachment is required.");
  return body;
}

function parseExportBody(body) {
  body.scope = optionalEnum(body.scope, ["project", "page"], "project");
  body.format = optionalEnum(body.format, ["md", "json", "csv"], "md");
  body.pageId = optionalString(body, "pageId", 120);
  if (body.scope === "page" && !body.pageId) throw statusError(422, "Page id is required for page export.");
  body.include = body.include && typeof body.include === "object" && !Array.isArray(body.include) ? body.include : {};
  return body;
}

async function importUploadedFiles(db, projectDir, files) {
  let count = 0;
  for (const file of files.sort((a, b) => sortByName(a.name, b.name))) {
    const ext = extOf(file.name);
    const buffer = Buffer.from(String(file.dataUrl).split(",")[1] || "", "base64");
    count += await importBuffer(db, projectDir, cleanName(file.name), buffer, ext);
  }
  return count;
}

async function importLocalPath(db, projectDir, sourcePath) {
  if (!fs.existsSync(sourcePath)) throw statusError(404, "Import path not found.");
  const stat = await fsp.stat(sourcePath);
  if (stat.isDirectory()) {
    const images = await walkFiles(sourcePath);
    let count = 0;
    for (const file of images.sort(sortByName)) count += await importFile(db, projectDir, file);
    return count;
  }
  return importFile(db, projectDir, sourcePath);
}

async function walkFiles(root) {
  const out = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else out.push(absolute);
    }
  }
  await walk(root);
  return out;
}

async function importFile(db, projectDir, filePath) {
  const ext = extOf(filePath);
  if (ext === ".pdf") throw statusError(422, "PDF import is planned next; images, folders, ZIP, and CBZ are supported now.");
  if (ext === ".cbr" || ext === ".rar") throw statusError(422, "CBR/RAR import needs an extractor dependency. Use CBZ/ZIP for this build.");
  if (ARCHIVE_EXTENSIONS.has(ext)) return importArchive(db, projectDir, await fsp.readFile(filePath), path.basename(filePath));
  if (!IMAGE_EXTENSIONS.has(ext)) return 0;
  return importImage(db, projectDir, path.basename(filePath), null, filePath, await fileHash(filePath));
}

async function importBuffer(db, projectDir, name, buffer, ext) {
  if (ext === ".pdf") throw statusError(422, "PDF import is planned next; images, folders, ZIP, and CBZ are supported now.");
  if (ext === ".cbr" || ext === ".rar") throw statusError(422, "CBR/RAR import needs an extractor dependency. Use CBZ/ZIP for this build.");
  if (ARCHIVE_EXTENSIONS.has(ext)) return importArchive(db, projectDir, buffer, name);
  if (!IMAGE_EXTENSIONS.has(ext)) return 0;
  return importImage(db, projectDir, name, buffer, null, bufferHash(buffer));
}

async function importArchive(db, projectDir, buffer, name) {
  const JSZip = optionalRequire("jszip");
  if (!JSZip) throw statusError(500, "ZIP support requires jszip.");
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && IMAGE_EXTENSIONS.has(extOf(entry.name)))
    .sort((a, b) => sortByName(a.name, b.name));
  let count = 0;
  for (const entry of entries) {
    const entryBuffer = await entry.async("nodebuffer");
    count += await importImage(db, projectDir, `${path.parse(name).name}-${cleanName(entry.name)}`, entryBuffer, null, bufferHash(entryBuffer));
  }
  return count;
}

async function fileHash(filePath) {
  const hash = crypto.createHash("sha1");
  await new Promise((resolve, reject) => {
    fs.createReadStream(filePath).on("data", (chunk) => hash.update(chunk)).on("error", reject).on("end", resolve);
  });
  return hash.digest("hex");
}

async function importImage(db, projectDir, name, buffer, sourcePath, contentHash = "") {
  if (contentHash && db.prepare("SELECT id FROM pages WHERE content_hash = ?").get(contentHash)) return 0;
  const next = db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM pages").get().next;
  const pageId = id("page");
  const base = `${String(next + 1).padStart(4, "0")}-${cleanName(name)}`;
  const originalRel = path.join("originals", base);
  const originalAbs = path.join(projectDir, originalRel);
  await ensureDir(path.dirname(originalAbs));
  if (buffer) await fsp.writeFile(originalAbs, buffer);
  else await fsp.copyFile(sourcePath, originalAbs);
  let pageRel = path.join("pages", base);
  let pageAbs = path.join(projectDir, pageRel);
  const ext = extOf(base);
  const sharp = optionalRequire("sharp");
  if (DISPLAY_EXTENSIONS.has(ext)) {
    await ensureDir(path.dirname(pageAbs));
    await fsp.copyFile(originalAbs, pageAbs);
  } else {
    if (!sharp) throw statusError(500, `Cannot convert ${ext || "image"} without sharp.`);
    pageRel = path.join("pages", `${path.parse(base).name}.png`);
    pageAbs = path.join(projectDir, pageRel);
    await sharp(originalAbs, { limitInputPixels: false }).rotate().png({ compressionLevel: 9 }).toFile(pageAbs);
  }
  const meta = await imageMetadata(pageAbs);
  db.prepare("INSERT INTO pages (id, file_name, original_path, workspace_path, content_hash, order_index, width, height, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(pageId, name, originalRel, pageRel, contentHash || null, next, meta.width, meta.height, nowIso());
  return 1;
}

async function imageMetadata(filePath) {
  const sharp = optionalRequire("sharp");
  if (sharp) {
    const meta = await sharp(filePath, { limitInputPixels: false }).metadata();
    return { width: meta.width || null, height: meta.height || null };
  }
  return { width: null, height: null };
}

async function createCrop(db, projectDir, body) {
  const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(body.pageId);
  if (!page) throw statusError(404, "Page not found.");
  const cropId = id("crop");
  const label = String(body.label || body.name || "S1");
  const type = body.type || labelType(label);
  const pageBase = path.parse(page.file_name).name;
  const rel = path.join("crops", pageBase, `${label}-${cropId}.png`);
  const rect = clampCropRect(body, page);
  await writeCropImage(projectDir, page, rel, rect);
  db.prepare(`
    INSERT INTO crops (id, page_id, label, type, name, workspace_path, x, y, width, height, queued, queue_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?)
  `).run(cropId, body.pageId, label, type, String(body.name || label), rel, rect.x, rect.y, rect.width, rect.height, nowIso());
  return db.prepare("SELECT * FROM crops WHERE id = ?").get(cropId);
}

async function updateCrop(db, projectDir, body) {
  const crop = db.prepare("SELECT * FROM crops WHERE id = ?").get(body.cropId);
  if (!crop) throw statusError(404, "Crop not found.");
  const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(crop.page_id);
  if (!page) throw statusError(404, "Page not found.");
  const next = {
    label: String(body.label ?? crop.label),
    name: String(body.name ?? crop.name ?? body.label ?? crop.label),
    type: body.type || labelType(body.label ?? crop.label),
    ...clampCropRect({
      x: body.x ?? crop.x,
      y: body.y ?? crop.y,
      width: body.width ?? crop.width,
      height: body.height ?? crop.height,
    }, page),
  };
  const rectChanged = ["x", "y", "width", "height"].some((key) => Number(next[key]) !== Number(crop[key]));
  if (rectChanged) await writeCropImage(projectDir, page, crop.workspace_path, next);
  db.prepare("UPDATE crops SET label = ?, type = ?, name = ?, x = ?, y = ?, width = ?, height = ? WHERE id = ?")
    .run(next.label, next.type, next.name, next.x, next.y, next.width, next.height, crop.id);
  return db.prepare("SELECT * FROM crops WHERE id = ?").get(crop.id);
}

function clampCropRect(rect, page) {
  const pageWidth = Number(page.width) || 1;
  const pageHeight = Number(page.height) || 1;
  const x = Math.max(0, Math.min(pageWidth - 1, Number(rect.x) || 0));
  const y = Math.max(0, Math.min(pageHeight - 1, Number(rect.y) || 0));
  const width = Math.max(1, Math.min(pageWidth - x, Number(rect.width) || 1));
  const height = Math.max(1, Math.min(pageHeight - y, Number(rect.height) || 1));
  return { x, y, width, height };
}

async function writeCropImage(projectDir, page, relativePath, rect) {
  const sharp = optionalRequire("sharp");
  if (!sharp) throw statusError(500, "Crop editing requires sharp.");
  const abs = safeProjectPath(projectDir, relativePath);
  await ensureDir(path.dirname(abs));
  await sharp(safeProjectPath(projectDir, page.workspace_path), { limitInputPixels: false })
    .extract({
      left: Math.round(rect.x),
      top: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    })
    .png({ compressionLevel: 9 })
    .toFile(abs);
}

function upsertScratchpad(db, body) {
  const entryId = body.id || id("entry");
  const existing = body.id ? db.prepare("SELECT * FROM scratchpad_entries WHERE id = ?").get(body.id) : null;
  if (existing) {
    db.prepare("UPDATE scratchpad_entries SET translation_entry_id = ?, label = ?, type = ?, source = ?, draft = ?, final = ?, notes = ?, confirmed = ?, updated_at = ? WHERE id = ?")
      .run(body.translationEntryId || existing.translation_entry_id || null, body.label || "", body.type || labelType(body.label), body.source || "", body.draft || "", body.final || "", body.notes || "", body.confirmed ? 1 : 0, nowIso(), body.id);
  } else {
    const next = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM scratchpad_entries WHERE page_id = ?").get(body.pageId).next;
    db.prepare("INSERT INTO scratchpad_entries (id, page_id, translation_entry_id, label, type, source, draft, final, notes, confirmed, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(entryId, body.pageId, body.translationEntryId || null, body.label || "", body.type || labelType(body.label), body.source || "", body.draft || "", body.final || "", body.notes || "", body.confirmed ? 1 : 0, next, nowIso(), nowIso());
  }
  return db.prepare("SELECT * FROM scratchpad_entries WHERE id = ?").get(entryId);
}

function labelType(label = "") {
  const up = label.toUpperCase();
  if (up.startsWith("SFX")) return "sfx";
  if (up.startsWith("N")) return "narration";
  return "speech";
}

function normalizeLineType(type = "", label = "") {
  const value = String(type || "").toLowerCase();
  if (["speech", "dialogue", "dialog", "spoken"].includes(value)) return "speech";
  if (["sfx", "sound effect", "sound_effect", "sound-effect", "onomatopoeia"].includes(value)) return "sfx";
  if (["narration", "narrative", "caption", "narrator"].includes(value)) return "narration";
  return labelType(label);
}

async function attachmentDataUrl(db, projectDir, attachment) {
  let row;
  if (attachment.type === "crop") row = db.prepare("SELECT workspace_path, label AS file_name FROM crops WHERE id = ?").get(attachment.id);
  else row = db.prepare("SELECT workspace_path, file_name FROM pages WHERE id = ?").get(attachment.id);
  if (!row) throw statusError(404, "Attachment not found.");
  const apiPath = await prepareApiImage(projectDir, safeProjectPath(projectDir, row.workspace_path));
  const ext = extOf(apiPath);
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/png";
  const data = await fsp.readFile(apiPath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

async function prepareApiImage(projectDir, absolutePath) {
  const stat = await fsp.stat(absolutePath);
  const ext = extOf(absolutePath);
  if (stat.size <= API_IMAGE_MAX_BYTES && DISPLAY_EXTENSIONS.has(ext)) return absolutePath;
  const sharp = optionalRequire("sharp");
  if (!sharp) return absolutePath;
  const cacheName = `${crypto.createHash("sha1").update(`${absolutePath}:${stat.mtimeMs}:${stat.size}`).digest("hex")}.jpg`;
  const cachePath = path.join(projectDir, "cache", "api-images", cacheName);
  if (fs.existsSync(cachePath)) return cachePath;
  const image = sharp(absolutePath, { limitInputPixels: false }).rotate();
  const meta = await image.metadata();
  const pipeline = (meta.width || 0) > 5200 ? image.resize({ width: 5200, withoutEnlargement: true }) : image;
  await pipeline.jpeg({ quality: 96, mozjpeg: true }).toFile(cachePath);
  return cachePath;
}

async function buildOpenRouterMessages(db, projectDir, settings, decisions, body, attachments, chatSessionId) {
  const sourceLanguage = body.sourceLanguage || settings.sourceLanguage || "Auto";
  const targetLanguage = body.targetLanguage || settings.targetLanguage || "English";
  const decisionsText = compactGuideContext(decisions);
  const prefix = [
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    decisionsText,
    attachments.length ? `Attached context in order: ${attachments.map((a, i) => `${i + 1}. ${a.type}:${a.name || a.id}`).join("; ")}` : "No image context attached.",
    "",
    body.message || "Analyze the attached manga image context.",
  ].join("\n");
  const history = db.prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 12").all(chatSessionId || "").reverse();
  const messages = [{ role: "system", content: settings.systemPrompt || DEFAULT_SYSTEM_PROMPT }];
  history.forEach((row) => {
    if (row.role === "user" || row.role === "assistant") messages.push({ role: row.role, content: row.content });
  });
  const content = [{ type: "text", text: prefix }];
  for (const attachment of attachments) content.push({ type: "image_url", image_url: { url: await attachmentDataUrl(db, projectDir, attachment) } });
  messages.push({ role: "user", content });
  return messages;
}

function compactGuideContext(decisions) {
  if (!decisions.length) return "Project Guide: no project-wide rules yet.";
  const grouped = new Map();
  decisions.slice(0, 24).forEach((row) => {
    const category = String(row.category || "Terms").slice(0, 40);
    const term = String(row.term || "Rule").slice(0, 60);
    const rule = String(row.rule || "").replace(/\s+/g, " ").trim().slice(0, 140);
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(`${term}: ${rule}`);
  });
  const lines = [];
  grouped.forEach((rules, category) => lines.push(`- ${category}: ${rules.join("; ")}`));
  const omitted = decisions.length > 24 ? `\n- Omitted: ${decisions.length - 24} additional lower-priority guide rules not included to keep context compact.` : "";
  return `Project Guide (compact, project-wide rules):\n${lines.join("\n")}${omitted}`;
}

async function callOpenRouterStream(apiKey, payload, onChunk, onReady = () => {}) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://${HOST}:${PORT}`,
      "X-Title": "MangaTranslator",
    },
    body: JSON.stringify({ ...payload, stream: true }),
  });
  if (!response.ok || !response.body) throw statusError(response.status, normalizeOpenRouterError(await response.text()));
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let opened = false;
  const open = () => {
    if (opened) return;
    onReady();
    opened = true;
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") return opened;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw statusError(parsed.error.code || 502, parsed.error.message || "OpenRouter stream failed.");
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          open();
          onChunk(content);
        }
      } catch (error) {
        if (error.status) throw error;
      }
    }
  }
  return opened;
}

function normalizeOpenRouterError(text) {
  try {
    const data = JSON.parse(text);
    return data.error?.message || data.message || text;
  } catch {
    return text || "OpenRouter request failed before streaming.";
  }
}

function parseTranslationPass(text) {
  const entries = [];
  let current = null;
  const push = () => {
    if (current && current.label) entries.push({
      label: current.label,
      type: normalizeLineType(current.type, current.label),
      source: current.source || "",
      draft: current.draft || "",
      notes: current.notes || "",
    });
  };
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (/^[-*_]{3,}$/.test(line) || /^#{1,6}\s*detailed/i.test(line) || /^\*\*Detailed/i.test(line)) break;
    const field = line.match(/^(?:[-*]\s*)?(?:\*\*)?(Label|Type|Source|Draft|Notes?)(?:\*\*)?\s*:\s*(.*)$/i);
    if (field) {
      const key = field[1].toLowerCase().replace(/^note$/, "notes");
      if (key === "label") { push(); current = { label: field[2].trim().toUpperCase() }; }
      else if (current) current[key] = field[2].trim();
    }
  }
  push();
  return entries;
}

function storeTranslationEntries(db, { pageId, chatSessionId, chatMessageId, model, entries }) {
  const crops = new Map(getCrops(db, pageId).map((crop) => [String(crop.label || "").toUpperCase(), crop.id]));
  const insert = db.prepare(`
    INSERT INTO translation_entries
      (id, page_id, chat_session_id, chat_message_id, scratchpad_entry_id, label, type, source, draft, final, notes, confidence, crop_ids_json, model, sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, ?, ?, ?, ?, '', ?, NULL, ?, ?, ?, ?, ?)
  `);
  const now = nowIso();
  entries.forEach((entry, index) => {
    const label = String(entry.label || "").toUpperCase();
    const cropId = crops.get(label);
    insert.run(
      id("translation"),
      pageId,
      chatSessionId || null,
      chatMessageId || null,
      label,
      normalizeLineType(entry.type, label),
      entry.source || "",
      entry.draft || "",
      entry.notes || "",
      JSON.stringify(cropId ? [cropId] : []),
      model || "",
      index,
      now,
      now,
    );
  });
}

function importTranslationEntriesToScratchpad(db, chatMessageId) {
  const entries = db.prepare("SELECT * FROM translation_entries WHERE chat_message_id = ? ORDER BY sort_order, label").all(chatMessageId);
  if (!entries.length) throw statusError(404, "No structured translation entries found for that response.");
  const existingLabels = new Set(db.prepare("SELECT label FROM scratchpad_entries WHERE page_id = ?").all(entries[0].page_id).map((row) => row.label));
  let imported = 0;
  const importOne = db.transaction(() => {
    for (const entry of entries) {
      if (entry.scratchpad_entry_id) continue;
      if (existingLabels.has(entry.label)) continue;
      const scratchpadId = id("entry");
      const next = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM scratchpad_entries WHERE page_id = ?").get(entry.page_id).next;
      db.prepare("INSERT INTO scratchpad_entries (id, page_id, translation_entry_id, label, type, source, draft, final, notes, confirmed, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, '', ?, 0, ?, ?, ?)")
        .run(scratchpadId, entry.page_id, entry.id, entry.label, entry.type, entry.source || "", entry.draft || "", entry.notes || "", next, nowIso(), nowIso());
      db.prepare("UPDATE translation_entries SET scratchpad_entry_id = ?, updated_at = ? WHERE id = ?").run(scratchpadId, nowIso(), entry.id);
      existingLabels.add(entry.label);
      imported += 1;
    }
  });
  importOne();
  return {
    imported,
    page: getPage(db, entries[0].page_id),
    scratchpad: getScratchpad(db, entries[0].page_id),
    messages: getSessionMessages(db, entries[0].chat_session_id),
  };
}

function unimportTranslationEntriesFromScratchpad(db, chatMessageId) {
  const entries = db.prepare("SELECT * FROM translation_entries WHERE chat_message_id = ? ORDER BY sort_order, label").all(chatMessageId);
  if (!entries.length) throw statusError(404, "No structured translation entries found for that response.");
  let removed = 0;
  const remove = db.transaction(() => {
    for (const entry of entries) {
      if (!entry.scratchpad_entry_id) continue;
      db.prepare("DELETE FROM scratchpad_entries WHERE id = ? AND translation_entry_id = ?").run(entry.scratchpad_entry_id, entry.id);
      db.prepare("UPDATE translation_entries SET scratchpad_entry_id = NULL, updated_at = ? WHERE id = ?").run(nowIso(), entry.id);
      removed += 1;
    }
  });
  remove();
  return {
    removed,
    page: getPage(db, entries[0].page_id),
    scratchpad: getScratchpad(db, entries[0].page_id),
    messages: getSessionMessages(db, entries[0].chat_session_id),
  };
}

async function exportMarkdown(db, projectDir, body) {
  const decisions = getDecisions(db);
  let markdown = "# MangaTranslator Export\n\n";
  const pages = body.scope === "page"
    ? db.prepare("SELECT * FROM pages WHERE id = ?").all(body.pageId)
    : getPages(db);
  for (const page of pages) {
    markdown += `## ${page.file_name}\n\n`;
    const rows = getScratchpad(db, page.id);
    for (const row of rows) {
      markdown += `### ${row.label} (${row.type || labelType(row.label)})\n\n`;
      if (body.include?.source !== false) markdown += `- Source: ${row.source || ""}\n`;
      if (body.include?.draft !== false) markdown += `- Draft: ${row.draft || ""}\n`;
      if (body.include?.final !== false) markdown += `- Final: ${row.final || ""}\n`;
      if (body.include?.notes !== false) markdown += `- Notes: ${row.notes || ""}\n`;
      markdown += "\n";
    }
    if (body.include?.boxes !== false) {
      const crops = getCrops(db, page.id);
      if (crops.length) {
        markdown += "Crop boxes:\n";
        crops.forEach((crop) => { markdown += `- ${crop.label}: x=${crop.x}, y=${crop.y}, w=${crop.width}, h=${crop.height}\n`; });
        markdown += "\n";
      }
    }
  }
  if (body.include?.decisions !== false && decisions.length) {
    markdown += "## Project Guide\n\n";
    decisions.forEach((d) => { markdown += `- ${d.category}: ${d.term} => ${d.rule}\n`; });
  }
  const file = body.scope === "page"
    ? path.join(projectDir, "exports", "pages", `${path.parse(pages[0]?.file_name || "page").name}.md`)
    : path.join(projectDir, "exports", "project.md");
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, markdown);
  return file;
}

async function exportJson(db, projectDir, body) {
  const pages = body.scope === "page"
    ? db.prepare("SELECT * FROM pages WHERE id = ?").all(body.pageId)
    : getPages(db);
  const pageIds = new Set(pages.map((page) => page.id));
  const data = {
    schema: "mangatranslator.translation.v1",
    exportedAt: nowIso(),
    pages: pages.map((page) => ({
      ...page,
      crops: body.include?.boxes === false ? undefined : getCrops(db, page.id),
      scratchpad: getScratchpad(db, page.id),
      translations: db.prepare("SELECT * FROM translation_entries WHERE page_id = ? ORDER BY sort_order, label").all(page.id).map((entry) => ({
        ...entry,
        crop_ids: JSON.parse(entry.crop_ids_json || "[]"),
        crop_ids_json: undefined,
      })),
    })),
    projectGuide: body.include?.decisions === false ? [] : getDecisions(db),
  };
  data.pages = data.pages.filter((page) => pageIds.has(page.id));
  const file = body.scope === "page"
    ? path.join(projectDir, "exports", "pages", `${path.parse(pages[0]?.file_name || "page").name}.json`)
    : path.join(projectDir, "exports", "project.json");
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, `${JSON.stringify(data, null, 2)}\n`);
  return file;
}

async function exportCsv(db, projectDir, body) {
  const pages = body.scope === "page"
    ? db.prepare("SELECT * FROM pages WHERE id = ?").all(body.pageId)
    : getPages(db);
  const rows = [["page", "label", "type", "source", "draft", "final", "confirmed", "notes", "translation_entry_id", "crop_ids"]];
  for (const page of pages) {
    for (const row of getScratchpad(db, page.id)) {
      const linked = row.translation_entry_id
        ? db.prepare("SELECT crop_ids_json FROM translation_entries WHERE id = ?").get(row.translation_entry_id)
        : null;
      rows.push([
        page.file_name,
        row.label,
        row.type || labelType(row.label),
        body.include?.source === false ? "" : row.source || "",
        body.include?.draft === false ? "" : row.draft || "",
        body.include?.final === false ? "" : row.final || "",
        row.confirmed ? "yes" : "no",
        body.include?.notes === false ? "" : row.notes || "",
        row.translation_entry_id || "",
        linked?.crop_ids_json || "[]",
      ]);
    }
  }
  const file = body.scope === "page"
    ? path.join(projectDir, "exports", "pages", `${path.parse(pages[0]?.file_name || "page").name}.csv`)
    : path.join(projectDir, "exports", "project.csv");
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, `${rows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`);
  return file;
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function fetchOpenRouterKeyInfo(apiKey) {
  const response = await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) return null;
  const data = await response.json();
  return data.data || data;
}

function fallbackModels() {
  return [
    { id: DEFAULT_MODEL, name: "Gemini 3.1 Pro", context_length: 1000000, architecture: { input_modalities: ["text", "image"] }, pricing: { prompt: "0.000002", completion: "0.000012" } },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", context_length: 1000000, architecture: { input_modalities: ["text", "image"] }, pricing: { prompt: "0.00000015", completion: "0.0000006" } },
  ];
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleApi(req, res, url);
    return serveStatic(req, res, url);
  } catch (error) {
    if (!res.headersSent) sendJson(res, { error: error.message || "Server error" }, error.status || 500);
    else res.end();
  }
});

async function serveStatic(_req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const file = path.resolve(DIST_DIR, `.${requested}`);
  const root = path.resolve(DIST_DIR);
  const target = file.startsWith(root) && fs.existsSync(file) && (await fsp.stat(file)).isFile() ? file : path.join(DIST_DIR, "index.html");
  if (!fs.existsSync(target)) {
    return sendText(res, "Build the frontend first with `npm run build`, or run `npm run dev` for Vite.", 503);
  }
  res.writeHead(200, { "Content-Type": MIME[extOf(target)] || "application/octet-stream" });
  fs.createReadStream(target).pipe(res);
}

server.listen(PORT, HOST, () => {
  const appUrl = `http://${HOST}:${PORT}`;
  console.log(`MangaTranslator running at ${appUrl}`);
  startOAuthBridge();
  if (!process.env.NO_OPEN) openBrowser(appUrl);
});

function startOAuthBridge() {
  if (PORT === OAUTH_PORT) return;
  const bridge = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname === "/api/auth/openrouter/callback") return await handleOpenRouterCallback(url, res);
      sendText(res, "MangaTranslator OpenRouter callback bridge is running.");
    } catch (error) {
      sendText(res, oauthHtml("OpenRouter Login Failed", error.message || "Unexpected OAuth error."), error.status || 500, "text/html; charset=utf-8");
    }
  });
  bridge.on("error", (error) => console.warn(`OpenRouter OAuth bridge could not listen on localhost:${OAUTH_PORT}: ${error.message}`));
  bridge.listen(OAUTH_PORT, "127.0.0.1", () => console.log(`OpenRouter OAuth callback bridge running at http://localhost:${OAUTH_PORT}`));
}

async function handleOpenRouterCallback(url, res) {
  const code = url.searchParams.get("code");
  const callbackError = url.searchParams.get("error");
  if (callbackError) return sendText(res, oauthHtml("OpenRouter Login Failed", `OpenRouter returned: ${callbackError}`), 400, "text/html; charset=utf-8");
  if (!code) return sendText(res, oauthHtml("OpenRouter Login Failed", "Missing authorization code."), 400, "text/html; charset=utf-8");
  const config = await getConfig();
  const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: config.oauth?.verifier, code_challenge_method: "S256" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.key) {
    config.lastAuthError = data?.error?.message || JSON.stringify(data) || "Could not exchange the auth code.";
    await saveConfig(config);
    return sendText(res, oauthHtml("OpenRouter Login Failed", config.lastAuthError), response.status || 400, "text/html; charset=utf-8");
  }
  config.openRouterKey = data.key;
  config.oauth = {};
  config.lastAuthError = "";
  await saveConfig(config);
  return sendText(res, oauthHtml("OpenRouter Connected", "Your OpenRouter account is connected. You can close this tab."), 200, "text/html; charset=utf-8");
}

function oauthHtml(title, message) {
  return `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title><style>body{font-family:system-ui;margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1012;color:#e6e8ec}main{width:min(560px,calc(100vw - 40px));background:#16181c;border:1px solid #262a31;border-radius:12px;padding:28px;box-shadow:0 18px 48px rgba(0,0,0,.55)}button{min-height:36px;border:0;border-radius:6px;background:#ff5a3c;color:white;padding:0 14px;font:inherit}</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><button onclick="window.close()">Close</button></main><script>setTimeout(()=>{try{window.close()}catch(e){}},1800)</script></body></html>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]));
}

function openBrowser(appUrl) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", appUrl] : [appUrl];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}
