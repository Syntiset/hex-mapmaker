import type React from "react";
import type { AppTheme } from "../store/themeStore";

export interface SidebarShellProps {
  open: boolean;
  children: React.ReactNode;
}

export interface ThemeDecorations {
  /** Полноэкранный overlay поверх канваса (pointer-events:none, не мешает рисованию). */
  ScreenOverlay?: React.FC;
  /** Дополнительные элементы справа в статус-бар (перед "? Помощь"). */
  FooterRightExtras?: React.FC;
  /** Один-разовая boot-последовательность при первом монтировании (показ и автодисмисс). */
  BootSequence?: React.FC;
  /** Абсолютные оверлеи, прикреплённые к UI-планкам — стикеры, наклейки. */
  NavbarOverlay?: React.FC;
  /** Обёртка сайдбара — анимация, позиционирование, тематический фон/clip-path.
   *  Если не задано, используется DefaultSidebarShell (slide-in panel). */
  SidebarShell?: React.FC<SidebarShellProps>;
  /** Полная замена содержимого сайдбара. Если задано, рендерится вместо
   *  стандартного Toolbar+TilePalette. Используется когда тема хочет
   *  перерисовать UI в своём стиле (например, terminal CLI). */
  SidebarContent?: React.FC;
}

export interface ThemeDef {
  id: AppTheme;
  label: string;
  desc: string;
  preview: [string, string, string];
  decorations?: ThemeDecorations;
}
