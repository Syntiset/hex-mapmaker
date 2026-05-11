import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "default" | "night" | "fallout" | "terminal";

interface ThemeState {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "default",
      setTheme: (theme) => {
        document.documentElement.dataset.theme = theme;
        set({ theme });
      },
    }),
    { name: "hex-mapmaker-theme" }
  )
);

export function initTheme() {
  try {
    const raw = localStorage.getItem("hex-mapmaker-theme");
    if (raw) {
      const { state } = JSON.parse(raw);
      if (state?.theme) document.documentElement.dataset.theme = state.theme;
    }
  } catch { /* ignore */ }
}
