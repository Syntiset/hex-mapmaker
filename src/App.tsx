import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type Konva from "konva";
import { AppShell, Button, Group, Box, Text, ScrollArea } from "@mantine/core";
import { TopBar } from "./components/TopBar";
import { Toolbar } from "./components/Toolbar";
import { TilePalette } from "./components/TilePalette";
import { StatusBar } from "./components/StatusBar";
import { HexGridCanvas, type ViewState } from "./components/HexGridCanvas";
import { HelpModal } from "./components/HelpModal";
import { useMapStore } from "./store/mapStore";
import { axialToPixel, hexHeight, hexWidth, rectMap } from "./hex/hex";
import { useThemeDecorations } from "./themes/registry";
import { useThemeStore } from "./store/themeStore";
import { CRTOverlay } from "./render/CRTOverlay";
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

  return (
    <AppShell
      header={{ height: HEADER_H }}
      navbar={{ width: NAVBAR_W, breakpoint: "sm", collapsed: { mobile: !sidebarOpen, desktop: !sidebarOpen } }}
      footer={{ height: FOOTER_H }}
    >
      <AppShell.Header>
        <TopBar stageRef={stageRef} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((o) => !o)} />
      </AppShell.Header>

      <AppShell.Navbar p="xs" className="left">
        <AppShell.Section component={ScrollArea} grow scrollbarSize={6} type="hover">
          <Toolbar />
          <Box mt="md" />
          <TilePalette />
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main p={0} style={{ position: "relative", overflow: "hidden" }}>
        <Box
          ref={containerRef}
          className="canvas-host"
          style={{
            position: "fixed",
            top: HEADER_H,
            left: sidebarOpen ? NAVBAR_W : 0,
            right: 0,
            bottom: FOOTER_H,
            overflow: "hidden",
            transition: "left 0.15s ease",
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
        </Box>
      </AppShell.Main>

      <Group
        gap={4}
        align="center"
        p={6}
        style={{
          position: "fixed",
          right: 16,
          bottom: FOOTER_H + 12,
          background: "rgba(20,20,14,0.95)",
          border: "1px solid var(--accent)",
          borderRadius: 2,
          boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
          zIndex: 200,
        }}
      >
        <Button variant="filled" color="dark.6" size="xs" onClick={() => setZoom(1)} title="100%" styles={{ root: { color: "var(--text)", border: "1px solid var(--border)" } }}>1×</Button>
        <Button variant="filled" color="dark.6" size="xs" onClick={() => setZoom(2)} title="200%" styles={{ root: { color: "var(--text)", border: "1px solid var(--border)" } }}>2×</Button>
        <Button variant="filled" color="dark.6" size="xs" onClick={() => setZoom(4)} title="400%" styles={{ root: { color: "var(--text)", border: "1px solid var(--border)" } }}>4×</Button>
        <Button variant="filled" color="dark.6" size="xs" onClick={fitToScreen} title="Вписать карту" styles={{ root: { color: "var(--accent-2)", border: "1px solid var(--border)" } }}>Fit</Button>
        <Text size="sm" fw={700} c="wasteland.4" px={4} style={{ minWidth: 52, textAlign: "right" }}>
          {Math.round(view.scale * 100)}%
        </Text>
      </Group>

      <AppShell.Footer>
        <StatusBar
          hoverKey={hoverKey}
          onOpenHelp={() => setHelpOpen(true)}
          rightExtras={decor.FooterRightExtras ? <decor.FooterRightExtras /> : null}
        />
      </AppShell.Footer>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      {decor.BootSequence && <decor.BootSequence />}
    </AppShell>
  );
}
