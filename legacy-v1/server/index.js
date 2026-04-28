const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const { URL } = require("node:url");
const { DatabaseSync } = require("node:sqlite");
const { spawn } = require("node:child_process");
const Module = require("node:module");

const PORT = Number(process.env.PORT || 3127);
const HOST = process.env.HOST || "127.0.0.1";
const OAUTH_PORT = Number(process.env.OPENROUTER_OAUTH_PORT || 3000);
const OAUTH_CALLBACK_HOST = process.env.OPENROUTER_OAUTH_HOST || "localhost";
const APP_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(APP_DIR, "public");
const APP_HOME = path.join(os.homedir(), ".manga-translation-tool");
const CONFIG_PATH = path.join(APP_HOME, "config.json");
const DEFAULT_WORKSPACE = path.join(os.homedir(), "MangaTranslationWorkspace");
const DEFAULT_MODEL = "google/gemini-3.1-pro-preview";
const API_IMAGE_MAX_BYTES = 18 * 1024 * 1024;
const CODEX_MODULES = path.join(
  os.homedir(),
  ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules",
);

Module.globalPaths.push(CODEX_MODULES);

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".tif", ".tiff"]);
const API_IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const MIME_TYPES = {
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

function optionalRequire(name) {
  try {
    return require(name);
  } catch (_error) {
    try {
      return require(path.join(CODEX_MODULES, name));
    } catch (_secondError) {
      return null;
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch (_error) {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fsp.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

async function getConfig() {
  return readJson(CONFIG_PATH, {
    workspacePath: "",
    openRouterKey: "",
    oauth: {},
  });
}

async function saveConfig(config) {
  await writeJson(CONFIG_PATH, config);
}

function openDb(workspacePath) {
  const dbPath = path.join(workspacePath, "project.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_path TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS crops (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_name TEXT NOT NULL,
      workspace_path TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      width REAL NOT NULL,
      height REAL NOT NULL,
      order_index INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      page_id TEXT,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      model TEXT,
      attachments_json TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scratchpad_entries (
      id TEXT PRIMARY KEY,
      page_id TEXT NOT NULL,
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
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  return db;
}

async function currentWorkspace({ required = true } = {}) {
  const config = await getConfig();
  if (!config.workspacePath) {
    if (required) throw statusError(409, "No workspace selected.");
    return "";
  }
  return config.workspacePath;
}

async function initWorkspace(workspacePath) {
  await ensureDir(workspacePath);
  await Promise.all([
    ensureDir(path.join(workspacePath, "originals")),
    ensureDir(path.join(workspacePath, "pages")),
    ensureDir(path.join(workspacePath, "crops")),
    ensureDir(path.join(workspacePath, "cache", "api-images")),
    ensureDir(path.join(workspacePath, "exports", "pages")),
  ]);
  const db = openDb(workspacePath);
  try {
    upsertSetting(db, "defaultModel", DEFAULT_MODEL);
    upsertSetting(db, "sourceLanguage", "Auto");
    upsertSetting(db, "targetLanguage", "English");
    upsertSetting(db, "systemPrompt", DEFAULT_SYSTEM_PROMPT);
  } finally {
    db.close();
  }
  const config = await getConfig();
  config.workspacePath = workspacePath;
  await saveConfig(config);
  return workspacePath;
}

function upsertSetting(db, key, value) {
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(key, value);
}

function getSettings(db) {
  const rows = db.prepare("SELECT key, value FROM settings").all();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function statusError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function sortByName(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

async function walkImages(root) {
  const out = [];
  async function walk(dir) {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
        out.push(absolute);
      }
    }
  }
  await walk(root);
  return out.sort(sortByName);
}

async function imageMetadata(filePath) {
  const sharp = optionalRequire("sharp");
  if (sharp) {
    try {
      const meta = await sharp(filePath).metadata();
      return { width: meta.width || null, height: meta.height || null };
    } catch (_error) {
      // Fall through to the pure-JS header parser.
    }
  }
  return imageMetadataFromHeader(filePath);
}

async function imageMetadataFromHeader(filePath) {
  const buffer = await fsp.readFile(filePath);
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length >= 10 && buffer.toString("ascii", 0, 3) === "GIF") {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    const vp8x = buffer.indexOf("VP8X");
    if (vp8x > -1 && buffer.length >= vp8x + 18) {
      return {
        width: 1 + buffer.readUIntLE(vp8x + 12, 3),
        height: 1 + buffer.readUIntLE(vp8x + 15, 3),
      };
    }
  }
  if (buffer.length > 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}

function relativeToWorkspace(workspacePath, absolutePath) {
  return path.relative(workspacePath, absolutePath).split(path.sep).join("/");
}

function safeWorkspacePath(workspacePath, relativePath) {
  const resolved = path.resolve(workspacePath, relativePath);
  const root = path.resolve(workspacePath);
  if (!resolved.startsWith(root)) throw statusError(403, "Path escapes workspace.");
  return resolved;
}

async function addPageFromFile(db, workspacePath, sourcePath, options = {}) {
  const fileName = options.fileName || path.basename(sourcePath);
  const pageId = id("page");
  const indexRow = db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS next_index FROM pages").get();
  let finalPath = sourcePath;
  if (options.copyToPages) {
    const safeName = `${String(indexRow.next_index + 1).padStart(4, "0")}-${sanitizeFileName(fileName)}`;
    finalPath = path.join(workspacePath, "pages", safeName);
    await fsp.copyFile(sourcePath, finalPath);
  }
  const meta = await imageMetadata(finalPath);
  db.prepare(`
    INSERT INTO pages (id, file_name, original_path, workspace_path, order_index, width, height, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    pageId,
    fileName,
    sourcePath,
    relativeToWorkspace(workspacePath, finalPath),
    indexRow.next_index,
    meta.width,
    meta.height,
    nowIso(),
  );
  return pageId;
}

function sanitizeFileName(name) {
  return name.replace(/[^\w.\-()[\] ]+/g, "_").replace(/\s+/g, " ").trim() || "image";
}

async function scanWorkspaceImages(workspacePath) {
  const db = openDb(workspacePath);
  try {
    const existing = new Set(db.prepare("SELECT original_path FROM pages").all().map((row) => row.original_path));
    const imagePaths = await walkImages(workspacePath);
    let imported = 0;
    for (const imagePath of imagePaths) {
      if (imagePath.includes(`${path.sep}cache${path.sep}`) || imagePath.includes(`${path.sep}crops${path.sep}`)) continue;
      if (path.basename(imagePath) === "project.sqlite") continue;
      if (existing.has(imagePath)) continue;
      await addPageFromFile(db, workspacePath, imagePath, { copyToPages: false });
      imported += 1;
    }
    return imported;
  } finally {
    db.close();
  }
}

function getPages(db) {
  return db.prepare("SELECT * FROM pages ORDER BY order_index, file_name").all();
}

function getCrops(db, pageId) {
  return db.prepare("SELECT * FROM crops WHERE page_id = ? ORDER BY order_index, created_at").all(pageId);
}

function getMessages(db, pageId) {
  return db.prepare("SELECT * FROM chat_messages WHERE page_id IS NULL OR page_id = ? ORDER BY created_at").all(pageId || "");
}

function getScratchpad(db, pageId) {
  return db.prepare("SELECT * FROM scratchpad_entries WHERE page_id = ? ORDER BY sort_order, label").all(pageId);
}

function removePageFromProject(db, pageId) {
  const page = db.prepare("SELECT id FROM pages WHERE id = ?").get(pageId);
  if (!page) throw statusError(404, "Page not found.");
  db.prepare("DELETE FROM crops WHERE page_id = ?").run(pageId);
  db.prepare("DELETE FROM chat_messages WHERE page_id = ?").run(pageId);
  db.prepare("DELETE FROM scratchpad_entries WHERE page_id = ?").run(pageId);
  db.prepare("DELETE FROM pages WHERE id = ?").run(pageId);
}

async function parseJson(req, maxBytes = 220 * 1024 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw statusError(413, "Request is too large.");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendText(res, body, status = 200, contentType = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/status") {
    const config = await getConfig();
    let pages = [];
    let settings = {};
    if (config.workspacePath && fs.existsSync(config.workspacePath)) {
      const db = openDb(config.workspacePath);
      try {
        pages = getPages(db);
        settings = getSettings(db);
      } finally {
        db.close();
      }
    }
    return sendJson(res, {
      workspacePath: config.workspacePath || "",
      hasOpenRouterKey: Boolean(config.openRouterKey),
      defaultWorkspace: DEFAULT_WORKSPACE,
      defaultModel: DEFAULT_MODEL,
      pages,
      settings,
    });
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/default") {
    const workspacePath = await initWorkspace(DEFAULT_WORKSPACE);
    return sendJson(res, { workspacePath, imported: await scanWorkspaceImages(workspacePath) });
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/open") {
    const body = await parseJson(req);
    if (!body.path) throw statusError(400, "Workspace path is required.");
    const workspacePath = path.resolve(expandHome(body.path));
    await initWorkspace(workspacePath);
    const imported = body.scan === false ? 0 : await scanWorkspaceImages(workspacePath);
    return sendJson(res, { workspacePath, imported });
  }

  if (req.method === "POST" && url.pathname === "/api/settings") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req);
    const db = openDb(workspacePath);
    try {
      for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") upsertSetting(db, key, value);
      }
      return sendJson(res, { settings: getSettings(db) });
    } finally {
      db.close();
    }
  }

  if (req.method === "GET" && url.pathname === "/api/prompt/default") {
    return sendJson(res, { systemPrompt: DEFAULT_SYSTEM_PROMPT });
  }

  if (req.method === "GET" && url.pathname === "/api/pages") {
    const workspacePath = await currentWorkspace();
    const db = openDb(workspacePath);
    try {
      return sendJson(res, { pages: getPages(db) });
    } finally {
      db.close();
    }
  }

  if (req.method === "GET" && url.pathname === "/api/page") {
    const workspacePath = await currentWorkspace();
    const pageId = url.searchParams.get("id");
    const db = openDb(workspacePath);
    try {
      const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
      if (!page) throw statusError(404, "Page not found.");
      return sendJson(res, {
        page,
        crops: getCrops(db, pageId),
        messages: getMessages(db, pageId),
        scratchpad: getScratchpad(db, pageId),
      });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/page/remove") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req, 1024 * 64);
    const db = openDb(workspacePath);
    try {
      removePageFromProject(db, body.pageId);
      return sendJson(res, { pages: getPages(db) });
    } finally {
      db.close();
    }
  }

  if (req.method === "GET" && url.pathname === "/api/file") {
    const workspacePath = await currentWorkspace();
    const relativePath = url.searchParams.get("path");
    if (!relativePath) throw statusError(400, "File path is required.");
    const absolute = safeWorkspacePath(workspacePath, relativePath);
    const ext = path.extname(absolute).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    return fs.createReadStream(absolute).pipe(res);
  }

  if (req.method === "POST" && url.pathname === "/api/import") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req);
    const files = Array.isArray(body.files) ? body.files : [];
    const db = openDb(workspacePath);
    try {
      let imported = 0;
      for (const file of files) {
        imported += await importUploadedFile(db, workspacePath, file);
      }
      return sendJson(res, { imported, pages: getPages(db) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/import/path") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req, 1024 * 64);
    if (!body.path) throw statusError(400, "Import path is required.");
    const sourcePath = path.resolve(expandHome(body.path));
    const db = openDb(workspacePath);
    try {
      const imported = await importLocalPath(db, workspacePath, sourcePath);
      return sendJson(res, { imported, pages: getPages(db) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/crops") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req);
    const db = openDb(workspacePath);
    try {
      const crop = await createCrop(db, workspacePath, body);
      return sendJson(res, { crop, crops: getCrops(db, body.pageId) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/crops/remove") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req, 1024 * 64);
    const db = openDb(workspacePath);
    try {
      const crop = db.prepare("SELECT page_id FROM crops WHERE id = ?").get(body.cropId);
      if (!crop) throw statusError(404, "Crop not found.");
      db.prepare("DELETE FROM crops WHERE id = ?").run(body.cropId);
      return sendJson(res, { crops: getCrops(db, crop.page_id) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/scratchpad") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req);
    const db = openDb(workspacePath);
    try {
      const entryId = body.id || id("entry");
      const existing = body.id
        ? db.prepare("SELECT id FROM scratchpad_entries WHERE id = ?").get(body.id)
        : null;
      if (existing) {
        db.prepare(`
          UPDATE scratchpad_entries
          SET label = ?, type = ?, source = ?, draft = ?, final = ?, notes = ?, updated_at = ?
          WHERE id = ?
        `).run(body.label, body.type, body.source, body.draft, body.final, body.notes, nowIso(), body.id);
      } else {
        const next = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_index FROM scratchpad_entries WHERE page_id = ?")
          .get(body.pageId);
        db.prepare(`
          INSERT INTO scratchpad_entries
          (id, page_id, label, type, source, draft, final, notes, sort_order, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(entryId, body.pageId, body.label, body.type, body.source, body.draft, body.final, body.notes, next.next_index, nowIso(), nowIso());
      }
      return sendJson(res, { scratchpad: getScratchpad(db, body.pageId) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/scratchpad/remove") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req, 1024 * 64);
    const db = openDb(workspacePath);
    try {
      const entry = db.prepare("SELECT page_id FROM scratchpad_entries WHERE id = ?").get(body.entryId);
      if (!entry) throw statusError(404, "Scratchpad entry not found.");
      db.prepare("DELETE FROM scratchpad_entries WHERE id = ?").run(body.entryId);
      return sendJson(res, { scratchpad: getScratchpad(db, entry.page_id) });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/auth/openrouter/key") {
    const body = await parseJson(req, 1024 * 64);
    const config = await getConfig();
    config.openRouterKey = String(body.key || "").trim();
    await saveConfig(config);
    return sendJson(res, { hasOpenRouterKey: Boolean(config.openRouterKey) });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/openrouter/start") {
    const verifier = crypto.randomBytes(48).toString("base64url");
    const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
    const config = await getConfig();
    config.oauth = { verifier, createdAt: nowIso() };
    await saveConfig(config);
    const callback = `http://${OAUTH_CALLBACK_HOST}:${OAUTH_PORT}/api/auth/openrouter/callback`;
    const authUrl = new URL("https://openrouter.ai/auth");
    authUrl.searchParams.set("callback_url", callback);
    authUrl.searchParams.set("code_challenge", challenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    return sendJson(res, { url: authUrl.toString() });
  }

  if (req.method === "GET" && url.pathname === "/api/auth/openrouter/callback") {
    return handleOpenRouterCallback(url, res);
  }

  if (req.method === "GET" && url.pathname === "/api/models") {
    const config = await getConfig();
    const headers = config.openRouterKey ? { Authorization: `Bearer ${config.openRouterKey}` } : {};
    const response = await fetch("https://openrouter.ai/api/v1/models", { headers });
    const data = await response.json();
    return sendJson(res, data, response.ok ? 200 : response.status);
  }

  if (req.method === "POST" && url.pathname === "/api/chat/stream") {
    return streamChat(req, res);
  }

  if (req.method === "POST" && url.pathname === "/api/export/page") {
    const workspacePath = await currentWorkspace();
    const body = await parseJson(req, 1024 * 64);
    const db = openDb(workspacePath);
    try {
      const file = await exportPageMarkdown(db, workspacePath, body.pageId);
      return sendJson(res, { file });
    } finally {
      db.close();
    }
  }

  if (req.method === "POST" && url.pathname === "/api/export/project") {
    const workspacePath = await currentWorkspace();
    const db = openDb(workspacePath);
    try {
      const file = await exportProjectMarkdown(db, workspacePath);
      return sendJson(res, { file });
    } finally {
      db.close();
    }
  }

  throw statusError(404, "API route not found.");
}

function expandHome(input) {
  if (input === "~") return os.homedir();
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

async function importUploadedFile(db, workspacePath, file) {
  if (!file?.name || !file?.dataUrl) return 0;
  const buffer = Buffer.from(String(file.dataUrl).split(",").pop(), "base64");
  const ext = path.extname(file.name).toLowerCase();
  if (ext === ".zip" || ext === ".cbz") {
    return importZipBuffer(db, workspacePath, buffer);
  }
  if (!IMAGE_EXTENSIONS.has(ext)) return 0;
  const target = path.join(workspacePath, "pages", `${Date.now()}-${sanitizeFileName(file.name)}`);
  await fsp.writeFile(target, buffer);
  await addPageFromFile(db, workspacePath, target, { copyToPages: false, fileName: file.name });
  return 1;
}

async function importLocalPath(db, workspacePath, sourcePath) {
  const stat = await fsp.stat(sourcePath).catch(() => null);
  if (!stat) throw statusError(404, "Import path was not found.");
  if (stat.isDirectory()) {
    const files = await walkImages(sourcePath);
    let imported = 0;
    for (const filePath of files) {
      const relativeName = path.relative(sourcePath, filePath).split(path.sep).join("-");
      await addPageFromFile(db, workspacePath, filePath, { copyToPages: true, fileName: relativeName });
      imported += 1;
    }
    return imported;
  }
  const ext = path.extname(sourcePath).toLowerCase();
  if (ext === ".zip" || ext === ".cbz") {
    return importZipBuffer(db, workspacePath, await fsp.readFile(sourcePath));
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    await addPageFromFile(db, workspacePath, sourcePath, { copyToPages: true, fileName: path.basename(sourcePath) });
    return 1;
  }
  throw statusError(400, "Import path must be an image, ZIP/CBZ, or folder of images.");
}

async function importZipBuffer(db, workspacePath, buffer) {
  const JSZip = optionalRequire("jszip");
  if (!JSZip) throw statusError(500, "ZIP support requires jszip.");
  const zip = await JSZip.loadAsync(buffer);
  let imported = 0;
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .sort((a, b) => sortByName(a.name, b.name));
  for (const entry of entries) {
    const data = await entry.async("nodebuffer");
    const target = path.join(workspacePath, "pages", `${String(imported + 1).padStart(4, "0")}-${sanitizeFileName(path.basename(entry.name))}`);
    await fsp.writeFile(target, data);
    await addPageFromFile(db, workspacePath, target, { copyToPages: false, fileName: path.basename(entry.name) });
    imported += 1;
  }
  return imported;
}

async function createCrop(db, workspacePath, body) {
  const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(body.pageId);
  if (!page) throw statusError(404, "Page not found.");
  const sharp = optionalRequire("sharp");
  const source = safeWorkspacePath(workspacePath, page.workspace_path);
  const cropId = id("crop");
  const cropDir = path.join(workspacePath, "crops", page.id);
  await ensureDir(cropDir);
  const orderRow = db.prepare("SELECT COALESCE(MAX(order_index), -1) + 1 AS next_index FROM crops WHERE page_id = ?").get(page.id);
  const name = String(body.name || `Crop ${orderRow.next_index + 1}`).trim();
  const fileName = `${String(orderRow.next_index + 1).padStart(3, "0")}-${sanitizeFileName(name)}.png`;
  const target = path.join(cropDir, fileName);
  const left = Math.max(0, Math.round(Number(body.x)));
  const top = Math.max(0, Math.round(Number(body.y)));
  const width = Math.max(1, Math.round(Number(body.width)));
  const height = Math.max(1, Math.round(Number(body.height)));
  if (sharp) {
    await sharp(source).extract({ left, top, width, height }).png({ compressionLevel: 0 }).toFile(target);
  } else {
    await cropWithPureJs(source, target, { left, top, width, height });
  }
  db.prepare(`
    INSERT INTO crops
    (id, page_id, name, file_name, workspace_path, x, y, width, height, order_index, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    cropId,
    page.id,
    name,
    fileName,
    relativeToWorkspace(workspacePath, target),
    left,
    top,
    width,
    height,
    orderRow.next_index,
    nowIso(),
  );
  return db.prepare("SELECT * FROM crops WHERE id = ?").get(cropId);
}

async function cropWithPureJs(source, target, rect) {
  const ext = path.extname(source).toLowerCase();
  const buffer = await fsp.readFile(source);
  const PNG = optionalRequire("pngjs")?.PNG;
  if (!PNG) throw statusError(500, "Crop support needs sharp or pngjs.");
  let decoded;
  if (ext === ".png") {
    decoded = PNG.sync.read(buffer);
  } else if (ext === ".jpg" || ext === ".jpeg") {
    const jpeg = optionalRequire("jpeg-js");
    if (!jpeg) throw statusError(500, "JPEG crop support needs sharp or jpeg-js.");
    decoded = jpeg.decode(buffer, { useTArray: true });
  } else {
    throw statusError(500, "Crop fallback currently supports PNG and JPEG. Install sharp for this format.");
  }
  const crop = new PNG({ width: rect.width, height: rect.height });
  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const sourceX = Math.min(decoded.width - 1, rect.left + x);
      const sourceY = Math.min(decoded.height - 1, rect.top + y);
      const sourceIndex = (decoded.width * sourceY + sourceX) << 2;
      const targetIndex = (rect.width * y + x) << 2;
      crop.data[targetIndex] = decoded.data[sourceIndex];
      crop.data[targetIndex + 1] = decoded.data[sourceIndex + 1];
      crop.data[targetIndex + 2] = decoded.data[sourceIndex + 2];
      crop.data[targetIndex + 3] = decoded.data[sourceIndex + 3] ?? 255;
    }
  }
  await fsp.writeFile(target, PNG.sync.write(crop));
}

async function streamChat(req, res) {
  const workspacePath = await currentWorkspace();
  const config = await getConfig();
  if (!config.openRouterKey) throw statusError(401, "Connect OpenRouter or add an API key first.");
  const body = await parseJson(req, 1024 * 1024);
  const db = openDb(workspacePath);
  let assistantText = "";
  let attachments = [];
  try {
    const settings = getSettings(db);
    const model = body.model || settings.defaultModel || DEFAULT_MODEL;
    const pageId = body.pageId || null;
    attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const userId = id("msg");
    db.prepare(`
      INSERT INTO chat_messages (id, page_id, role, content, model, attachments_json, created_at)
      VALUES (?, ?, 'user', ?, ?, ?, ?)
    `).run(userId, pageId, body.message || "", model, JSON.stringify(attachments), nowIso());

    const messages = await buildOpenRouterMessages(db, workspacePath, settings, body, attachments);
    res.writeHead(200, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    await callOpenRouterStream(config.openRouterKey, { model, messages }, (chunk) => {
      assistantText += chunk;
      res.write(chunk);
    });
    const assistantId = id("msg");
    db.prepare(`
      INSERT INTO chat_messages (id, page_id, role, content, model, attachments_json, created_at)
      VALUES (?, ?, 'assistant', ?, ?, '[]', ?)
    `).run(assistantId, pageId, assistantText, model, nowIso());
    const parsed = parseTranslationPass(assistantText);
    if (pageId && parsed.length) upsertScratchpadFromPass(db, pageId, parsed);
    res.end();
  } catch (error) {
    if (!res.headersSent) {
      sendJson(res, { error: error.message }, error.status || 500);
    } else {
      res.write(`\n\n[Error] ${error.message}`);
      res.end();
    }
  } finally {
    db.close();
  }
}

async function buildOpenRouterMessages(db, workspacePath, settings, body, attachments) {
  const sourceLanguage = body.sourceLanguage || settings.sourceLanguage || "Auto";
  const targetLanguage = body.targetLanguage || settings.targetLanguage || "English";
  const systemPrompt = body.systemPrompt || settings.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const prefix = [
    `Source language: ${sourceLanguage}`,
    `Target language: ${targetLanguage}`,
    attachments.length ? `Attached context: ${attachments.map((a, index) => `${index + 1}. ${a.type}:${a.name || a.id}`).join("; ")}` : "No image context attached.",
    "",
    body.message || "Analyze the attached manga image context.",
  ].join("\n");

  const historyRows = db.prepare(`
    SELECT role, content FROM chat_messages
    WHERE page_id IS NULL OR page_id = ?
    ORDER BY created_at DESC
    LIMIT 16
  `).all(body.pageId || "").reverse();

  const messages = [{ role: "system", content: systemPrompt }];
  for (const row of historyRows.slice(0, -1)) {
    messages.push({ role: row.role, content: row.content });
  }
  const content = [{ type: "text", text: prefix }];
  for (const attachment of attachments) {
    const dataUrl = await attachmentDataUrl(db, workspacePath, attachment);
    content.push({ type: "image_url", image_url: { url: dataUrl } });
  }
  messages.push({ role: "user", content });
  return messages;
}

async function attachmentDataUrl(db, workspacePath, attachment) {
  let row;
  if (attachment.type === "crop") {
    row = db.prepare("SELECT workspace_path, file_name FROM crops WHERE id = ?").get(attachment.id);
  } else {
    row = db.prepare("SELECT workspace_path, file_name FROM pages WHERE id = ?").get(attachment.id);
  }
  if (!row) throw statusError(404, "Attachment not found.");
  const absolute = safeWorkspacePath(workspacePath, row.workspace_path);
  const apiPath = await prepareApiImage(workspacePath, absolute);
  const ext = path.extname(apiPath).toLowerCase();
  const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/png";
  const data = await fsp.readFile(apiPath);
  return `data:${mime};base64,${data.toString("base64")}`;
}

async function prepareApiImage(workspacePath, absolutePath) {
  const stat = await fsp.stat(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  if (stat.size <= API_IMAGE_MAX_BYTES && API_IMAGE_EXTENSIONS.has(ext)) return absolutePath;
  const sharp = optionalRequire("sharp");
  if (!sharp) return absolutePath;
  const cacheName = `${crypto.createHash("sha1").update(`${absolutePath}:${stat.mtimeMs}:${stat.size}`).digest("hex")}.jpg`;
  const cachePath = path.join(workspacePath, "cache", "api-images", cacheName);
  if (fs.existsSync(cachePath)) return cachePath;
  const image = sharp(absolutePath, { limitInputPixels: false }).rotate();
  const meta = await image.metadata();
  const width = meta.width || 0;
  const pipeline = width > 5200 ? image.resize({ width: 5200, withoutEnlargement: true }) : image;
  await pipeline.jpeg({ quality: 96, mozjpeg: true }).toFile(cachePath);
  return cachePath;
}

async function callOpenRouterStream(apiKey, payload, onChunk) {
  const sdk = await loadOpenRouterSdk();
  if (sdk) {
    try {
      const OpenRouter = sdk.default || sdk.OpenRouter;
      const client = new OpenRouter({ apiKey });
      const chatRequest = {
        ...payload,
        messages: toSdkMessages(payload.messages),
        stream: true,
      };
      let stream;
      try {
        stream = await client.chat.send(chatRequest);
      } catch (_directError) {
        stream = await client.chat.send({
          httpReferer: `http://${HOST}:${PORT}`,
          appTitle: "Manga Translation Tool",
          chatRequest,
        });
      }
      for await (const chunk of stream) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      }
      return;
    } catch (error) {
      console.warn(`OpenRouter SDK stream failed; falling back to HTTP: ${error.message}`);
    }
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": `http://${HOST}:${PORT}`,
      "X-Title": "Manga Translation Tool",
    },
    body: JSON.stringify({ ...payload, stream: true }),
  });
  if (!response.ok || !response.body) {
    const text = await response.text();
    throw statusError(response.status, text || "OpenRouter request failed.");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
      if (data === "[DONE]") return;
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onChunk(content);
      } catch (_error) {
        // Ignore malformed keepalive chunks.
      }
    }
  }
}

async function loadOpenRouterSdk() {
  try {
    return await import("@openrouter/sdk");
  } catch (_error) {
    return null;
  }
}

function toSdkMessages(messages) {
  return messages.map((message) => {
    if (!Array.isArray(message.content)) return message;
    return {
      ...message,
      content: message.content.map((part) => {
        if (part.type !== "image_url") return part;
        return { type: "image_url", imageUrl: part.image_url };
      }),
    };
  });
}

function parseTranslationPass(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];
  let current = null;
  const push = () => {
    if (current?.label) entries.push(current);
  };
  for (const rawLine of lines) {
    const line = rawLine.trim().replace(/\*\*/g, "");
    if (/^(?:#{1,4}\s*)?Detailed Analysis/i.test(line) || /^[-*_]{3,}$/.test(line)) break;
    const explicitLabel = line.match(/^Label\s*:\s*(SFX\d+|S\d+|N\d+)/i);
    if (explicitLabel) {
      push();
      current = newTranslationEntry(explicitLabel[1]);
      continue;
    }
    const labelMatch = line.match(/^(?:[-*]\s*)?(SFX\d+|S\d+|N\d+)\s*:?\s*(.*)$/i);
    if (labelMatch) {
      push();
      current = newTranslationEntry(labelMatch[1]);
      if (labelMatch[2]) applyInlineTranslation(current, labelMatch[2]);
      continue;
    }
    if (!current) continue;
    const field = line.match(/^(Type|Source|Draft|Translation|Notes?)\s*:\s*(.*)$/i);
    if (field) {
      const rawKey = field[1].toLowerCase();
      const key = rawKey.startsWith("translation") ? "draft" : rawKey.startsWith("note") ? "notes" : rawKey;
      current[key] = field[2];
    } else if (line && current.notes) {
      current.notes += ` ${line}`;
    }
  }
  push();
  return entries;
}

function newTranslationEntry(label) {
  const normalized = label.toUpperCase();
  const type = normalized.startsWith("SFX") ? "sfx" : normalized.startsWith("N") ? "narration" : "speech";
  return { label: normalized, type, source: "", draft: "", notes: "" };
}

function applyInlineTranslation(entry, value) {
  const arrow = value.match(/^(.*?)\s*(?:->|=>|→)\s*(.*)$/);
  if (arrow) {
    entry.source = arrow[1].trim();
    entry.draft = arrow[2].replace(/^["“]|["”]$/g, "").trim();
    return;
  }
  entry.source = value.trim();
}

function upsertScratchpadFromPass(db, pageId, entries) {
  const existingRows = db.prepare("SELECT label FROM scratchpad_entries WHERE page_id = ?").all(pageId);
  const existing = new Set(existingRows.map((row) => row.label));
  let next = db.prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_index FROM scratchpad_entries WHERE page_id = ?").get(pageId).next_index;
  for (const entry of entries) {
    if (existing.has(entry.label)) continue;
    db.prepare(`
      INSERT INTO scratchpad_entries
      (id, page_id, label, type, source, draft, final, notes, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?)
    `).run(id("entry"), pageId, entry.label, entry.type, entry.source, entry.draft, entry.notes, next, nowIso(), nowIso());
    existing.add(entry.label);
    next += 1;
  }
}

async function exportPageMarkdown(db, workspacePath, pageId) {
  const page = db.prepare("SELECT * FROM pages WHERE id = ?").get(pageId);
  if (!page) throw statusError(404, "Page not found.");
  const entries = getScratchpad(db, pageId);
  const messages = db.prepare("SELECT role, content, created_at FROM chat_messages WHERE page_id = ? ORDER BY created_at").all(pageId);
  const md = renderPageMarkdown(page, entries, messages);
  const file = path.join(workspacePath, "exports", "pages", `${path.parse(page.file_name).name}.md`);
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, md);
  return file;
}

async function exportProjectMarkdown(db, workspacePath) {
  const pages = getPages(db);
  let md = "# Manga Translation Project\n\n";
  for (const page of pages) {
    const entries = getScratchpad(db, page.id);
    const messages = db.prepare("SELECT role, content, created_at FROM chat_messages WHERE page_id = ? ORDER BY created_at").all(page.id);
    md += `${renderPageMarkdown(page, entries, messages)}\n\n`;
  }
  const file = path.join(workspacePath, "exports", "project.md");
  await ensureDir(path.dirname(file));
  await fsp.writeFile(file, md);
  return file;
}

function renderPageMarkdown(page, entries, messages) {
  const rows = entries.map((entry) => `| ${escapeMd(entry.label)} | ${escapeMd(entry.type || "")} | ${escapeMd(entry.source || "")} | ${escapeMd(entry.draft || "")} | ${escapeMd(entry.final || "")} | ${escapeMd(entry.notes || "")} |`).join("\n");
  const chat = messages.map((message) => `### ${message.role} - ${message.created_at}\n\n${message.content}`).join("\n\n");
  return `## ${page.file_name}\n\n### Scratchpad\n\n| Label | Type | Source | Draft | Final | Notes |\n|---|---|---|---|---|---|\n${rows || "| | | | | | |"}\n\n### Chat Log\n\n${chat || "_No chat yet._"}\n`;
}

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

async function serveStatic(req, res, url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") pathname = "/index.html";
  const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!filePath.startsWith(PUBLIC_DIR)) throw statusError(403, "Forbidden.");
  if (!fs.existsSync(filePath) || (await fsp.stat(filePath)).isDirectory()) {
    const appPath = path.join(PUBLIC_DIR, "index.html");
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return fs.createReadStream(appPath).pipe(res);
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
  return fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
    } else {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    if (res.headersSent) {
      res.end();
      return;
    }
    sendJson(res, { error: error.message || "Unexpected error." }, error.status || 500);
  }
});

server.listen(PORT, HOST, () => {
  const appUrl = `http://${HOST}:${PORT}`;
  console.log(`Manga Translation Tool running at ${appUrl}`);
  startOAuthBridge();
  if (!process.env.NO_OPEN) openBrowser(appUrl);
});

function startOAuthBridge() {
  if (PORT === OAUTH_PORT) return;
  const bridge = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    try {
      if (url.pathname === "/api/auth/openrouter/callback") {
        await handleOpenRouterCallback(url, res);
      } else {
        sendText(res, "Manga Translation Tool OpenRouter callback bridge is running.");
      }
    } catch (error) {
      sendText(res, oauthHtml("OpenRouter Login Failed", error.message || "Unexpected OAuth error."), error.status || 500, "text/html; charset=utf-8");
    }
  });
  bridge.on("error", (error) => {
    console.warn(`OpenRouter OAuth bridge could not listen on localhost:${OAUTH_PORT}: ${error.message}`);
  });
  bridge.listen(OAUTH_PORT, "127.0.0.1", () => {
    console.log(`OpenRouter OAuth callback bridge running at http://${OAUTH_CALLBACK_HOST}:${OAUTH_PORT}`);
  });
}

async function handleOpenRouterCallback(url, res) {
  const code = url.searchParams.get("code");
  const callbackError = url.searchParams.get("error");
  if (callbackError) {
    return sendText(
      res,
      oauthHtml("OpenRouter Login Failed", `OpenRouter returned: ${callbackError}`),
      400,
      "text/html; charset=utf-8",
    );
  }
  if (!code) {
    return sendText(res, oauthHtml("OpenRouter Login Failed", "Missing authorization code."), 400, "text/html; charset=utf-8");
  }
  const config = await getConfig();
  const verifier = config.oauth?.verifier;
  const response = await fetch("https://openrouter.ai/api/v1/auth/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      code_verifier: verifier,
      code_challenge_method: "S256",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.key) {
    return sendText(
      res,
      oauthHtml("OpenRouter Login Failed", data?.error?.message || JSON.stringify(data) || "Could not exchange the auth code."),
      response.status || 400,
      "text/html; charset=utf-8",
    );
  }
  config.openRouterKey = data.key;
  config.oauth = {};
  await saveConfig(config);
  return sendText(res, oauthHtml("OpenRouter Connected", "Your OpenRouter account is connected. You can close this tab."), 200, "text/html; charset=utf-8");
}

function oauthHtml(title, message) {
  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)}</title>
<style>
body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8;color:#202124}
main{width:min(560px,calc(100vw - 40px));background:white;border:1px solid #dedfe3;border-radius:8px;padding:28px;box-shadow:0 18px 50px rgba(22,24,29,.14)}
h1{margin:0 0 10px;font-size:28px}p{line-height:1.5;color:#686b70}button{min-height:38px;border:1px solid #202124;border-radius:6px;background:#202124;color:white;padding:0 14px;font:inherit;cursor:pointer}
</style></head><body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><button onclick="window.close()">Close</button></main><script>setTimeout(()=>{try{window.close()}catch(e){}},1800)</script></body></html>`;
}

function openBrowser(appUrl) {
  const platform = process.platform;
  const command = platform === "darwin" ? "open" : platform === "win32" ? "cmd" : "xdg-open";
  const args = platform === "win32" ? ["/c", "start", appUrl] : [appUrl];
  const child = spawn(command, args, { stdio: "ignore", detached: true });
  child.on("error", () => {});
  child.unref();
}
