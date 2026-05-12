import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas-pro";
import type { ThemeDecorations, SidebarShellProps } from "./types";
import { buildBezelClipPath } from "../render/barrelPath";
import { compositeRegistry } from "../render/compositeRegistry";
import { TerminalSidebarContent } from "./TerminalSidebarContent";

/**
 * Полноэкранный overlay поверх канваса:
 * — мерцающий CRT-flicker (анимированная opacity)
 * — горизонтальный sweep-блик
 * — декорации корпуса (bezel): 4 винта в углах + маркировка ROBCO
 *   рендерятся в чёрной зоне за пределами кривого экрана.
 */
function TerminalScreenOverlay() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  // Сила бочки — должна совпадать с дефолтным barrel в CRTOverlay
  const barrel = 0.35;

  useEffect(() => {
    // Привязываемся к canvas-host чтобы знать его реальный размер для clip-path
    const host = document.querySelector(".canvas-host") as HTMLElement | null;
    if (!host) return;
    const update = () => {
      const r = host.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // SVG path — внешний прямоугольник + внутренняя barrel-curve.
  // С fill-rule:evenodd на CSS clip-path рамка видна только в зоне «корпуса»,
  // экран в центре остаётся прозрачным.
  const clipPath = useMemo(() => {
    if (size.w <= 0 || size.h <= 0) return undefined;
    return `path(evenodd, '${buildBezelClipPath(barrel, size.w, size.h)}')`;
  }, [barrel, size.w, size.h]);

  return (
    <div className="terminal-screen-overlay">
      {/* Зона экрана — overflow:hidden, чтобы flicker/sweep НЕ вылезали на корпус */}
      <div className="terminal-screen-area">
        <div className="terminal-flicker" />
        <div className="terminal-sweep" />
      </div>
      {/* DOM-bezel: заливка по периметру, форма выреза задаётся clip-path по barrel-curve */}
      <div
        className="terminal-bezel-frame"
        aria-hidden
        style={clipPath ? { clipPath, WebkitClipPath: clipPath } : undefined}
      />
      {/* Декорации (винты + гравировка) — отдельный слой, без clip */}
      <div className="terminal-bezel" aria-hidden>
        <span className="terminal-bezel-screw tl" />
        <span className="terminal-bezel-screw tr" />
        <span className="terminal-bezel-screw bl" />
        <span className="terminal-bezel-screw br" />
        <div className="terminal-bezel-brand">ROBCO INDUSTRIES</div>
        <div className="terminal-bezel-model">MODEL: TERMLINK-30</div>
      </div>
    </div>
  );
}

/** Янтарный POWER-индикатор: маленькая лампа в металлическом утопленном
 *  кольце-bezel'е, как на реальном корпусе RobCo. */
function TerminalPowerLED() {
  return (
    <div className="terminal-power">
      <div className="terminal-power-bezel" aria-hidden>
        <div className="terminal-power-led" />
      </div>
      <span className="terminal-power-label">POWER</span>
    </div>
  );
}

/**
 * Поношенная жёлтая наклейка «UNIFIED OPERATING SYSTEM / RobCo Industries»
 * с подделанным штрих-кодом и серийником, прилипшая к корпусу справа-снизу
 * на сайдбаре. Слегка повёрнута для убедительности.
 */
function TerminalRobcoSticker() {
  return (
    <div className="terminal-sticker" aria-hidden>
      <div className="terminal-sticker-line1">UNIFIED OPERATING SYSTEM</div>
      <div className="terminal-sticker-line2">RobCo&nbsp;Industries</div>
      <div className="terminal-sticker-line3">SN: RC-2077-A04</div>
      <div className="terminal-sticker-barcode">
        {Array.from({ length: 28 }).map((_, i) => (
          <span key={i} style={{ width: 1 + (i * 37) % 3 }} />
        ))}
      </div>
    </div>
  );
}

/**
 * Boot-последовательность RobCo. Показывается один раз за сессию:
 * пишет фосфорный текст «> ROBCO INDUSTRIES (TM) — INITIALIZING...» построчно,
 * затем плавно гасит overlay. Можно пропустить кликом.
 */
function TerminalBootSequence() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("hex-mapmaker-boot-done");
  });
  const [lineIdx, setLineIdx] = useState(0);
  const lines = [
    "> ROBCO INDUSTRIES UNIFIED OPERATING SYSTEM",
    "> COPYRIGHT 2075-2077 ROBCO INDUSTRIES",
    "> -Server 5-",
    "",
    "> EXEC < HEX_MAPMAKER.TERM >",
    "> LOADING TILE BIOMES ... [ OK ]",
    "> LOADING ROAD ATLAS ..... [ OK ]",
    "> CONNECTING WASTELAND DB. [ OK ]",
    "",
    "> READY.",
  ];

  useEffect(() => {
    if (!visible) return;
    if (lineIdx >= lines.length) {
      const t = setTimeout(() => {
        sessionStorage.setItem("hex-mapmaker-boot-done", "1");
        setVisible(false);
      }, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLineIdx((i) => i + 1), 110);
    return () => clearTimeout(t);
  }, [lineIdx, visible, lines.length]);

  function dismiss() {
    sessionStorage.setItem("hex-mapmaker-boot-done", "1");
    setVisible(false);
  }

  if (!visible) return null;
  return (
    <div className="terminal-boot" onClick={dismiss}>
      <div className="terminal-boot-screen">
        {lines.slice(0, lineIdx).map((l, i) => (
          <div key={i} className="terminal-boot-line">{l || " "}</div>
        ))}
        <div className="terminal-boot-cursor" />
      </div>
      <div className="terminal-boot-hint">[click to skip]</div>
    </div>
  );
}

/**
 * Сайдбар внутри CRT-экрана. DOM сидит ПОД WebGL-канвасом (z:2 vs z:3) —
 * WebGL рисует поверх. Параллельно держим offscreen-канвас размера
 * canvas-host, в который html2canvas периодически снимает живой DOM
 * сайдбара. Offscreen зарегистрирован в compositeRegistry — CRTOverlay
 * подмешивает его в композит-текстуру каждый кадр, после чего шейдер
 * применяет к нему ту же бочку/хроматику/сканлайны что и к карте.
 *
 * Клики проваливаются сквозь pointer-events:none WebGL-канвас на DOM-сайдбар
 * под ним (DOM хоть и невидим визуально, но receives events).
 */
function TerminalSidebarShell({ open, children }: SidebarShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const offRef = useRef<HTMLCanvasElement>(null);
  const snapCache = useRef<HTMLCanvasElement | null>(null);
  const snapTimer = useRef<number | null>(null);
  const snapInFlight = useRef(false);

  // Размер canvas-host для offscreen-канваса
  useEffect(() => {
    const host = document.querySelector(".canvas-host") as HTMLElement | null;
    const off = offRef.current;
    if (!host || !off) return;
    const update = () => {
      const r = host.getBoundingClientRect();
      if (off.width !== Math.round(r.width)) off.width = Math.round(r.width);
      if (off.height !== Math.round(r.height)) off.height = Math.round(r.height);
      scheduleSnapshot();
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  // Регистрация offscreen в композит-цепочке
  useEffect(() => {
    const off = offRef.current;
    if (!off) return;
    compositeRegistry.add(off);
    return () => { compositeRegistry.remove(off); };
  }, []);

  // Отрисовка кэшированного снапшота в offscreen по текущему DOM-положению panel.
  function redrawOffscreen() {
    const off = offRef.current;
    const snap = snapCache.current;
    const panel = panelRef.current;
    if (!off || !snap || !panel) return;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    const host = panel.closest(".canvas-host") as HTMLElement | null;
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    ctx.clearRect(0, 0, off.width, off.height);
    ctx.drawImage(
      snap,
      Math.round(panelRect.left - hostRect.left),
      Math.round(panelRect.top - hostRect.top),
      Math.round(panelRect.width),
      Math.round(panelRect.height),
    );
  }

  async function takeSnapshot() {
    if (snapInFlight.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    snapInFlight.current = true;
    try {
      // scale: 2 — снапшот в двойном разрешении. После drawImage в
       // offscreen (CSS-pixel size) браузер даунсемплит с антиалиасом,
       // даёт более чёткий текст после прохождения через шейдер.
      const snap = await html2canvas(panel, {
        backgroundColor: null,
        logging: false,
        scale: 2,
      });
      snapCache.current = snap;
      redrawOffscreen();
    } catch (err) {
      console.warn("[TerminalSidebarShell] snapshot failed", err);
    } finally {
      snapInFlight.current = false;
    }
  }

  function scheduleSnapshot() {
    if (snapTimer.current != null) window.clearTimeout(snapTimer.current);
    snapTimer.current = window.setTimeout(() => { void takeSnapshot(); }, 60);
  }

  // Mutation observer — пересъёмка при изменениях DOM (выбор тайла, активный
  // инструмент, hover-эффекты на кнопках и т.д.)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const mo = new MutationObserver(scheduleSnapshot);
    mo.observe(panel, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return () => mo.disconnect();
  }, []);

  // Анимация slide-in: пока CSS-transition двигает .terminal-sidebar-panel,
  // requestAnimationFrame перерисовывает offscreen с кэшированным snapshot'ом
  // по новой DOM-позиции. Бочка применяется WebGL'ом — анимация выглядит
  // искажённой по той же curve что и весь экран.
  useEffect(() => {
    let raf = 0;
    let frames = 0;
    const maxFrames = 30; // ~500ms при 60fps
    const loop = () => {
      redrawOffscreen();
      frames++;
      if (frames < maxFrames) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div className={`terminal-sidebar-root ${open ? "is-open" : ""}`} aria-hidden={!open}>
      <div ref={panelRef} className="terminal-sidebar-panel">
        <div className="terminal-sidebar-bg" aria-hidden />
        <div className="terminal-sidebar-content">{children}</div>
        <div className="terminal-sidebar-edge" aria-hidden />
      </div>
      <canvas ref={offRef} className="terminal-sidebar-offscreen" aria-hidden />
    </div>
  );
}

export const TERMINAL_DECORATIONS: ThemeDecorations = {
  ScreenOverlay: TerminalScreenOverlay,
  FooterRightExtras: TerminalPowerLED,
  BootSequence: TerminalBootSequence,
  NavbarOverlay: TerminalRobcoSticker,
  SidebarShell: TerminalSidebarShell,
  SidebarContent: TerminalSidebarContent,
};
