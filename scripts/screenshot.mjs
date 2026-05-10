import { chromium } from "playwright";

const URL = process.env.URL || "http://localhost:5176/";
const OUT = process.argv[2] || "tmp/screenshot.png";
const CLIP = process.env.CLIP; // "x,y,w,h"

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
page.on("console", (m) => { if (m.type() === "error") console.error("CONSOLE:", m.text()); });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(800);
const opts = { path: OUT, fullPage: false };
if (CLIP) {
  const [x, y, width, height] = CLIP.split(",").map(Number);
  opts.clip = { x, y, width, height };
}
await page.screenshot(opts);
console.log("saved:", OUT);
await browser.close();
