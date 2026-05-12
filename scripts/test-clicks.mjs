import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme: "terminal" }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

// Проверим что возвращает patched getPointerPosition при разных позициях
const result = await page.evaluate(() => {
  const stage = (window as any).__konva_stage_for_test;
  if (!stage) {
    // Достанем stage через DOM
    const cv = document.querySelectorAll(".canvas-host canvas")[0];
    return { error: "stage not exposed", canvases: document.querySelectorAll('.canvas-host canvas').length };
  }
  return { error: "ok" };
});
console.log("test", result);

// Pull stage size and use stage.getPointerPosition
const out = await page.evaluate(() => {
  // Stage container has class konvajs-content
  const containers = document.querySelectorAll(".konvajs-content");
  const out: any[] = [];
  out.push({ konvaContainers: containers.length });

  // Find canvas-host
  const host = document.querySelector(".canvas-host") as HTMLElement | null;
  if (host) {
    const r = host.getBoundingClientRect();
    out.push({ host: { x: r.x, y: r.y, w: r.width, h: r.height } });
  }
  return out;
});
console.log(JSON.stringify(out, null, 2));

await browser.close();
