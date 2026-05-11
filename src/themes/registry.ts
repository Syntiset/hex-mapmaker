import { useThemeStore } from "../store/themeStore";
import type { ThemeDecorations, ThemeDef } from "./types";
import { TERMINAL_DECORATIONS } from "./terminal";

export const THEMES: ThemeDef[] = [
  { id: "default",  label: "Стандартная", desc: "Тёмный военный стиль. Зелёный акцент.",      preview: ["#0e0e0a", "#1c1c14", "#6fdc4a"] },
  { id: "night",    label: "Ночная",      desc: "Глубокий синий. Меньше контраста.",          preview: ["#06080f", "#0e1120", "#5aaae8"] },
  { id: "fallout",  label: "Fallout",     desc: "Военная олива, скобы и заклёпки.",           preview: ["#080c06", "#141a0e", "#7ae040"] },
  { id: "terminal", label: "Terminal",    desc: "RobCo CRT: фосфор, виньетка, металл-корпус.", preview: ["#050805", "#1c2418", "#88ff60"], decorations: TERMINAL_DECORATIONS },
];

const EMPTY: ThemeDecorations = {};

/** Возвращает декорации текущей активной темы (или пустой объект). */
export function useThemeDecorations(): ThemeDecorations {
  const themeId = useThemeStore((s) => s.theme);
  const theme = THEMES.find((t) => t.id === themeId);
  return theme?.decorations ?? EMPTY;
}
