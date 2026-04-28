const { chromium } = require("playwright");

async function main() {
  const response = await fetch("http://127.0.0.1:3127/api/status");
  if (!response.ok) {
    throw new Error("Local server is not running at http://127.0.0.1:3127");
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("http://127.0.0.1:3127", { waitUntil: "networkidle" });
  await page.click("#settingsButton");
  const settingsVisible = await page.locator(".settings-modal").isVisible();
  await page.click("#resetPrompt");
  const promptHasText = (await page.locator("#settingsSystemPrompt").inputValue()).includes("manga translation assistant");
  await page.click("#closeSettings");

  const model = await page.locator("#modelSelect").inputValue();
  const status = await (await fetch("http://127.0.0.1:3127/api/status")).json();

  await browser.close();

  if (!settingsVisible) throw new Error("Settings modal did not open.");
  if (!promptHasText) throw new Error("Default prompt reset failed.");
  if (!model) throw new Error("No model selected.");
  if (errors.length) throw new Error(`Browser errors:\n${errors.join("\n")}`);

  console.log(JSON.stringify({
    ok: true,
    pages: status.pages.length,
    model,
    workspacePath: status.workspacePath,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
