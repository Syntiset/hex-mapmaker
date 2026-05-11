import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
await page.addInitScript(() => {
  localStorage.setItem("hex-mapmaker-theme", JSON.stringify({ state: { theme: "terminal" }, version: 0 }));
  sessionStorage.setItem("hex-mapmaker-boot-done", "1");
});
await page.goto(process.env.URL || "http://127.0.0.1:5173/", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
const opts = { path: process.argv[2] };
if (process.env.CLIP) {
  const [x,y,w,h] = process.env.CLIP.split(",").map(Number);
  opts.clip = { x, y, width: w, height: h };
}
await page.screenshot(opts);
console.log("saved:", process.argv[2]);
await browser.close();
