import { useEffect, useState } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(pointer: coarse)").matches;
}

type Tab = "desktop" | "touch";

export function HelpModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(() => (isCoarsePointer() ? "touch" : "desktop"));

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Управление</h2>
          <button className="modal-close" onClick={onClose} title="Закрыть (Esc)">×</button>
        </div>
        <div className="modal-tabs">
          <button
            className={tab === "desktop" ? "active" : ""}
            onClick={() => setTab("desktop")}
          >🖥 ПК / мышь</button>
          <button
            className={tab === "touch" ? "active" : ""}
            onClick={() => setTab("touch")}
          >📱 Тач / планшет</button>
        </div>
        <div className="modal-body">
          {tab === "desktop" ? <DesktopHelp /> : <TouchHelp />}
        </div>
      </div>
    </div>
  );
}

function Row({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="help-row">
      <kbd>{keys}</kbd>
      <span>{desc}</span>
    </div>
  );
}

function DesktopHelp() {
  return (
    <>
      <h3>Инструменты</h3>
      <Row keys="B" desc="Режим «Биом» (окружение). Не сбрасывает текущий инструмент — оставляет paint/erase." />
      <Row keys="T" desc="Режим «Тайл» (объект/иконка). Аналогично — режим, не инструмент." />
      <Row keys="R" desc="Инструмент «Дорога»." />
      <Row keys="E" desc="Инструмент «Ластик» (стирает биом или тайл по текущему режиму)." />
      <Row keys="L" desc="Инструмент «Подпись»: клик по гексу → ввод текста." />
      <Row keys="Space (удерживать)" desc="Временный pan: пока зажат пробел — drag-перенос карты, отпустишь — вернёшься к прежнему инструменту." />

      <h3>Undo / Redo</h3>
      <Row keys="Ctrl + Z" desc="Отменить последнее действие." />
      <Row keys="Ctrl + Y" desc="Повторить отменённое." />
      <Row keys="Ctrl + Shift + Z" desc="Альтернативный redo." />

      <h3>Мышь</h3>
      <Row keys="ЛКМ + drag" desc="Рисовать выбранным инструментом по гексам." />
      <Row keys="ПКМ или СКМ + drag" desc="Pan карты (без переключения инструмента)." />
      <Row keys="Колёсико" desc="Зум вокруг курсора." />
      <Row keys="Hover в палитре" desc="Превью биома/тайла во всплывающем окне." />

      <h3>Зум-кнопки (правый-нижний угол)</h3>
      <Row keys="1× / 2× / 4×" desc="Пресеты масштаба, центрируют вокруг текущего центра viewport." />
      <Row keys="Fit" desc="Вписать всю карту в видимую область." />
    </>
  );
}

function TouchHelp() {
  return (
    <>
      <h3>Жесты по карте</h3>
      <Row keys="Один палец, drag" desc="Рисовать выбранным инструментом (кисть / ластик / дорога)." />
      <Row keys="Два пальца, pinch" desc="Зум карты вокруг центра жеста. Если случайно начал рисовать — действие откатится при появлении второго пальца." />
      <Row keys="Два пальца, drag" desc="Pan карты (получается «бесплатно» через midpoint двухпальцевого жеста)." />
      <Row keys="Кнопка «✋ Перенос»" desc="Если мешает рисование — переключись на этот инструмент: одним пальцем будет двигать карту." />

      <h3>Палитра (в боковой панели)</h3>
      <Row keys="Тап по биому/тайлу" desc="Выбрать активным. Не меняет инструмент: если был ластик — стирает выбранный тип." />
      <Row keys="Long-press (~0.5 сек)" desc="Превью биома/тайла поверх активного биома. Тап вне превью — закрыть." />
      <Row keys="Табы категорий" desc="Тайлы сгруппированы (Поселения / Руины / Подземелья / …). «Все» — без фильтра." />

      <h3>UI / экспорт</h3>
      <Row keys="Зум-кнопки (правый-нижний)" desc="1× / 2× / 4× / Fit вместо pinch'а если нужна точная кратность." />
      <Row keys="Недавние ▾" desc="Последние 5 сохранённых/открытых карт хранятся в браузере." />
      <Row keys="Сохранить / Экспорт PNG" desc="Скачивает файл — на iOS/Android попадёт в «Загрузки»." />

      <h3>Если что-то идёт криво</h3>
      <div className="help-note">
        Тач-устройства различаются: какие-то жесты могут конфликтовать с системными (свайп от края, scroll). Если карта «не двигается» — попробуй инструмент «✋ Перенос» из тулбара. Если что-то стало стираться невпопад — Ctrl+Z аналогами не доберёшься, но кнопка «↶ Отмена» в TopBar работает.
      </div>
    </>
  );
}
