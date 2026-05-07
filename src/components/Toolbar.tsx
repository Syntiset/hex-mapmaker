import { useMapStore, type Tool } from "../store/mapStore";

const TOOLS: { id: Tool; label: string; hint: string }[] = [
  { id: "paint",      label: "🖌 Кисть",       hint: "Покрасить гекс активным биомом или тайлом (см. режим)" },
  { id: "erase",      label: "🧽 Ластик",      hint: "Стереть биом или тайл (см. режим)" },
  { id: "road",       label: "🛣 Дорога",      hint: "Рисовать дорогу (соединяется с соседними)" },
  { id: "road-erase", label: "✂ Снять дорогу", hint: "Удалить дорогу из гекса" },
  { id: "label",      label: "🏷 Подпись",     hint: "Поставить/изменить подпись гекса" },
  { id: "pan",        label: "✋ Перенос",     hint: "Двигать карту" },
];

export function Toolbar() {
  const tool = useMapStore((s) => s.tool);
  const setTool = useMapStore((s) => s.setTool);
  const paintMode = useMapStore((s) => s.paintMode);
  const setPaintMode = useMapStore((s) => s.setPaintMode);
  const showGrid = useMapStore((s) => s.showGrid);
  const toggleGrid = useMapStore((s) => s.toggleGrid);
  const roads = useMapStore((s) => s.roads);
  const activeRoadId = useMapStore((s) => s.activeRoadId);
  const setActiveRoad = useMapStore((s) => s.setActiveRoad);
  const freeHandRoad = useMapStore((s) => s.freeHandRoad);
  const toggleFreeHandRoad = useMapStore((s) => s.toggleFreeHandRoad);

  return (
    <div className="toolbar">
      {TOOLS.map((t) => (
        <button
          key={t.id}
          className={tool === t.id ? "tool active" : "tool"}
          title={t.hint}
          onClick={() => setTool(t.id)}
        >
          {t.label}
        </button>
      ))}
      <div className="sep" />
      <div className="row" title="Что пишет «Кисть»: окружение (биом) или объект (тайл)">
        Режим:&nbsp;
        <button
          className={paintMode === "biome" ? "tool active" : "tool"}
          style={{ flex: 1, padding: "4px 6px", fontSize: 11 }}
          onClick={() => {
            setPaintMode("biome");
            if (tool !== "paint" && tool !== "erase") setTool("paint");
          }}
        >Биом</button>
        <button
          className={paintMode === "tile" ? "tool active" : "tool"}
          style={{ flex: 1, padding: "4px 6px", fontSize: 11 }}
          onClick={() => {
            setPaintMode("tile");
            if (tool !== "paint" && tool !== "erase") setTool("paint");
          }}
        >Тайл</button>
      </div>
      <div className="sep" />
      <label className="row" title="Тип дороги для инструмента «Дорога»">
        Дорога:&nbsp;
        <select
          value={activeRoadId}
          onChange={(e) => {
            setActiveRoad(e.target.value);
            setTool("road");
          }}
        >
          {roads.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </label>
      <label className="row" title="Free-hand: рисовать дорогу свободно по курсору. Иначе — привязка к рёбрам/центрам гексов.">
        <input type="checkbox" checked={freeHandRoad} onChange={toggleFreeHandRoad} />
        &nbsp;Free-hand
      </label>
      <div className="sep" />
      <label className="row" title="Показать/скрыть контуры гексов">
        <input type="checkbox" checked={showGrid} onChange={toggleGrid} />
        &nbsp;Сетка
      </label>
    </div>
  );
}
