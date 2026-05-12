import type { SidebarShellProps } from "./types";

/** Дефолтная обёртка сайдбара: панель слева, slide-in из-за края. */
export function DefaultSidebarShell({ open, children }: SidebarShellProps) {
  return (
    <div className={`app-sidebar app-sidebar-default ${open ? "is-open" : ""}`} aria-hidden={!open}>
      {children}
    </div>
  );
}
