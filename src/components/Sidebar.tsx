import { Box } from "@mantine/core";
import { Toolbar } from "./Toolbar";
import { TilePalette } from "./TilePalette";
import { useThemeDecorations } from "../themes/registry";

/** Содержимое сайдбара без позиционирования — это работа SidebarShell.
 *  Если тема определяет SidebarContent — рендерим его вместо стандарта. */
export function Sidebar() {
  const decor = useThemeDecorations();
  const Content = decor.SidebarContent;
  return (
    <div className="app-sidebar-inner">
      <div className="app-sidebar-scroll">
        {Content ? <Content /> : (
          <>
            <Toolbar />
            <Box mt="md" />
            <TilePalette />
          </>
        )}
      </div>
      {decor.NavbarOverlay && <decor.NavbarOverlay />}
    </div>
  );
}
