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
    <div className="toolbar">
      <div className="mode-toggle">
        <button
          className={paintMode === "biome" ? "active" : ""}
          title="Режим биома — рисует окружение (B)"
          onClick={() => {
            setPaintMode("biome");
            if (tool !== "paint" && tool !== "erase") setTool("paint");
          }}
        >Биом</button>
        <button
          className={paintMode === "tile" ? "active" : ""}
          title="Режим тайла — рисует объект/иконку (T)"
          onClick={() => {
            setPaintMode("tile");
            if (tool !== "paint" && tool !== "erase") setTool("paint");
          }}
        >Тайл</button>
      </div>

      <div className="tool-grid">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={"tool-btn" + (tool === t.id ? " active" : "")}
            title={t.hint}
            onClick={() => setTool(t.id)}
          >
            <span className="tool-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="toolbar-sep" />

      <div className="toolbar-section">
        <span className="toolbar-label">Тип дороги</span>
        <select
          value={activeRoadId}
          onChange={(e) => { setActiveRoad(e.target.value); setTool("road"); }}
        >
          {roads.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        <label className="toolbar-check">
          <input type="checkbox" checked={freeHandRoad} onChange={toggleFreeHandRoad} />
          Free-hand
        </label>
      </div>

      <div className="toolbar-sep" />

      <label className="toolbar-check">
        <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
        Сетка
      </label>
    </div>
  );
}
