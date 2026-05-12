import { Group, Text, Divider, Box } from "@mantine/core";
import { useMapStore } from "../store/mapStore";

interface Props {
  hoverKey: string | null;
  zoomControls?: React.ReactNode;
  rightExtras?: React.ReactNode;
}

export function StatusBar({ hoverKey, zoomControls, rightExtras }: Props) {
  const cells = useMapStore((s) => s.cells);
  const tiles = useMapStore((s) => s.tiles);
  const tool = useMapStore((s) => s.tool);
  const cell = hoverKey ? cells[hoverKey] : undefined;
  const tile = cell?.tileId ? tiles.find((t) => t.id === cell.tileId) : undefined;

  return (
    <Group h="100%" gap={0} wrap="nowrap" align="stretch" style={{ fontSize: 11 }}>
      <Item>
        <Text size="11px" c="wasteland.4" span>✦&nbsp;{tool}</Text>
      </Item>
      <Item>
        <Text size="11px" c="dimmed" span>Гекс:&nbsp;</Text>
        <Text size="11px" c="wasteland.4" span>{hoverKey ?? "—"}</Text>
      </Item>
      <Item>
        <Text size="11px" c="dimmed" span>Тайл:&nbsp;</Text>
        <Text size="11px" c="wasteland.4" span>{tile?.name ?? "—"}</Text>
      </Item>
      {cell?.label && (
        <Item>
          <Text size="11px" c="dimmed" span>«{cell.label}»</Text>
        </Item>
      )}
      <Box style={{ flex: 1 }} />
      {zoomControls && (
        <>
          <Box px="sm" style={{ display: "flex", alignItems: "center" }}>{zoomControls}</Box>
          <Divider orientation="vertical" />
        </>
      )}
      {rightExtras}
    </Group>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Box px="sm" style={{ display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
        {children}
      </Box>
      <Divider orientation="vertical" />
    </>
  );
}
