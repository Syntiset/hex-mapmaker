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

await page.evaluate(() => {
  const host = document.querySelector(".canvas-host");
  if (!host) return;
  const r = host.getBoundingClientRect();
  // Размер скругления = текущий border-radius
  const cs = getComputedStyle(host);
  const radius = parseFloat(cs.borderRadius) || 24;

  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:99999";

  const corners = [
    { x: r.left,  y: r.top,    label: "TL" },
    { x: r.right, y: r.top,    label: "TR" },
    { x: r.left,  y: r.bottom, label: "BL" },
    { x: r.right, y: r.bottom, label: "BR" },
  ];

  // Окружности диаметром = радиусу скругления, в углах канваса
  for (const c of corners) {
    const ring = document.createElement("div");
    const d = radius * 2 + 6;
    ring.style.cssText = `position:absolute;left:${c.x - d/2}px;top:${c.y - d/2}px;width:${d}px;height:${d}px;border:3px solid #ff3b3b;border-radius:50%;box-shadow:0 0 12px rgba(255,59,59,0.7)`;
    overlay.appendChild(ring);
  }

  // Подпись с радиусом
  const tag = document.createElement("div");
  tag.style.cssText = `position:absolute;left:${r.left + r.width/2 - 110}px;top:${r.top + 20}px;background:#ff3b3b;color:#fff;font:bold 16px monospace;padding:6px 12px;border-radius:4px;letter-spacing:1px`;
  tag.textContent = `border-radius: ${radius}px`;
  overlay.appendChild(tag);

  // Стрелки от подписи к углам (только TL и TR — поближе)
  const note = document.createElement("div");
  note.style.cssText = `position:absolute;left:${r.left + 80}px;top:${r.top + 80}px;background:#fff;color:#000;font:bold 14px monospace;padding:4px 8px;border:2px solid #ff3b3b`;
  note.textContent = "← скруглённый угол";
  overlay.appendChild(note);

  document.body.appendChild(overlay);
});

await page.screenshot({ path: "tmp/annotated-rounding.png" });
console.log("saved: tmp/annotated-rounding.png");
await browser.close();
