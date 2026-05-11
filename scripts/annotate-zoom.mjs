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

const rect = await page.evaluate(() => {
  const host = document.querySelector(".canvas-host");
  const r = host.getBoundingClientRect();
  const cs = getComputedStyle(host);
  const radius = parseFloat(cs.borderRadius) || 24;
  // Поверх контейнера канваса рисуем большую красную круговую рамку,
  // совпадающую с радиусом скругления, на каждом из 4 углов.
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999";
  const corners = [
    { x: r.left,  y: r.top,    label: "TL" },
    { x: r.right, y: r.top,    label: "TR" },
    { x: r.left,  y: r.bottom, label: "BL" },
    { x: r.right, y: r.bottom, label: "BR" },
  ];
  for (const c of corners) {
    const ring = document.createElement("div");
    const d = radius * 2 + 10;
    ring.style.cssText = `position:absolute;left:${c.x - d/2}px;top:${c.y - d/2}px;width:${d}px;height:${d}px;border:4px solid #ff3b3b;border-radius:50%;box-shadow:0 0 16px rgba(255,59,59,0.8)`;
    overlay.appendChild(ring);
  }
  const tag = document.createElement("div");
  tag.style.cssText = `position:absolute;left:${r.left + 110}px;top:${r.top + 90}px;background:#ff3b3b;color:#fff;font:bold 18px monospace;padding:8px 14px;border-radius:4px;letter-spacing:1px;box-shadow:0 4px 16px rgba(0,0,0,0.7)`;
  tag.textContent = `border-radius: ${radius}px`;
  overlay.appendChild(tag);
  document.body.appendChild(overlay);
  return { x: r.left, y: r.top, w: 360, h: 280 };
});

// Полный кадр
await page.screenshot({ path: "tmp/round-full.png" });
// И зум на TL угол
await page.screenshot({ path: "tmp/round-tl.png", clip: { x: rect.x - 20, y: rect.y - 20, width: rect.w, height: rect.h } });
console.log("saved: tmp/round-full.png + tmp/round-tl.png");
await browser.close();
