import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { useMapStore } from "../store/mapStore";
import { saveJson } from "../io/saveJson";
import { loadJsonFile } from "../io/loadJson";
import { exportStagePng } from "../io/exportPng";
import { listRecents, pushRecent, type RecentEntry } from "../io/recents";

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
}

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TopBar({ stageRef }: Props) {
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
  const [recentOpen, setRecentOpen] = useState(false);
  const recentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecents(listRecents());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) {
        setRecentOpen(false);
      }
    }
    if (recentOpen) {
      window.addEventListener("mousedown", onClick);
      return () => window.removeEventListener("mousedown", onClick);
    }
  }, [recentOpen]);

  function handleNew() {
    if (Object.keys(cells).length > 0 && !confirm("Создать новую карту? Текущая работа будет потеряна.")) return;
    newMap(cols, rows);
  }

  function handleSave() {
    const filename = `map-${formatDate(Date.now()).replace(/[: ]/g, "-")}.json`;
    const map = { setting, grid, cells, roadPaths };
    saveJson(map, filename);
    pushRecent(filename, { ...map, version: 3 });
    setRecents(listRecents());
  }

  async function handleOpen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await loadJsonFile(file);
      loadMap({ grid: data.grid, cells: data.cells, roadPaths: data.roadPaths });
      pushRecent(file.name, data);
      setRecents(listRecents());
    } catch (err) {
      alert("Ошибка загрузки: " + (err as Error).message);
    }
    e.target.value = "";
  }

  function handleOpenRecent(entry: RecentEntry) {
    if (Object.keys(cells).length > 0 && !confirm(`Открыть «${entry.name}»? Текущая работа будет потеряна.`)) return;
    loadMap({ grid: entry.data.grid, cells: entry.data.cells, roadPaths: entry.data.roadPaths });
    pushRecent(entry.name, entry.data);
    setRecents(listRecents());
    setRecentOpen(false);
  }

  function handleExport() {
    if (stageRef.current) exportStagePng(stageRef.current);
  }

  return (
    <div className="topbar">
      <span className="brand">⚙ Hex Map Maker — Fallout</span>
      <div className="group">
        <label>
          Колонок:&nbsp;
          <input type="number" min={1} max={200} value={cols} onChange={(e) => setCols(+e.target.value)} />
        </label>
        <label>
          Строк:&nbsp;
          <input type="number" min={1} max={200} value={rows} onChange={(e) => setRows(+e.target.value)} />
        </label>
        <button onClick={handleNew}>Новая</button>
      </div>
      <div className="group">
        <button onClick={() => fileInput.current?.click()}>Открыть JSON</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          style={{ display: "none" }}
          onChange={handleOpen}
        />
        <div ref={recentRef} className={recentOpen ? "recent-menu open" : "recent-menu"}>
          <button title="Последние открытые/сохранённые карты" onClick={() => setRecentOpen((o) => !o)}>
            Недавние ▾
          </button>
          <div className="recent-list">
            {recents.length === 0 ? (
              <div className="empty">Пусто. Сохрани или открой карту, чтобы появилась здесь.</div>
            ) : (
              recents.map((r) => (
                <button key={r.name + r.savedAt} onClick={() => handleOpenRecent(r)}>
                  <div>{r.name}</div>
                  <div style={{ fontSize: 10, color: "#7f7a60" }}>{formatDate(r.savedAt)}</div>
                </button>
              ))
            )}
          </div>
        </div>
        <button onClick={handleSave}>Сохранить JSON</button>
        <button onClick={handleExport}>Экспорт PNG</button>
      </div>
      <div className="group">
        <button onClick={undo} title="Ctrl+Z">↶ Отмена</button>
        <button onClick={redo} title="Ctrl+Y">↷ Повтор</button>
      </div>
    </div>
  );
}
