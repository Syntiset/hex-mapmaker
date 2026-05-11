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

const info = await page.evaluate(() => {
  const main = document.querySelector(".mantine-AppShell-main");
  const mcs = main ? getComputedStyle(main) : null;
  const mr = main ? main.getBoundingClientRect() : null;
  const host = document.querySelector(".canvas-host");
  const cs = getComputedStyle(host);
  const r = host.getBoundingClientRect();
  return {
    main: main ? { position: mcs.position, inlineStyle: main.getAttribute("style"), rect: { left: mr.left, top: mr.top, width: mr.width, height: mr.height } } : null,
    classList: Array.from(host.classList),
    borderRadius: cs.borderRadius,
    overflow: cs.overflow,
    overflowX: cs.overflowX,
    overflowY: cs.overflowY,
    position: cs.position,
    inlineStyle: host.getAttribute("style"),
    rect: { left: r.left, top: r.top, width: r.width, height: r.height },
    children: Array.from(host.children).map(ch => {
      const ccs = getComputedStyle(ch);
      const cr = ch.getBoundingClientRect();
      return {
        tag: ch.tagName,
        className: ch.className,
        position: ccs.position,
        zIndex: ccs.zIndex,
        rect: { left: cr.left, top: cr.top, width: cr.width, height: cr.height },
      };
    }),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
