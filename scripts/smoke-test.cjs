const http = require("node:http");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const sharp = require("sharp");
const { LOCAL_PAGE, UPLOAD_PAGE_DATA_URL } = require("./fixtures/tiny-pages.cjs");

const base = process.env.MT_BASE_URL || "http://127.0.0.1:3127";

function request(path, { method = "GET", body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(`${base}${path}`, {
      method,
      headers: payload ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      } : undefined,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`${method} ${path} ${res.statusCode}: ${data}`));
        else resolve(data);
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function json(path, options) {
  const text = await request(path, options);
  return text ? JSON.parse(text) : {};
}

(async () => {
  const initial = await json("/api/status");
  const html = await request("/");
  const oldSlug = initial.activeProject?.slug || "";
  const workspaceRoot = initial.workspaceRoot || initial.defaultWorkspaceRoot;
  const projectName = `Smoke Test ${Date.now()}`;
  let smokeSlug = "";
  let tempDir = "";

  try {
    const setup = await json("/api/workspace/setup", {
      method: "POST",
      body: { workspaceRoot, projectName, importMode: "copy" },
    });
    smokeSlug = setup.project.slug;

    const imported = await json("/api/import/files", {
      method: "POST",
      body: {
        files: [{
          name: "001-smoke.png",
          dataUrl: UPLOAD_PAGE_DATA_URL,
        }],
      },
    });
    if (imported.imported !== 1 || !imported.pages?.length) throw new Error("Smoke import did not create one page.");
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mt-smoke-"));
    const localImagePath = path.join(tempDir, "002-local-path.png");
    await sharp({
      create: {
        width: LOCAL_PAGE.width,
        height: LOCAL_PAGE.height,
        channels: LOCAL_PAGE.channels,
        background: LOCAL_PAGE.background,
      },
    }).png().toFile(localImagePath);
    const localImport = await json("/api/import/path", {
      method: "POST",
      body: { path: localImagePath },
    });
    if (localImport.imported !== 1 || localImport.pages.length < 2) throw new Error("Smoke local-path import did not create a second page.");

    const page = await json(`/api/page?id=${encodeURIComponent(localImport.pages[0].id)}`);
    const chat = await json("/api/chat/session", {
      method: "POST",
      body: { pageId: page.page.id, title: "Smoke pass" },
    });
    if (!chat.activeChatSessionId) throw new Error("Smoke chat session was not created.");
    await json("/api/scratchpad", {
      method: "POST",
      body: {
        pageId: page.page.id,
        label: "S1",
        type: "speech",
        source: "source line",
        draft: "draft line",
        final: "final line",
        notes: "smoke test",
        confirmed: 1,
      },
    });
    const exported = await json("/api/export", {
      method: "POST",
      body: { scope: "page", pageId: page.page.id, format: "json", include: { source: true, draft: true, final: true, notes: true } },
    });
    if (!exported.file || !String(exported.file).endsWith(".json")) throw new Error("Smoke export did not return a JSON file.");

    console.log(JSON.stringify({
      ok: html.includes("MangaTranslator") || html.includes("Build the frontend"),
      project: setup.project.name,
      uploadedPages: imported.imported,
      localPathPages: localImport.imported,
      pageLoaded: Boolean(page.page?.id),
      chatSessionCreated: Boolean(chat.activeChatSessionId),
      scratchpadRoundTrip: true,
      exportFile: exported.file,
      hasOpenRouterKey: initial.hasOpenRouterKey,
    }, null, 2));
  } finally {
    if (smokeSlug) {
      await json("/api/projects/delete", { method: "POST", body: { slug: smokeSlug } }).catch(() => {});
    }
    if (oldSlug && oldSlug !== smokeSlug) {
      await json("/api/projects/open", { method: "POST", body: { slug: oldSlug } }).catch(() => {});
    }
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
