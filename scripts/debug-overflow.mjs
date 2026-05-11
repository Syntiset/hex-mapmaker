import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme: "terminal" }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
});
await page.goto("http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);

const info = await page.evaluate(() => ({
  innerWidth: window.innerWidth,
  scrollWidth: document.documentElement.scrollWidth,
  bodyScrollWidth: document.body.scrollWidth,
  scrollLeft: window.scrollX,
  hasScroll: document.documentElement.scrollWidth > window.innerWidth,
  navbar: (() => {
    const el = document.querySelector(".mantine-AppShell-navbar");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, width: r.width, right: r.right };
  })(),
  main: (() => {
    const el = document.querySelector(".mantine-AppShell-main");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, width: r.width, right: r.right };
  })(),
}));
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: "tmp/debug-1920.png" });
await browser.close();
