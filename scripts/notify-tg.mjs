// Отправляет последний ответ ассистента в Telegram через бота.
// Использование (как Stop-хук Claude Code):
//   { "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": "node scripts/notify-tg.mjs" }] }] } }
//
// stdin — JSON payload Stop-хука (содержит transcript_path).
// .env.local в корне проекта: TG_BOT_TOKEN, TG_CHAT_ID, TG_SIGNATURE (опц.).

import https from "node:https";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const envPath = join(root, "..", ".env.local");

function loadEnv(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l && !l.startsWith("#") && l.includes("="))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

const env = loadEnv(envPath);
const token = env.TG_BOT_TOKEN || process.env.TG_BOT_TOKEN;
const chatId = env.TG_CHAT_ID || process.env.TG_CHAT_ID;
const signature = env.TG_SIGNATURE || process.env.TG_SIGNATURE || "";

if (!token || !chatId) {
  console.error("notify-tg: TG_BOT_TOKEN/TG_CHAT_ID не настроены");
  process.exit(0);
}

// Если ответ генерирует tg-claude-bridge — он сам отправит stdout в TG.
// Молчим, чтобы не было дубля.
if (process.env.TG_BRIDGE_ACTIVE !== "1") {
  process.exit(0);
}

let stdin = "";
for await (const chunk of process.stdin) stdin += chunk;

function lastAssistantTextFromTranscript(path) {
  try {
    const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      let obj;
      try {
        obj = JSON.parse(lines[i]);
      } catch {
        continue;
      }
      if (obj.type !== "assistant") continue;
      const c = obj.message?.content;
      if (typeof c === "string") return c;
      if (Array.isArray(c)) {
        const text = c
          .filter((p) => p?.type === "text" && typeof p.text === "string")
          .map((p) => p.text)
          .join("\n")
          .trim();
        if (text) return text;
      }
    }
  } catch {}
  return null;
}

let text = "";
try {
  const payload = JSON.parse(stdin);
  if (payload?.transcript_path) {
    text = lastAssistantTextFromTranscript(payload.transcript_path) || "";
  }
} catch {
  text = stdin;
}
if (!text.trim()) {
  process.exit(0);
}

text = text.trim().slice(0, 4000);
if (signature) text += `\n\n${signature}`;

const body = JSON.stringify({
  chat_id: chatId,
  text,
  disable_web_page_preview: true,
});

const req = https.request(
  {
    method: "POST",
    hostname: "api.telegram.org",
    path: `/bot${token}/sendMessage`,
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    },
  },
  (res) => {
    res.on("data", () => {});
    res.on("end", () => process.exit(0));
  },
);
req.on("error", (e) => {
  console.error("notify-tg error:", e.message);
  process.exit(0);
});
req.write(body);
req.end();
