import { chromium } from "playwright";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme: "terminal" }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

// Сравним: вычислим в JS barrelForward для контрольных точек и сравним
// с тем что вернёт patched getPointerPosition (это патчит CRTOverlay).
const result = await page.evaluate(() => {
  const host = document.querySelector(".canvas-host");
  if (!host) return { error: "no host" };
  const rect = host.getBoundingClientRect();
  const w = rect.width, h = rect.height;

  const K = window.Konva;
  if (!K || !K.stages || !K.stages.length) return { error: "no Konva.stages", hasK: !!K };

  const stage = K.stages[0];

  const points = [
    { name: "center", x: w/2, y: h/2 },
    { name: "right-mid", x: w * 0.9, y: h * 0.5 },
    { name: "top-left", x: w * 0.1, y: h * 0.1 },
    { name: "bottom-right", x: w * 0.92, y: h * 0.92 },
  ];
  const barrel = 0.35;

  function expected(px, py) {
    const ux = px / w - 0.5;
    const uy = py / h - 0.5;
    const r2 = ux * ux + uy * uy;
    const f = barrel * r2;
    return { x: ((ux + ux * f) + 0.5) * w, y: ((uy + uy * f) + 0.5) * h };
  }

  const results = [];
  for (const p of points) {
    stage._pointerPositions = [{ x: p.x, y: p.y }];
    stage._changedPointerPositions = [{ x: p.x, y: p.y }];
    const got = stage.getPointerPosition();
    const exp = expected(p.x, p.y);
    results.push({
      name: p.name,
      input: { x: p.x.toFixed(1), y: p.y.toFixed(1) },
      patched_returned: got ? { x: got.x.toFixed(1), y: got.y.toFixed(1) } : null,
      expected: { x: exp.x.toFixed(1), y: exp.y.toFixed(1) },
      diff: got ? { dx: (got.x - exp.x).toFixed(2), dy: (got.y - exp.y).toFixed(2) } : null,
    });
  }
  return { canvas: { w, h }, results };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
