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
    <div className="statusbar">
      <span className="statusbar-item tool-indicator">✦ <b>{tool}</b></span>
      <span className="statusbar-item">Гекс: <b>{hoverKey ?? "—"}</b></span>
      <span className="statusbar-item">Тайл: <b>{tile?.name ?? "—"}</b></span>
      {cell?.label && <span className="statusbar-item">«{cell.label}»</span>}
      <span className="statusbar-hint">B/T режим · R дорога · E ластик · L подпись · Space pan · Ctrl+Z/Y</span>
      <button className="status-help" onClick={onOpenHelp}>? Помощь</button>
    </div>
  );
}
