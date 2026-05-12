import type React from "react";
import type { AppTheme } from "../store/themeStore";

export interface ThemeDecorations {
  /** Полноэкранный overlay поверх канваса (pointer-events:none, не мешает рисованию). */
  ScreenOverlay?: React.FC;
  /** Дополнительные элементы справа в статус-бар (перед "? Помощь"). */
  FooterRightExtras?: React.FC;
  /** Один-разовая boot-последовательность при первом монтировании (показ и автодисмисс). */
  BootSequence?: React.FC;
  /** Абсолютные оверлеи, прикреплённые к UI-планкам — стикеры, наклейки. */
  NavbarOverlay?: React.FC;
}

export interface ThemeDef {
  id: AppTheme;
  label: string;
  desc: string;
  preview: [string, string, string];
  decorations?: ThemeDecorations;
}
