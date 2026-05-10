import { Group, Text, Button, Divider } from "@mantine/core";
import { useMapStore } from "../store/mapStore";

interface Props {
  hoverKey: string | null;
  onOpenHelp: () => void;
}

export function StatusBar({ hoverKey, onOpenHelp }: Props) {
  const cells = useMapStore((s) => s.cells);
  const tiles = useMapStore((s) => s.tiles);
  const tool = useMapStore((s) => s.tool);
  const cell = hoverKey ? cells[hoverKey] : undefined;
  const tile = cell?.tileId ? tiles.find((t) => t.id === cell.tileId) : undefined;

  return (
    <Group h="100%" gap={0} px={0} wrap="nowrap" align="center" style={{ fontSize: 11 }}>
      <StatusItem><Text component="span" c="wasteland.4">✦ <b style={{ fontWeight: "normal" }}>{tool}</b></Text></StatusItem>
      <StatusItem>Гекс: <Text component="span" c="wasteland.4" fw="normal">{hoverKey ?? "—"}</Text></StatusItem>
      <StatusItem>Тайл: <Text component="span" c="wasteland.4" fw="normal">{tile?.name ?? "—"}</Text></StatusItem>
      {cell?.label && <StatusItem>«{cell.label}»</StatusItem>}
      <Text size="10px" c="#484838" ml="auto" pr="sm" style={{ whiteSpace: "nowrap" }}>
        B/T режим · R дорога · E ластик · L подпись · Space pan · Ctrl+Z/Y
      </Text>
      <Divider orientation="vertical" />
      <Button variant="subtle" size="xs" radius={0} onClick={onOpenHelp} h="100%" style={{ height: 28 }}>
        ? Помощь
      </Button>
    </Group>
  );
}

function StatusItem({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Group gap={6} px="sm" h={28} align="center" wrap="nowrap" c="dimmed" style={{ whiteSpace: "nowrap" }}>
        {children}
      </Group>
      <Divider orientation="vertical" />
    </>
  );
}
