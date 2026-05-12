import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type Konva from "konva";
import { AppShell, Button, Group, Box, Text } from "@mantine/core";
import { TopBar } from "./components/TopBar";
import { Sidebar } from "./components/Sidebar";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas, type ViewState } from "./components/HexGridCanvas";
import { HelpModal } from "./components/HelpModal";
import { useMapStore } from "./store/mapStore";
import { axialToPixel, hexHeight, hexWidth, rectMap } from "./hex/hex";
import { useThemeDecorations } from "./themes/registry";
import { useThemeStore } from "./store/themeStore";
import { DefaultSidebarShell } from "./themes/defaultShell";
import { CRTOverlay } from "./render/CRTOverlay";
import "./styles.css";

const HEADER_H = 44;
const FOOTER_H = 44;

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
  const decor = useThemeDecorations();
  const themeId = useThemeStore((s) => s.theme);
  const crtActive = themeId === "terminal";
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
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    };
    update();
    // ResizeObserver ловит ВСЕ изменения, включая промежуточные кадры
    // CSS-анимации сайдбара — Konva не остаётся с устаревшим размером.
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
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

  const Shell = decor.SidebarShell ?? DefaultSidebarShell;

  return (
    <AppShell
      header={{ height: HEADER_H }}
      footer={{ height: FOOTER_H }}
    >
      <AppShell.Header>
        <TopBar
          stageRef={stageRef}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          onOpenHelp={() => setHelpOpen(true)}
        />
      </AppShell.Header>

      <AppShell.Main p={0} style={{ position: "relative", overflow: "hidden" }}>
        <Box
          ref={containerRef}
          className="canvas-host"
          style={{
            position: "fixed",
            top: HEADER_H,
            left: 0,
            right: 0,
            bottom: FOOTER_H,
            overflow: "hidden",
          }}
        >
          <HexGridCanvas
            ref={stageRef}
            width={size.w}
            height={size.h}
            onHover={setHoverKey}
            viewState={view}
            setViewState={setView}
            panOverride={spacePan}
          />
          <CRTOverlay stageRef={stageRef} width={size.w} height={size.h} active={crtActive} />
          {decor.ScreenOverlay && <decor.ScreenOverlay />}
          <Shell open={sidebarOpen}>
            <Sidebar />
          </Shell>
        </Box>
      </AppShell.Main>

      <AppShell.Footer>
        <StatusBar
          hoverKey={hoverKey}
          zoomControls={
            <Group gap={3} wrap="nowrap" align="center" className="footer-zoom">
              <Button size="compact-xs" variant="default" onClick={() => setZoom(1)} title="100%">1×</Button>
              <Button size="compact-xs" variant="default" onClick={() => setZoom(2)} title="200%">2×</Button>
              <Button size="compact-xs" variant="default" onClick={() => setZoom(4)} title="400%">4×</Button>
              <Button size="compact-xs" variant="default" onClick={fitToScreen} title="Вписать карту">Fit</Button>
              <Text size="xs" fw={700} c="wasteland.4" px={6} style={{ minWidth: 46, textAlign: "right" }}>
                {Math.round(view.scale * 100)}%
              </Text>
            </Group>
          }
          rightExtras={decor.FooterRightExtras ? <decor.FooterRightExtras /> : null}
        />
      </AppShell.Footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {decor.BootSequence && <decor.BootSequence />}
    </AppShell>
  );
}
