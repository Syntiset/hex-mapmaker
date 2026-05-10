import { chromium } from "playwright";

const URL = process.env.URL || "http://127.0.0.1:5173/";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const info = await page.evaluate(() => {
  const main = document.querySelector(".mantine-AppShell-main");
  const footer = document.querySelector(".mantine-AppShell-footer");
  const host = document.querySelector(".canvas-host");
  const dump = (el, name) => {
    if (!el) return { name, missing: true };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      name,
      rect: { top: r.top, bottom: r.bottom, height: r.height },
      padding: { top: cs.paddingTop, bottom: cs.paddingBottom },
      position: cs.position,
      zIndex: cs.zIndex,
    };
  };
  return [dump(main, "main"), dump(footer, "footer"), dump(host, "canvas-host")];
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
