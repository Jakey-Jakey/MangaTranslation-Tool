const childProcess = require("node:child_process");
const fs = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const sharp = require("sharp");
const { UI_FLOW_PAGE } = require("./fixtures/tiny-pages.cjs");

const base = process.env.MT_BASE_URL || "http://127.0.0.1:3127";

function request(pathname, { method = "GET", body } = {}) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : JSON.stringify(body);
    const req = http.request(`${base}${pathname}`, {
      method,
      headers: payload ? {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      } : undefined,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`${method} ${pathname} ${res.statusCode}: ${data}`));
        else resolve(data ? JSON.parse(data) : {});
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitForServer(timeoutMs = 20000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      return await request("/api/status");
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  throw new Error("Server did not respond in time.");
}

async function launchBrowser() {
  const attempts = [
    {},
    { channel: "msedge" },
    { channel: "chrome" },
  ];
  let lastError = null;
  for (const options of attempts) {
    try {
      return await chromium.launch({ headless: true, ...options });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

(async () => {
  let server = null;
  let status;
  try {
    status = await request("/api/status");
  } catch {
    server = childProcess.spawn(process.execPath, ["--no-warnings", "server/index.cjs"], {
      cwd: path.join(__dirname, ".."),
      stdio: "ignore",
      windowsHide: true,
    });
    status = await waitForServer();
  }

  const oldSlug = status.activeProject?.slug || "";
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "mt-ui-flow-"));
  const projectName = `Playwright Flow ${Date.now()}`;
  const setup = await request("/api/workspace/setup", {
    method: "POST",
    body: { workspaceRoot: status.workspaceRoot || status.defaultWorkspaceRoot, projectName, importMode: "copy" },
  });

  const imagePath = path.join(tempDir, "001-ui-flow.png");
  await sharp({ create: UI_FLOW_PAGE }).png().composite([{
    input: Buffer.from(`<svg width="${UI_FLOW_PAGE.width}" height="${UI_FLOW_PAGE.height}"><rect x="54" y="58" width="132" height="54" rx="24" fill="white" stroke="#222" stroke-width="3"/><rect x="72" y="76" width="96" height="8" fill="#333"/><rect x="76" y="92" width="72" height="8" fill="#555"/></svg>`),
    top: 0,
    left: 0,
  }]).toFile(imagePath);

  let browser = null;
  let page = null;

  try {
    browser = await launchBrowser();
    page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
    await page.goto(base);
    await page.getByText(projectName).waitFor({ state: "visible", timeout: 15000 });
    await page.locator("input[type='file']").first().setInputFiles(imagePath);
    await page.locator(".page-thumb").first().waitFor({ state: "visible", timeout: 15000 });
    await page.locator(".image-stage").waitFor({ state: "visible", timeout: 15000 });

    const stage = await page.locator(".image-stage").boundingBox();
    if (!stage) throw new Error("Image stage was not visible.");
    await page.mouse.move(stage.x + stage.width * 0.3, stage.y + stage.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(stage.x + stage.width * 0.78, stage.y + stage.height * 0.52);
    await page.mouse.up();
    await page.locator(".crop-box").first().waitFor({ state: "visible", timeout: 10000 });

    await page.getByRole("button", { name: "Line", exact: true }).click();
    await page.locator(".entry-editor textarea").first().fill("UI flow source");
    await page.locator(".entry-editor textarea").nth(1).fill("UI flow draft");
    await page.waitForTimeout(1200);
    await page.getByRole("button", { name: "New chat pass" }).click();
    await page.getByRole("button", { name: "Open export" }).click();
    await page.getByRole("button", { name: "JSON" }).click();
    await page.getByRole("button", { name: "Export", exact: true }).click();
    await page.locator(".toast").waitFor({ state: "visible", timeout: 10000 });

    console.log(JSON.stringify({
      ok: true,
      project: setup.project.name,
      importedThroughBrowser: true,
      cropCreated: await page.locator(".crop-box").count(),
      scratchpadEdited: true,
      chatPassCreated: true,
      exportTriggered: true,
    }, null, 2));
  } finally {
    if (browser) await browser.close().catch(() => {});
    await request("/api/projects/delete", { method: "POST", body: { slug: setup.project.slug } }).catch(() => {});
    if (oldSlug && oldSlug !== setup.project.slug) {
      await request("/api/projects/open", { method: "POST", body: { slug: oldSlug } }).catch(() => {});
    }
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    if (server) server.kill();
  }
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
