import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type Konva from "konva";
import { AppShell, ActionIcon, Group, Tooltip, Box, Text } from "@mantine/core";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { TilePalette } from "./components/TilePalette";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas, type ViewState } from "./components/HexGridCanvas";
import { HelpModal } from "./components/HelpModal";
import { useMapStore } from "./store/mapStore";
import { axialToPixel, hexHeight, hexWidth, rectMap } from "./hex/hex";
import "./styles.css";

const NAVBAR_W = 300;
const HEADER_H = 44;
const FOOTER_H = 30;

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
  }, [sidebarOpen]);

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
    <AppShell
      header={{ height: HEADER_H }}
      navbar={{ width: NAVBAR_W, breakpoint: "sm", collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen } }}
      footer={{ height: FOOTER_H }}
      padding={0}
    >
      <AppShell.Header>
        <TopBar stageRef={stageRef} />
      </AppShell.Header>

      <AppShell.Navbar p="xs" className="left">
        <Toolbar />
        <Box mt="md" />
        <TilePalette />
      </AppShell.Navbar>

      <AppShell.Main style={{ position: "relative", overflow: "hidden" }}>
        <Tooltip label={sidebarOpen ? "Скрыть панель" : "Показать панель"} position="right">
          <ActionIcon
            variant="default"
            size="md"
            onClick={() => setSidebarOpen((o) => !o)}
            style={{
              position: "absolute",
              top: 8,
              left: 0,
              zIndex: 50,
              borderRadius: "0 2px 2px 0",
              borderLeft: "none",
              height: 36,
              width: 18,
              minWidth: 18,
            }}
          >
            <Text size="10px">{sidebarOpen ? "◀" : "▶"}</Text>
          </ActionIcon>
        </Tooltip>

        <Box ref={containerRef} className="canvas-host" style={{ position: "absolute", inset: 0 }}>
          <HexGridCanvas
            ref={stageRef}
            width={size.w}
            height={size.h}
            onHover={setHoverKey}
            viewState={view}
            setViewState={setView}
            panOverride={spacePan}
          />
          <Group
            gap={2}
            align="center"
            p={3}
            style={{
              position: "absolute",
              right: 10,
              bottom: 10,
              background: "rgba(14,14,10,0.90)",
              border: "1px solid var(--border)",
              zIndex: 10,
            }}
          >
            <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(1)} title="100%">1×</ActionIcon>
            <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(2)} title="200%">2×</ActionIcon>
            <ActionIcon variant="subtle" size="sm" onClick={() => setZoom(4)} title="400%">4×</ActionIcon>
            <ActionIcon variant="subtle" size="sm" onClick={fitToScreen} title="Вписать карту"><Text size="10px">Fit</Text></ActionIcon>
            <Text size="11px" c="radiation" pr={4} style={{ minWidth: 38, textAlign: "right" }}>
              {Math.round(view.scale * 100)}%
            </Text>
          </Group>
        </Box>
      </AppShell.Main>

      <AppShell.Footer>
        <StatusBar hoverKey={hoverKey} onOpenHelp={() => setHelpOpen(true)} />
      </AppShell.Footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </AppShell>
  );
}
