import { useEffect, useMemo, useRef, useState } from "react";
import {
  Stack,
  Tabs,
  SimpleGrid,
  UnstyledButton,
  Text,
  Divider,
  HoverCard,
  ScrollArea,
  Box,
} from "@mantine/core";
import { useMapStore } from "../store/mapStore";
import {
  drawBiomeRich,
  drawHexStroke,
  drawIconEnhanced,
  pathHex,
} from "../render/drawHex";
import type { BiomeDef, TileDef } from "../tiles/types";
import { FALLOUT_TILE_CATEGORIES } from "../tiles/fallout";

const PREVIEW = 52;
const HOVER_PREVIEW = 140;

function TilePreview({ tile, biome, size = PREVIEW }: { tile: TileDef; biome: BiomeDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const hexS = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, hexS);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, hexS, biome);
    ctx.restore();
    drawIconEnhanced(ctx, 0, 0, cx, cy, hexS, tile);
    drawHexStroke(ctx, cx, cy, hexS, biome.stroke, 1);
  }, [tile, biome, size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: "block" }} />;
}

function BiomePreview({ biome, size = PREVIEW }: { biome: BiomeDef; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    const hexS = size * 0.42;
    const cx = size / 2;
    const cy = size / 2;
    ctx.save();
    ctx.beginPath();
    pathHex(ctx, cx, cy, hexS);
    ctx.clip();
    drawBiomeRich(ctx, 0, 0, cx, cy, hexS, biome);
    ctx.restore();
    drawHexStroke(ctx, cx, cy, hexS, biome.stroke, 1);
  }, [biome, size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: "block" }} />;
}

function paletteCellStyle(active: boolean, accent: "wasteland" | "radiation" = "wasteland"): React.CSSProperties {
  const accentColor = accent === "wasteland" ? "var(--accent)" : "var(--accent-2)";
  return {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 2px",
    fontSize: 9,
    background: active ? "var(--bg-2)" : "var(--panel)",
    border: `1px solid ${active ? accentColor : "var(--border)"}`,
    borderRadius: 1,
    color: active ? accentColor : "var(--text)",
    transition: "background 0.1s, border-color 0.1s",
    minWidth: 0,
    boxShadow: active ? `inset 0 0 0 1px ${accentColor}30` : "none",
  };
}

export function TilePalette() {
  const tiles = useMapStore((s) => s.tiles);
  const biomes = useMapStore((s) => s.biomes);
  const activeId = useMapStore((s) => s.activeTileId);
  const setActive = useMapStore((s) => s.setActiveTile);
  const setTool = useMapStore((s) => s.setTool);
  const setPaintMode = useMapStore((s) => s.setPaintMode);
  const activeBiomeId = useMapStore((s) => s.activeBiomeId);
  const setActiveBiome = useMapStore((s) => s.setActiveBiome);
  const paintMode = useMapStore((s) => s.paintMode);

  const [category, setCategory] = useState<string>("all");

  const activeBiome = biomes.find((b) => b.id === activeBiomeId) ?? biomes[0];

  const tileById = useMemo(() => new Map(tiles.map((t) => [t.id, t])), [tiles]);
  const visibleTiles = useMemo(() => {
    if (category === "all") return tiles;
    const cat = FALLOUT_TILE_CATEGORIES.find((c) => c.id === category);
    if (!cat) return tiles;
    return cat.tileIds.map((id) => tileById.get(id)).filter((t): t is TileDef => !!t);
  }, [category, tiles, tileById]);

  function ensurePaintCompatibleTool() {
    const cur = useMapStore.getState().tool;
    if (cur !== "paint" && cur !== "erase") setTool("paint");
  }

  return (
    <Stack gap={8}>
      <SectionHeader title="Биомы" />
      <SimpleGrid cols={4} spacing={3} verticalSpacing={3}>
        {biomes.map((b) => {
          const active = paintMode === "biome" && activeBiomeId === b.id;
          return (
            <HoverCard key={b.id} openDelay={300} closeDelay={50} position="right" withArrow shadow="lg">
              <HoverCard.Target>
                <UnstyledButton
                  onClick={() => {
                    setActiveBiome(b.id);
                    setPaintMode("biome");
                    ensurePaintCompatibleTool();
                  }}
                  style={paletteCellStyle(active, "wasteland")}
                >
                  <BiomePreview biome={b} />
                  <Text size="9px" mt={3} style={{ lineHeight: 1.1, textAlign: "center", wordBreak: "break-word" }}>{b.name}</Text>
                </UnstyledButton>
              </HoverCard.Target>
              <HoverCard.Dropdown p={6}>
                <BiomePreview biome={b} size={HOVER_PREVIEW} />
                <Text size="xs" c="radiation" ta="center" mt={4}>{b.name}</Text>
              </HoverCard.Dropdown>
            </HoverCard>
          );
        })}
      </SimpleGrid>

      <Divider />

      <SectionHeader title="Тайлы" />
      <Text size="10px" c="dimmed" fs="italic" mt={-4}>Поверх: {activeBiome.name}</Text>

      <Tabs
        value={category}
        onChange={(v) => v && setCategory(v)}
        variant="pills"
        color="radiation"
        styles={{ list: { gap: 2 }, tab: { fontSize: 10, padding: "3px 7px", height: "auto", minHeight: 0 } }}
      >
        <Tabs.List>
          <Tabs.Tab value="all">Все</Tabs.Tab>
          {FALLOUT_TILE_CATEGORIES.map((c) => (
            <Tabs.Tab key={c.id} value={c.id}>{c.name}</Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      <ScrollArea.Autosize mah={500} type="hover" scrollbarSize={6}>
        <Stack gap={1}>
          {visibleTiles.map((t) => {
            const active = paintMode === "tile" && activeId === t.id;
            return (
              <HoverCard key={t.id} openDelay={300} closeDelay={50} position="right" withArrow shadow="lg">
                <HoverCard.Target>
                  <UnstyledButton
                    onClick={() => {
                      setActive(t.id);
                      setPaintMode("tile");
                      ensurePaintCompatibleTool();
                    }}
                    style={{
                      textAlign: "left",
                      padding: "5px 10px",
                      fontSize: 11,
                      background: active ? "var(--bg-2)" : "var(--panel)",
                      border: "1px solid transparent",
                      borderRadius: 1,
                      borderLeft: `2px solid ${active ? "var(--accent-2)" : "transparent"}`,
                      color: active ? "var(--accent-2)" : "var(--text)",
                      cursor: "pointer",
                    }}
                  >
                    {t.name}
                  </UnstyledButton>
                </HoverCard.Target>
                <HoverCard.Dropdown p={6}>
                  <TilePreview tile={t} biome={activeBiome} size={HOVER_PREVIEW} />
                  <Text size="xs" c="radiation" ta="center" mt={4}>{t.name}</Text>
                  <Text size="9px" c="dimmed" ta="center">поверх: {activeBiome.name}</Text>
                </HoverCard.Dropdown>
              </HoverCard>
            );
          })}
        </Stack>
      </ScrollArea.Autosize>
    </Stack>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Box style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <Text size="10px" fw={700} c="radiation" style={{ letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</Text>
      <Box style={{ flex: 1, height: 1, background: "var(--border)" }} />
    </Box>
  );
}
