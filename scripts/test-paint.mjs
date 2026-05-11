import { chromium } from "playwright";
const THEME = process.env.THEME || "default";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript((theme) => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
}, THEME);
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Кликнуть по центру канваса — поставит активный биом (Пустошь — песочный)
await page.mouse.click(700, 400);
await page.waitForTimeout(500);

await page.screenshot({ path: `tmp/paint-${THEME}.png` });
console.log("saved");
await browser.close();
