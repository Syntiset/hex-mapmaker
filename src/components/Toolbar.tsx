import {
  Stack,
  SegmentedControl,
  SimpleGrid,
  UnstyledButton,
  Select,
  Switch,
  Text,
  Tooltip,
  Divider,
} from "@mantine/core";
import { useMapStore, type Tool } from "../store/mapStore";

const TOOLS: { id: Tool; icon: string; label: string; hint: string }[] = [
  { id: "paint",      icon: "✦", label: "Кисть",        hint: "Покрасить гекс (B)" },
  { id: "erase",      icon: "◻", label: "Ластик",       hint: "Стереть биом или тайл (E)" },
  { id: "road",       icon: "─", label: "Дорога",       hint: "Рисовать дорогу (R)" },
  { id: "road-erase", icon: "✂", label: "Снять дорогу", hint: "Удалить дорогу из гекса" },
  { id: "label",      icon: "⌨", label: "Подпись",      hint: "Поставить подпись (L)" },
  { id: "pan",        icon: "✥", label: "Перенос",      hint: "Двигать карту (Space)" },
];

export function Toolbar() {
  const tool        = useMapStore((s) => s.tool);
  const setTool     = useMapStore((s) => s.setTool);
  const paintMode   = useMapStore((s) => s.paintMode);
  const setPaintMode= useMapStore((s) => s.setPaintMode);
  const showGrid    = useMapStore((s) => s.showGrid);
  const toggleGrid  = useMapStore((s) => s.toggleGrid);
  const roads       = useMapStore((s) => s.roads);
  const activeRoadId= useMapStore((s) => s.activeRoadId);
  const setActiveRoad     = useMapStore((s) => s.setActiveRoad);
  const freeHandRoad      = useMapStore((s) => s.freeHandRoad);
  const toggleFreeHandRoad= useMapStore((s) => s.toggleFreeHandRoad);

  return (
    <Stack gap="xs">
      <SegmentedControl
        size="xs"
        fullWidth
        value={paintMode}
        onChange={(v) => {
          setPaintMode(v as "biome" | "tile");
          if (tool !== "paint" && tool !== "erase") setTool("paint");
        }}
        data={[
          { label: "БИОМ", value: "biome" },
          { label: "ТАЙЛ", value: "tile" },
        ]}
        color="wasteland"
      />

      <SimpleGrid cols={2} spacing={4} verticalSpacing={4}>
        {TOOLS.map((t) => {
          const active = tool === t.id;
          return (
            <Tooltip key={t.id} label={t.hint} withArrow openDelay={300}>
              <UnstyledButton
                onClick={() => setTool(t.id)}
                className="tool-btn-mantine"
                data-active={active || undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 8px",
                  fontSize: 11,
                  background: active ? "var(--mantine-color-wasteland-9)" : "var(--panel)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  color: active ? "var(--accent)" : "var(--text)",
                  borderRadius: 1,
                  cursor: "pointer",
                  letterSpacing: 0.2,
                  boxShadow: active ? "inset 0 0 0 1px rgba(111,220,74,0.2)" : "none",
                }}
              >
                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }}>{t.icon}</span>
                {t.label}
              </UnstyledButton>
            </Tooltip>
          );
        })}
      </SimpleGrid>

      <Divider variant="dashed" />

      <Stack gap={4}>
        <Text size="10px" c="dimmed" style={{ textTransform: "uppercase", letterSpacing: 1 }}>Тип дороги</Text>
        <Select
          size="xs"
          value={activeRoadId}
          onChange={(v) => { if (v) { setActiveRoad(v); setTool("road"); } }}
          data={roads.map((r) => ({ value: r.id, label: r.name }))}
          allowDeselect={false}
          comboboxProps={{ withinPortal: true }}
        />
        <Switch
          size="xs"
          label="Free-hand"
          color="wasteland"
          checked={freeHandRoad}
          onChange={toggleFreeHandRoad}
        />
      </Stack>

      <Divider variant="dashed" />

      <Switch
        size="xs"
        label="Сетка"
        color="wasteland"
        checked={showGrid}
        onChange={toggleGrid}
      />
    </Stack>
  );
}
