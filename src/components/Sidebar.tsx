import { Box, ScrollArea } from "@mantine/core";
import { Toolbar } from "./Toolbar";
import { TilePalette } from "./TilePalette";
import { useThemeDecorations } from "../themes/registry";

/** Содержимое сайдбара без позиционирования — это работа SidebarShell. */
export function Sidebar() {
  const decor = useThemeDecorations();
  return (
    <Box className="app-sidebar-inner">
      <ScrollArea scrollbarSize={6} type="hover" style={{ flex: 1, minHeight: 0 }}>
        <Toolbar />
        <Box mt="md" />
        <TilePalette />
      </ScrollArea>
      {decor.NavbarOverlay && <decor.NavbarOverlay />}
    </Box>
  );
}
