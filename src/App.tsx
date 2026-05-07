import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { TilePalette } from "./components/TilePalette";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas } from "./components/HexGridCanvas";
import { useMapStore } from "./store/mapStore";
import "./styles.css";

export default function App() {
  const stageRef = useRef<Konva.Stage>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);

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
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.ctrlKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if (e.ctrlKey && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
          />
        </div>
      </div>
      <StatusBar hoverKey={hoverKey} />
    </div>
  );
}
