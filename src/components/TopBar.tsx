import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import {
  Group,
  Button,
  NumberInput,
  Menu,
  Divider,
  Text,
  Tooltip,
  ActionIcon,
  Burger,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { modals } from "@mantine/modals";
import { useMapStore } from "../store/mapStore";
import { saveJson } from "../io/saveJson";
import { loadJsonFile } from "../io/loadJson";
import { exportStagePng } from "../io/exportPng";
import { listRecents, pushRecent, type RecentEntry } from "../io/recents";

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TopBar({ stageRef, sidebarOpen, onToggleSidebar }: Props) {
  const grid = useMapStore((s) => s.grid);
  const cells = useMapStore((s) => s.cells);
  const roadPaths = useMapStore((s) => s.roadPaths);
  const setting = useMapStore((s) => s.setting);
  const newMap = useMapStore((s) => s.newMap);
  const loadMap = useMapStore((s) => s.loadMap);
  const undo = useMapStore((s) => s.undo);
  const redo = useMapStore((s) => s.redo);

  const fileInput = useRef<HTMLInputElement>(null);
  const [cols, setCols] = useState(grid.cols);
  const [rows, setRows] = useState(grid.rows);
  const [recents, setRecents] = useState<RecentEntry[]>([]);

  useEffect(() => { setRecents(listRecents()); }, []);

  function confirmIfDirty(message: string, onConfirm: () => void) {
    if (Object.keys(cells).length === 0) { onConfirm(); return; }
    modals.openConfirmModal({
      title: "Подтверждение",
      children: <Text size="sm">{message}</Text>,
      labels: { confirm: "Продолжить", cancel: "Отмена" },
      confirmProps: { color: "red" },
      onConfirm,
    });
  }

  function handleNew() {
    confirmIfDirty("Создать новую карту? Текущая работа будет потеряна.", () => {
      newMap(cols, rows);
      notifications.show({ message: `Новая карта ${cols}×${rows}`, color: "wasteland", autoClose: 1500 });
    });
  }

  function handleSave() {
    const filename = `map-${formatDate(Date.now()).replace(/[: ]/g, "-")}.json`;
    const map = { setting, grid, cells, roadPaths };
    saveJson(map, filename);
    pushRecent(filename, { ...map, version: 3 });
    setRecents(listRecents());
    notifications.show({ message: `Сохранено: ${filename}`, color: "wasteland", autoClose: 2000 });
  }

  async function handleOpen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await loadJsonFile(file);
      loadMap({ grid: data.grid, cells: data.cells, roadPaths: data.roadPaths });
      pushRecent(file.name, data);
      setRecents(listRecents());
      notifications.show({ message: `Открыто: ${file.name}`, color: "wasteland", autoClose: 2000 });
    } catch (err) {
      notifications.show({ message: "Ошибка загрузки: " + (err as Error).message, color: "red" });
    }
    e.target.value = "";
  }

  function handleOpenRecent(entry: RecentEntry) {
    confirmIfDirty(`Открыть «${entry.name}»? Текущая работа будет потеряна.`, () => {
      loadMap({ grid: entry.data.grid, cells: entry.data.cells, roadPaths: entry.data.roadPaths });
      pushRecent(entry.name, entry.data);
      setRecents(listRecents());
    });
  }

  function handleExport() {
    if (stageRef.current) {
      exportStagePng(stageRef.current);
      notifications.show({ message: "PNG экспортирован", color: "wasteland", autoClose: 1500 });
    }
  }

  return (
    <Group h="100%" px="sm" gap="xs" wrap="nowrap" align="center" className="topbar-mantine">
      <Burger
        opened={sidebarOpen}
        onClick={onToggleSidebar}
        size="sm"
        aria-label="Скрыть/показать панель"
      />

      <Group gap={6} wrap="nowrap">
        <Text fw={700} c="wasteland.4" size="sm" style={{ letterSpacing: 1.5, textTransform: "uppercase", textShadow: "0 0 8px rgba(111,220,74,0.45)" }}>
          ⚙ Hex Map Maker
        </Text>
      </Group>

      <Divider orientation="vertical" />

      <Group gap={6} wrap="nowrap" align="center">
        <Text size="xs" c="dimmed">Кол</Text>
        <NumberInput size="xs" w={60} min={1} max={200} value={cols} onChange={(v) => setCols(typeof v === "number" ? v : +v)} hideControls />
        <Text size="xs" c="dimmed">Стр</Text>
        <NumberInput size="xs" w={60} min={1} max={200} value={rows} onChange={(v) => setRows(typeof v === "number" ? v : +v)} hideControls />
        <Button size="xs" variant="default" onClick={handleNew}>Новая</Button>
      </Group>

      <Divider orientation="vertical" />

      <Group gap={6} wrap="nowrap">
        <Button size="xs" variant="default" onClick={() => fileInput.current?.click()}>Открыть</Button>
        <input ref={fileInput} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleOpen} />

        <Menu shadow="md" width={260} position="bottom-start">
          <Menu.Target>
            <Button size="xs" variant="default" rightSection="▾">Недавние</Button>
          </Menu.Target>
          <Menu.Dropdown>
            {recents.length === 0 ? (
              <Menu.Item disabled><Text size="xs" c="dimmed" fs="italic">Пусто. Сохрани или открой карту.</Text></Menu.Item>
            ) : recents.map((r) => (
              <Menu.Item key={r.name + r.savedAt} onClick={() => handleOpenRecent(r)}>
                <Text size="xs">{r.name}</Text>
                <Text size="xs" c="dimmed">{formatDate(r.savedAt)}</Text>
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>

        <Button size="xs" variant="default" onClick={handleSave}>Сохранить</Button>
        <Button size="xs" variant="default" onClick={handleExport}>Экспорт PNG</Button>
      </Group>

      <Group gap={4} ml="auto" wrap="nowrap">
        <Tooltip label="Отменить (Ctrl+Z)"><ActionIcon variant="default" onClick={undo} size="lg">↶</ActionIcon></Tooltip>
        <Tooltip label="Повторить (Ctrl+Y)"><ActionIcon variant="default" onClick={redo} size="lg">↷</ActionIcon></Tooltip>
      </Group>
    </Group>
  );
}
