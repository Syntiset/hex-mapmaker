import { useMapStore } from "../store/mapStore";

interface Props {
  hoverKey: string | null;
}

export function StatusBar({ hoverKey }: Props) {
  const cells = useMapStore((s) => s.cells);
  const tiles = useMapStore((s) => s.tiles);
  const tool = useMapStore((s) => s.tool);
  const cell = hoverKey ? cells[hoverKey] : undefined;
  const tile = cell?.tileId ? tiles.find((t) => t.id === cell.tileId) : undefined;

  return (
    <div className="statusbar">
      <span>Инструмент: <b>{tool}</b></span>
      <span>Гекс: {hoverKey ?? "—"}</span>
      <span>Тайл: {tile?.name ?? "пусто"}</span>
      {cell?.label && <span>Подпись: «{cell.label}»</span>}
      <span className="hint">ЛКМ — рисовать · ПКМ/средняя — двигать · колесо — зум · Ctrl+Z/Y — отмена/повтор</span>
    </div>
  );
}
