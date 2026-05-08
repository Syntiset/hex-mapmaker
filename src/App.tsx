import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type Konva from "konva";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { TilePalette } from "./components/TilePalette";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas, type ViewState } from "./components/HexGridCanvas";
import { HelpModal } from "./components/HelpModal";
import { useMapStore } from "./store/mapStore";
import { axialToPixel, hexHeight, hexWidth, rectMap } from "./hex/hex";
import "./styles.css";

export default function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 900;
  });
  const grid = useMapStore((s) => s.grid);
  const [view, setView] = useState<ViewState>(() => ({
    scale: 1,
    pos: { x: hexWidth(36), y: hexHeight(36) },
  }));

  function setZoom(target: number) {
    setView((v) => {
      const cx = size.w / 2, cy = size.h / 2;
      const wx = (cx - v.pos.x) / v.scale;
      const wy = (cy - v.pos.y) / v.scale;
      return { scale: target, pos: { x: cx - wx * target, y: cy - wy * target } };
    });
  }

  function fitToScreen() {
    const coords = rectMap(grid.cols, grid.rows);
    if (coords.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const { q, r } of coords) {
      const { x, y } = axialToPixel(q, r, grid.hexSize);
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
    const pad = grid.hexSize * 1.2;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const s = Math.max(0.15, Math.min(4, Math.min(size.w / w, size.h / h)));
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    setView({ scale: s, pos: { x: size.w / 2 - cx * s, y: size.h / 2 - cy * s } });
  }
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);
  const setTool = useMapStore((s) => s.setTool);
  const setPaintMode = useMapStore((s) => s.setPaintMode);
  const [spacePan, setSpacePan] = useState(false);

  useEffect(() => {
    function update() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setSize({ w: r.width, h: r.height });
      }
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useHotkeys("ctrl+z, meta+z", (e) => { e.preventDefault(); undo(); }, { preventDefault: true });
  useHotkeys("ctrl+y, meta+y, ctrl+shift+z, meta+shift+z", (e) => { e.preventDefault(); redo(); }, { preventDefault: true });
  useHotkeys("b", () => setPaintMode("biome"));
  useHotkeys("t", () => setPaintMode("tile"));
  useHotkeys("r", () => setTool("road"));
  useHotkeys("e", () => setTool("erase"));
  useHotkeys("l", () => setTool("label"));
  useHotkeys("space", (e) => { e.preventDefault(); setSpacePan(true); }, { keydown: true, preventDefault: true });
  useHotkeys("space", () => setSpacePan(false), { keyup: true });

  useEffect(() => {
    const onBlur = () => setSpacePan(false);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  return (
    <div className="app">
      <TopBar stageRef={stageRef} />
      <div className={sidebarOpen ? "main" : "main sidebar-closed"}>
        <button
          className="sidebar-toggle"
          onClick={() => setSidebarOpen((o) => !o)}
          title={sidebarOpen ? "Скрыть панель" : "Показать панель"}
        >
          {sidebarOpen ? "◀" : "▶"}
        </button>
        <aside className={sidebarOpen ? "left" : "left collapsed"}>
          <Toolbar />
          <TilePalette />
        </aside>
        <div className="canvas-host" ref={containerRef}>
          <HexGridCanvas
            ref={stageRef}
            width={size.w}
            height={size.h}
            onHover={setHoverKey}
            viewState={view}
            setViewState={setView}
            panOverride={spacePan}
          />
          <div className="zoom-overlay">
            <button title="100%" onClick={() => setZoom(1)}>1×</button>
            <button title="200%" onClick={() => setZoom(2)}>2×</button>
            <button title="400%" onClick={() => setZoom(4)}>4×</button>
            <button title="Вписать карту" onClick={fitToScreen}>Fit</button>
            <span className="zoom-readout">{Math.round(view.scale * 100)}%</span>
          </div>
        </div>
      </div>
      <StatusBar hoverKey={hoverKey} onOpenHelp={() => setHelpOpen(true)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
