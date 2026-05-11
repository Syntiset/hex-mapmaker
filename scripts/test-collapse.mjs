import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme: "terminal" }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(800);

// Закрыть сайдбар через бургер
await page.click('[aria-label="Скрыть/показать панель"]');
await page.waitForTimeout(500);

const info = await page.evaluate(() => {
  const host = document.querySelector(".canvas-host");
  const r = host.getBoundingClientRect();
  const stage = host.querySelector("canvas");
  const sr = stage ? stage.getBoundingClientRect() : null;
  return {
    canvasHost: { left: r.left, top: r.top, width: r.width, height: r.height },
    konvaCanvas: sr ? { left: sr.left, top: sr.top, width: sr.width, height: sr.height } : null,
  };
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "tmp/collapse-fixed.png" });
await browser.close();
