import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { TilePalette } from "./components/TilePalette";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas, type ViewState } from "./components/HexGridCanvas";
import { useMapStore } from "./store/mapStore";
import { axialToPixel, hexHeight, hexWidth, rectMap } from "./hex/hex";
import "./styles.css";

export default function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);
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
  const setActiveBiome = useMapStore((s) => s.setActiveBiome);
  const setActiveTile = useMapStore((s) => s.setActiveTile);
  const prevToolRef = useRef<string | null>(null);

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

  useEffect(() => {
    function isTextTarget(t: EventTarget | null) {
      const el = t as HTMLElement | null;
      return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (isTextTarget(e.target)) return;

      if (e.ctrlKey || e.metaKey) {
        const k = e.key.toLowerCase();
        if (k === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
        if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); redo(); return; }
        return;
      }

      // Space (hold) → pan; restore previous tool on release.
      if (e.code === "Space" && !e.repeat) {
        e.preventDefault();
        const cur = useMapStore.getState().tool;
        if (cur !== "pan") {
          prevToolRef.current = cur;
          setTool("pan");
        }
        return;
      }

      // Digit 1-9 — pick palette item by index in current paint mode.
      if (/^[1-9]$/.test(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        const st = useMapStore.getState();
        if (st.paintMode === "biome") {
          const b = st.biomes[idx];
          if (b) { setActiveBiome(b.id); setTool("paint"); }
        } else {
          const t = st.tiles[idx];
          if (t) { setActiveTile(t.id); setTool("paint"); }
        }
        return;
      }

      const k = e.key.toLowerCase();
      switch (k) {
        case "b": setPaintMode("biome"); setTool("paint"); break;
        case "t": setPaintMode("tile");  setTool("paint"); break;
        case "r": setTool("road"); break;
        case "e": setTool("erase"); break;
        case "l": setTool("label"); break;
        default: return;
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "Space") {
        e.preventDefault();
        const prev = prevToolRef.current;
        if (prev) {
          setTool(prev as ReturnType<typeof useMapStore.getState>["tool"]);
          prevToolRef.current = null;
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [undo, redo, setTool, setPaintMode, setActiveBiome, setActiveTile]);

  return (
    <div className="app">
      <TopBar stageRef={stageRef} />
      <div className="main">
        <aside className="left">
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
      <StatusBar hoverKey={hoverKey} />
    </div>
  );
}
