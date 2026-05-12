import { Box } from "@mantine/core";
import { Toolbar } from "./Toolbar";
import { TilePalette } from "./TilePalette";
import { useThemeDecorations } from "../themes/registry";

/** Содержимое сайдбара без позиционирования — это работа SidebarShell.
 *  ВАЖНО: явный width:100% + min-width:0 на скроллере, иначе flex-child
 *  раскроется по natural width контента и выедет за границы. */
export function Sidebar() {
  const decor = useThemeDecorations();
  return (
    <div className="app-sidebar-inner">
      <div className="app-sidebar-scroll">
        <Toolbar />
        <Box mt="md" />
        <TilePalette />
      </div>
      {decor.NavbarOverlay && <decor.NavbarOverlay />}
    </div>
  );
}
