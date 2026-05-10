import { createTheme, type CSSVariablesResolver, type MantineColorsTuple } from "@mantine/core";

const wastelandGreen: MantineColorsTuple = [
  "#f3faec", "#e2f2d2", "#c2e6a3", "#9fda6f", "#83d046",
  "#73ca2c", "#69c61c", "#58af0e", "#4d9b04", "#408500",
];

const radiationYellow: MantineColorsTuple = [
  "#fff9e1", "#fff1c8", "#ffe294", "#ffd25b", "#ffc52e",
  "#ffbd13", "#ffb900", "#e3a200", "#c98f00", "#ad7a00",
];

export const mantineTheme = createTheme({
  fontFamily: "Consolas, 'Courier New', monospace",
  fontFamilyMonospace: "Consolas, 'Courier New', monospace",
  defaultRadius: 1,
  primaryColor: "wasteland",
  primaryShade: { light: 5, dark: 4 },
  colors: {
    wasteland: wastelandGreen,
    radiation: radiationYellow,
  },
  components: {
    Button: { defaultProps: { size: "xs" } },
    ActionIcon: { defaultProps: { variant: "subtle", color: "gray" } },
    Tooltip: { defaultProps: { withArrow: true, openDelay: 250, color: "dark.8" } },
    Modal: { defaultProps: { centered: true, overlayProps: { backgroundOpacity: 0.7, blur: 2 } } },
  },
});

// Map Mantine CSS vars onto our existing --bg/--panel/--accent tokens so themes (data-theme) cascade through Mantine.
export const mantineCssResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: {},
  dark: {
    "--mantine-color-body": "var(--bg)",
    "--mantine-color-text": "var(--text)",
    "--mantine-color-default": "var(--panel)",
    "--mantine-color-default-hover": "var(--bg-2)",
    "--mantine-color-default-border": "var(--border)",
    "--mantine-color-dark-7": "var(--bg)",
    "--mantine-color-dark-6": "var(--bg-2)",
    "--mantine-color-dark-5": "var(--panel)",
    "--mantine-color-dark-4": "var(--border)",
    "--mantine-color-dimmed": "#7f7a60",
  },
});
