import { useEffect, useState } from "react";
import type { ThemeDecorations } from "./types";

/**
 * Полноэкранный overlay поверх канваса:
 * — мерцающий CRT-flicker (анимированная opacity)
 * — едва заметный bend через box-shadow inset (имитация выпуклости стекла)
 * — горизонтальный sweep-блик раз в несколько секунд
 */
function TerminalScreenOverlay() {
  return (
    <div className="terminal-screen-overlay">
      <div className="terminal-flicker" />
      <div className="terminal-sweep" />
    </div>
  );
}

/** Янтарный POWER-индикатор у правого края футера, как на корпусе настоящего терминала. */
function TerminalPowerLED() {
  return (
    <div className="terminal-power">
      <span className="terminal-power-led" aria-hidden />
      <span className="terminal-power-label">POWER</span>
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

export const TERMINAL_DECORATIONS: ThemeDecorations = {
  ScreenOverlay: TerminalScreenOverlay,
  FooterRightExtras: TerminalPowerLED,
  BootSequence: TerminalBootSequence,
};
