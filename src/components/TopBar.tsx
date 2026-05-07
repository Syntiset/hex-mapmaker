import { useRef, useState } from "react";
import type Konva from "konva";
import { useMapStore } from "../store/mapStore";
import { saveJson } from "../io/saveJson";
import { loadJsonFile } from "../io/loadJson";
import { exportStagePng } from "../io/exportPng";

interface Props {
  stageRef: React.RefObject<Konva.Stage | null>;
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

  function handleNew() {
    if (Object.keys(cells).length > 0 && !confirm("Создать новую карту? Текущая работа будет потеряна.")) return;
    newMap(cols, rows);
  }

  function handleSave() {
    saveJson({ setting, grid, cells, roadPaths });
  }

  async function handleOpen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await loadJsonFile(file);
      loadMap({ grid: data.grid, cells: data.cells, roadPaths: data.roadPaths });
    } catch (err) {
      alert("Ошибка загрузки: " + (err as Error).message);
    }
    e.target.value = "";
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
