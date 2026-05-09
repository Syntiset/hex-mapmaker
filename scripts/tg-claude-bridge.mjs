// TG ↔ Claude Code bridge.
// Слушает Telegram (long-polling getUpdates), на каждое сообщение запускает
// `claude -p "<msg>" --resume <session-id>` в корне проекта. Ответ отправляется
// обратно в TG. --resume с фиксированным session id = одна непрерывная сессия,
// контекст сохраняется между сообщениями.
//
// Запуск:
//   npm run tg-bridge
//   (или: node scripts/tg-claude-bridge.mjs)
//
// .env.local требует: TG_BOT_TOKEN, TG_CHAT_ID. Опц.: TG_CLAUDE_SESSION (session-id),
// TG_SIGNATURE (подпись внизу каждого ответа).

import https from "node:https";
import http from "node:http";
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, createWriteStream } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, extname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const envPath = join(root, ".env.local");

function loadEnv(p) {
  if (!existsSync(p)) return {};
  return Object.fromEntries(
    readFileSync(p, "utf8")
      .split("\n")
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = loadEnv(envPath);
const TOKEN = env.TG_BOT_TOKEN || process.env.TG_BOT_TOKEN;
const CHAT_ID = env.TG_CHAT_ID || process.env.TG_CHAT_ID;
const SESSION = env.TG_CLAUDE_SESSION || "tg-bridge-mapmaker";
const SIGNATURE = env.TG_SIGNATURE || "";

if (!TOKEN || !CHAT_ID) {
  console.error("✗ TG_BOT_TOKEN / TG_CHAT_ID не настроены в .env.local");
  process.exit(1);
}

const TMP_DIR = "C:\\Users\\mlg20\\Downloads\\tmp";
mkdirSync(TMP_DIR, { recursive: true });

const offsetPath = join(root, ".tg-bridge-offset.local");
const sessionMarkerPath = join(root, ".tg-bridge-session.local");
let offset = 0;
try {
  offset = parseInt(readFileSync(offsetPath, "utf8"), 10) || 0;
} catch {}
let sessionCreated = existsSync(sessionMarkerPath)
  ? readFileSync(sessionMarkerPath, "utf8").trim() === SESSION
  : false;

function tgCall(method, body, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        method: "POST",
        hostname: "api.telegram.org",
        path: `/bot${TOKEN}/${method}`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: timeoutMs,
      },
      (res) => {
        let buf = "";
        res.on("data", (c) => (buf += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(buf));
          } catch (e) {
            reject(e);
          }
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("tg timeout")));
    req.write(data);
    req.end();
  });
}

async function sendChunked(text) {
  const sig = SIGNATURE ? `\n\n${SIGNATURE}` : "";
  const max = 4000;
  if (!text) text = "(пусто)";
  // Если влезает целиком — одно сообщение
  if (text.length + sig.length <= max) {
    return tgCall("sendMessage", {
      chat_id: CHAT_ID,
      text: text + sig,
      disable_web_page_preview: true,
    }).catch((e) => console.error("send fail:", e.message));
  }
  // Разбиваем по 4000
  for (let i = 0; i < text.length; i += max) {
    const part = text.slice(i, i + max);
    const last = i + max >= text.length;
    await tgCall("sendMessage", {
      chat_id: CHAT_ID,
      text: part + (last ? sig : ""),
      disable_web_page_preview: true,
    }).catch((e) => console.error("send fail:", e.message));
  }
}

async function downloadTgFile(fileId) {
  const info = await tgCall("getFile", { file_id: fileId });
  if (!info?.ok) throw new Error("getFile failed");
  const filePath = info.result.file_path;
  const ext = extname(filePath) || ".bin";
  const localName = `tg_${fileId.slice(-8)}${ext}`;
  const localPath = join(TMP_DIR, localName);
  await new Promise((resolve, reject) => {
    const url = `https://api.telegram.org/file/bot${TOKEN}/${filePath}`;
    const proto = url.startsWith("https") ? https : http;
    const file = createWriteStream(localPath);
    proto.get(url, (res) => {
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", reject);
  });
  return localPath;
}

function askClaude(prompt) {
  return new Promise((resolve) => {
    // --session-id создаёт-или-резюмит сессию по UUID; --resume требует
    // существующую сессию и в print-mode иногда возвращает exit 1.
    // Первый раз --session-id <UUID> создаёт сессию. Дальше --resume <UUID>
    // её продолжает (--session-id даст "already in use").
    // Prompt передаём через stdin, не как arg. Иначе на Windows shell:true
    // разбивает многословный prompt по пробелам и claude видит только первое слово.
    const args = sessionCreated
      ? ["-p", "--dangerously-skip-permissions", "--resume", SESSION]
      : ["-p", "--dangerously-skip-permissions", "--session-id", SESSION];
    // На Windows нужен shell:true для запуска claude.cmd (Node 20+ EINVAL без него).
    // DeprecationWarning безобидна. stdin всё равно надо закрыть, иначе claude
    // ждёт ввод 3с и падает с "no stdin data received".
    // CLAUDE_CMD из .env.local — абсолютный путь до claude.cmd, нужен когда
     // мост запущен под LocalSystem (NSSM-сервис). По дефолту "claude" из PATH.
    const claudeBin = env.CLAUDE_CMD || process.env.CLAUDE_CMD || "claude";
    const child = spawn(claudeBin, args, {
      cwd: root,
      shell: process.platform === "win32",
      stdio: ["pipe", "pipe", "pipe"],
      // Флаг для notify-tg.mjs (Stop-хук) — пропустить отправку, чтобы
      // не было дубля: бридж сам шлёт stdout в TG.
      // Когда мост бежит как NSSM-сервис под LocalSystem, USERPROFILE указывает
      // на C:\Windows\System32\config\systemprofile — там нет ни логина claude,
      // ни наших сессий. Перенацеливаем на профиль реального пользователя.
      env: {
        ...process.env,
        TG_BRIDGE_ACTIVE: "1",
        ...(env.CLAUDE_USER_HOME
          ? {
              USERPROFILE: env.CLAUDE_USER_HOME,
              HOMEDRIVE: env.CLAUDE_USER_HOME.slice(0, 2),
              HOMEPATH: env.CLAUDE_USER_HOME.slice(2),
              APPDATA: `${env.CLAUDE_USER_HOME}\\AppData\\Roaming`,
              LOCALAPPDATA: `${env.CLAUDE_USER_HOME}\\AppData\\Local`,
            }
          : {}),
      },
    });
    child.stdin.write(prompt);
    child.stdin.end();
    let stdout = "";
    let stderr = "";
    // Шлём "думаю..." каждые 30 секунд пока claude не ответил
    const thinkingInterval = setInterval(() => {
      tgCall("sendChatAction", { chat_id: CHAT_ID, action: "typing" }).catch(() => {});
      tgCall("sendMessage", { chat_id: CHAT_ID, text: "⏳ думаю...", disable_web_page_preview: true }).catch(() => {});
    }, 30000);
    child.stdout.on("data", (c) => (stdout += c));
    child.stderr.on("data", (c) => (stderr += c));
    child.on("close", (code) => {
      clearInterval(thinkingInterval);
      if (code !== 0) {
        const errText = (stderr || stdout).slice(0, 1500);
        // 403 = DPAPI ещё не разблокирован (сервис стартовал до входа юзера).
        // Возвращаем специальный маркер — caller сделает retry.
        if (errText.includes("403") || errText.includes("forbidden")) {
          resolve("__RETRY_403__");
        } else {
          resolve(`⚠ claude exit ${code}\n${errText}`);
        }
      } else {
        // Успех — сессия точно есть, на следующих запросах используем --resume.
        if (!sessionCreated) {
          sessionCreated = true;
          try {
            writeFileSync(sessionMarkerPath, SESSION);
          } catch {}
        }
        resolve(stdout.trim() || "(пустой ответ)");
      }
    });
    child.on("error", (e) => { clearInterval(thinkingInterval); resolve(`⚠ spawn error: ${e.message}`); });
  });
}

async function loop() {
  console.log(`✓ TG bridge started. session=${SESSION}. polling…`);
  // Сдвигаем offset до последнего апдейта чтобы не досылать накопленные сообщения
  try {
    const fresh = await tgCall("getUpdates", { offset, timeout: 0 }, 5000);
    if (fresh?.ok && fresh.result.length > 0) {
      offset = fresh.result[fresh.result.length - 1].update_id + 1;
      writeFileSync(offsetPath, String(offset));
      console.log(`skipped ${fresh.result.length} queued updates`);
    }
  } catch {}
  // Уведомление о старте — в фоне, не блокирует polling
  (async () => {
    for (let i = 0; ; i++) {
      try {
        await tgCall("sendMessage", { chat_id: CHAT_ID, text: "✓ TG bridge запущен. Пиши, я слушаю.", disable_web_page_preview: true }, 8000);
        console.log("start notify sent OK");
        break;
      } catch (e) {
        console.log(`start notify attempt ${i + 1} failed: ${e.message}, retry in 15s`);
        await new Promise((r) => setTimeout(r, 15000));
      }
    }
  })();
  while (true) {
    try {
      const res = await tgCall("getUpdates", { offset, timeout: 25 }, 30000);
      if (res?.ok && Array.isArray(res.result)) {
        // Группируем медиа-альбомы по media_group_id
        const mediaGroups = new Map(); // group_id -> { msgs, caption }
        const orderedItems = []; // { type: 'msg'|'group', data }

        for (const upd of res.result) {
          offset = upd.update_id + 1;
          writeFileSync(offsetPath, String(offset));
          const msg = upd.message;
          if (!msg) continue;
          if (String(msg.chat?.id) !== String(CHAT_ID)) continue;

          if (msg.media_group_id && (msg.photo || msg.document)) {
            if (!mediaGroups.has(msg.media_group_id)) {
              mediaGroups.set(msg.media_group_id, { msgs: [], caption: msg.caption || "" });
              orderedItems.push({ type: "group", groupId: msg.media_group_id });
            }
            mediaGroups.get(msg.media_group_id).msgs.push(msg);
            if (msg.caption) mediaGroups.get(msg.media_group_id).caption = msg.caption;
          } else {
            orderedItems.push({ type: "msg", msg });
          }
        }

        for (const item of orderedItems) {
          let text = "";

          if (item.type === "group") {
            const group = mediaGroups.get(item.groupId);
            const paths = [];
            for (const msg of group.msgs) {
              try {
                const fileId = msg.photo
                  ? msg.photo[msg.photo.length - 1].file_id
                  : msg.document.file_id;
                const localPath = await downloadTgFile(fileId);
                paths.push(localPath);
              } catch (e) {
                await sendChunked(`⚠ Не удалось скачать файл из альбома: ${e.message}`);
              }
            }
            if (!paths.length) continue;
            const caption = group.caption ? `\n${group.caption}` : "";
            text = paths.map(p => `[файл сохранён: ${p}]`).join("\n") + caption;
          } else {
          const msg = item.msg;

          // Голосовое — транскрибируем через Whisper
          if (msg.voice) {
            const fileId = msg.voice.file_id;
            try {
              const localPath = await downloadTgFile(fileId);
              await sendChunked("🎙 Транскрибирую...");
              const transcript = await new Promise((resolve, reject) => {
                const pyBin = env.PYTHON_CMD || process.env.PYTHON_CMD || "C:\\Users\\mlg20\\AppData\\Local\\Programs\\Python\\Python312\\python.exe";
                const ffmpegDir = env.FFMPEG_DIR || "C:\\Users\\mlg20\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin";
                const py = spawn(
                  pyBin,
                  ["-c", `import whisper, sys; m=whisper.load_model("base"); r=m.transcribe(sys.argv[1], language="ru"); sys.stdout.buffer.write(r["text"].strip().encode("utf-8")); sys.stdout.buffer.flush()`, localPath],
                  { env: { ...process.env, PATH: `${ffmpegDir};${process.env.PATH || ""}`, PYTHONUTF8: "1" } }
                );
                py.stdout.setEncoding("utf8");
                let out = "", err = "";
                py.stdout.on("data", c => out += c);
                py.stderr.on("data", c => err += c);
                py.on("close", code => code === 0 ? resolve(out.trim()) : reject(new Error(err.slice(-500))));
              });
              text = `[голосовое]: ${transcript}`;
            } catch (e) {
              await sendChunked(`⚠ Не удалось транскрибировать: ${e.message}`);
              continue;
            }
          } else if (msg.photo) {
            const fileId = msg.photo[msg.photo.length - 1].file_id;
            try {
              const localPath = await downloadTgFile(fileId);
              const caption = msg.caption ? `\n${msg.caption}` : "";
              text = `[файл сохранён: ${localPath}]${caption}`;
            } catch (e) {
              await sendChunked(`⚠ Не удалось скачать фото: ${e.message}`);
              continue;
            }
          } else if (msg.document) {
            const fileId = msg.document.file_id;
            try {
              const localPath = await downloadTgFile(fileId);
              const caption = msg.caption ? `\n${msg.caption}` : "";
              text = `[файл сохранён: ${localPath}]${caption}`;
            } catch (e) {
              await sendChunked(`⚠ Не удалось скачать файл: ${e.message}`);
              continue;
            }
          } else if (msg.text) {
            text = msg.text.trim();
          } else {
            continue;
          }
          } // end else (single message)
          if (!text.trim()) continue;
          console.log(`[user] ${text.slice(0, 120)}`);
          // Минимальный ack — чтобы видно было что бот не лёг
          await tgCall("sendChatAction", {
            chat_id: CHAT_ID,
            action: "typing",
          }).catch(() => {});
          let reply = await askClaude(text);
          // Retry если DPAPI ещё не разблокирован (403 при старте до логина юзера)
          for (let attempt = 0; reply === "__RETRY_403__" && attempt < 10; attempt++) {
            console.log(`403 retry ${attempt + 1}/10 — жду 30s`);
            await new Promise((r) => setTimeout(r, 30000));
            reply = await askClaude(text);
          }
          if (reply === "__RETRY_403__") reply = "⚠ Не удалось аутентифицироваться после перезагрузки. Войди в систему и попробуй снова.";
          console.log(`[claude] ${reply.slice(0, 120)}`);
          await sendChunked(reply);
        }
      }
    } catch (e) {
      console.error("loop error:", e.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

loop();
