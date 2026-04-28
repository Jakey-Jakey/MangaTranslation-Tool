const http = require("node:http");

const base = "http://127.0.0.1:3127";

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${base}${path}`, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        if (res.statusCode >= 400) reject(new Error(`${res.statusCode}: ${data}`));
        else resolve(data);
      });
    });
    req.on("error", reject);
  });
}

(async () => {
  const status = JSON.parse(await request("/api/status"));
  const html = await request("/");
  console.log(JSON.stringify({
    ok: html.includes("MangaTranslator") || html.includes("Build the frontend"),
    workspaceRoot: status.workspaceRoot,
    activeProject: status.activeProject?.name || null,
    pages: status.pages?.length || 0,
    hasOpenRouterKey: status.hasOpenRouterKey,
  }, null, 2));
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
