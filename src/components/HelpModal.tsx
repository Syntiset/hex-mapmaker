import { useState } from "react";
import { Modal, Tabs, Stack, Group, Text, Kbd, Box, SimpleGrid, UnstyledButton, Alert } from "@mantine/core";
import { useThemeStore, type AppTheme } from "../store/themeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

function isCoarsePointer(): boolean {
  return typeof window !== "undefined"
    && window.matchMedia
    && window.matchMedia("(pointer: coarse)").matches;
}

type Tab = "desktop" | "touch" | "themes";

export function HelpModal({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>(() => (isCoarsePointer() ? "touch" : "desktop"));

  return (
    <Modal
      opened={open}
      onClose={onClose}
      size="lg"
      title={<Text fw={700} c="radiation" size="sm" style={{ letterSpacing: 2, textTransform: "uppercase" }}>Управление</Text>}
      overlayProps={{ backgroundOpacity: 0.75, blur: 2 }}
      styles={{ content: { background: "var(--panel)", border: "1px solid var(--accent-2)" } }}
    >
      <Tabs value={tab} onChange={(v) => v && setTab(v as Tab)} variant="default" color="radiation">
        <Tabs.List>
          <Tabs.Tab value="desktop">🖥 ПК / мышь</Tabs.Tab>
          <Tabs.Tab value="touch">📱 Тач / планшет</Tabs.Tab>
          <Tabs.Tab value="themes">🎨 Темы</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="desktop" pt="md"><DesktopHelp /></Tabs.Panel>
        <Tabs.Panel value="touch" pt="md"><TouchHelp /></Tabs.Panel>
        <Tabs.Panel value="themes" pt="md"><ThemesTab /></Tabs.Panel>
      </Tabs>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box mb="md">
      <Text size="10px" c="wasteland.4" fw={700} mb={6} pb={4}
        style={{ textTransform: "uppercase", letterSpacing: 1.5, borderBottom: "1px solid var(--border)" }}>
        {title}
      </Text>
      <Stack gap={4}>{children}</Stack>
    </Box>
  );
}

function Row({ keys, desc }: { keys: string; desc: string }) {
  return (
    <Group gap="md" align="center" wrap="nowrap" style={{ borderBottom: "1px solid rgba(44,44,32,0.5)", paddingBottom: 4 }}>
      <Box w={200} style={{ flexShrink: 0 }}>
        <Kbd c="radiation" style={{ background: "var(--bg)", borderColor: "var(--border)" }}>{keys}</Kbd>
      </Box>
      <Text size="xs" style={{ flex: 1 }}>{desc}</Text>
    </Group>
  );
}

function DesktopHelp() {
  return (
    <>
      <Section title="Инструменты">
        <Row keys="B" desc="Режим «Биом» (окружение). Не сбрасывает текущий инструмент — оставляет paint/erase." />
        <Row keys="T" desc="Режим «Тайл» (объект/иконка). Аналогично — режим, не инструмент." />
        <Row keys="R" desc="Инструмент «Дорога»." />
        <Row keys="E" desc="Инструмент «Ластик» (стирает биом или тайл по текущему режиму)." />
        <Row keys="L" desc="Инструмент «Подпись»: клик по гексу → ввод текста." />
        <Row keys="Space (удерживать)" desc="Временный pan: пока зажат пробел — drag-перенос карты." />
      </Section>
      <Section title="Undo / Redo">
        <Row keys="Ctrl + Z" desc="Отменить последнее действие." />
        <Row keys="Ctrl + Y" desc="Повторить отменённое." />
        <Row keys="Ctrl + Shift + Z" desc="Альтернативный redo." />
      </Section>
      <Section title="Мышь">
        <Row keys="ЛКМ + drag" desc="Рисовать выбранным инструментом по гексам." />
        <Row keys="ПКМ или СКМ + drag" desc="Pan карты (без переключения инструмента)." />
        <Row keys="Колёсико" desc="Зум вокруг курсора." />
        <Row keys="Hover в палитре" desc="Превью биома/тайла во всплывающем окне." />
      </Section>
      <Section title="Зум-кнопки">
        <Row keys="1× / 2× / 4×" desc="Пресеты масштаба, центрируют вокруг текущего центра viewport." />
        <Row keys="Fit" desc="Вписать всю карту в видимую область." />
      </Section>
    </>
  );
}

function TouchHelp() {
  return (
    <>
      <Section title="Жесты по карте">
        <Row keys="Один палец, drag" desc="Рисовать выбранным инструментом (кисть / ластик / дорога)." />
        <Row keys="Два пальца, pinch" desc="Зум карты вокруг центра жеста." />
        <Row keys="Два пальца, drag" desc="Pan карты." />
        <Row keys="Кнопка «Перенос»" desc="Если мешает рисование — переключись на этот инструмент." />
      </Section>
      <Section title="Палитра">
        <Row keys="Тап по биому/тайлу" desc="Выбрать активным." />
        <Row keys="Long-press (~0.5 сек)" desc="Превью поверх активного биома." />
        <Row keys="Табы категорий" desc="Тайлы сгруппированы по типам. «Все» — без фильтра." />
      </Section>
      <Section title="UI / экспорт">
        <Row keys="Зум-кнопки" desc="1× / 2× / 4× / Fit вместо pinch'а." />
        <Row keys="Недавние ▾" desc="Последние 5 карт хранятся в браузере." />
        <Row keys="Сохранить / Экспорт PNG" desc="Скачивает файл — на iOS/Android попадёт в «Загрузки»." />
      </Section>
      <Alert color="wasteland" variant="light" mt="md">
        Тач-устройства различаются: какие-то жесты могут конфликтовать с системными. Если карта «не двигается» — попробуй инструмент «Перенос» из тулбара.
      </Alert>
    </>
  );
}

const THEMES: { id: AppTheme; label: string; desc: string; preview: [string, string, string] }[] = [
  { id: "default", label: "Стандартная", desc: "Тёмный военный стиль. Зелёный акцент.", preview: ["#0e0e0a", "#1c1c14", "#6fdc4a"] },
  { id: "night",   label: "Ночная",      desc: "Глубокий синий. Меньше контраста.",     preview: ["#06080f", "#0e1120", "#5aaae8"] },
  { id: "fallout", label: "Fallout",     desc: "CRT-зелень, scanlines, ржавые границы.", preview: ["#080c06", "#141a0e", "#7ae040"] },
];

function ThemesTab() {
  const { theme, setTheme } = useThemeStore();
  return (
    <>
      <Section title="Тема интерфейса">
        <SimpleGrid cols={3} spacing="sm">
          {THEMES.map((t) => {
            const active = theme === t.id;
            return (
              <UnstyledButton
                key={t.id}
                onClick={() => setTheme(t.id)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  padding: "12px 8px",
                  border: `2px solid ${active ? "var(--accent-2)" : "var(--border)"}`,
                  background: "var(--bg)",
                  color: active ? "var(--accent-2)" : "var(--text)",
                  fontSize: 11,
                  cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                <canvas
                  width={48} height={32}
                  style={{ borderRadius: 2, border: "1px solid rgba(255,255,255,0.1)" }}
                  ref={(el) => {
                    if (!el) return;
                    const ctx = el.getContext("2d")!;
                    ctx.fillStyle = t.preview[0]; ctx.fillRect(0, 0, 48, 32);
                    ctx.fillStyle = t.preview[1]; ctx.fillRect(4, 4, 40, 18);
                    ctx.fillStyle = t.preview[2]; ctx.fillRect(4, 26, 40, 3);
                  }}
                />
                <Text size="xs" fw={700}>{t.label}</Text>
                <Text size="10px" c="dimmed" ta="center" style={{ lineHeight: 1.3 }}>{t.desc}</Text>
              </UnstyledButton>
            );
          })}
        </SimpleGrid>
      </Section>
      <Alert color="wasteland" variant="light">
        Тема сохраняется в браузере и восстанавливается при следующем открытии.
      </Alert>
    </>
  );
}
