import type { BiomeDef, RoadType, TileDef } from "./types";

// ============================================================
// БИОМЫ (14) — окружение, источник палитры
// ============================================================
export const FALLOUT_BIOMES: BiomeDef[] = [
  {
    id: "wasteland", name: "Пустошь",
    fill: "#a89478", fill2: "#94806a", fill3: "#7a6a54", stroke: "#5a4d38",
    decoration: { kind: "cracks", color: "#5a4d38", density: 0.5 },
  },
  {
    id: "sand", name: "Песок",
    fill: "#c4b48a", fill2: "#aea072", fill3: "#988a5e", stroke: "#6e5e3a",
    glow: { color: "#d4c498", alpha: 0.07, radius: 0.9 },
    decoration: { kind: "ripples", color: "#928046", density: 0.4 },
  },
  {
    id: "ash", name: "Пепел",
    fill: "#6c6860", fill2: "#56524a", fill3: "#3e3a34", stroke: "#34302a",
    glow: { color: "#5a564e", alpha: 0.08, radius: 0.85 },
    decoration: { kind: "specks", color: "#2c2820", density: 0.7 },
  },
  {
    id: "forest", name: "Лес",
    fill: "#647050", fill2: "#4e583c", fill3: "#384028", stroke: "#262c18",
    decoration: { kind: "tufts", color: "#262c18", density: 0.5 },
  },
  {
    id: "pine-forest", name: "Хвойный лес",
    fill: "#4e6440", fill2: "#3a4e30", fill3: "#243520", stroke: "#142010",
    decoration: { kind: "tufts", color: "#142010", density: 0.7 },
  },
  {
    id: "burned-forest", name: "Сгоревший лес",
    fill: "#4a4540", fill2: "#38332e", fill3: "#24201c", stroke: "#16120e",
    decoration: { kind: "specks", color: "#1a1612", density: 0.7 },
  },
  {
    id: "swamp", name: "Болото",
    fill: "#4a5440", fill2: "#363e30", fill3: "#262c22", stroke: "#1a1e14",
    decoration: { kind: "tufts", color: "#384228", density: 0.7 },
  },
  {
    id: "water", name: "Вода",
    fill: "#4a6878", fill2: "#3a5260", fill3: "#283c48", stroke: "#1a2a32",
    glow: { color: "#80a0b8", alpha: 0.10, radius: 0.95 },
    decoration: { kind: "ripples", color: "#9cb8c8", density: 0.6 },
  },
  {
    id: "toxic", name: "Токс. вода",
    fill: "#5a7048", fill2: "#445632", fill3: "#2e3e22", stroke: "#1c2614",
    glow: { color: "#a0b860", alpha: 0.12, radius: 0.95 },
    decoration: { kind: "ripples", color: "#b0c080", density: 0.6 },
  },
  {
    id: "mountain", name: "Горы",
    fill: "#8a847c", fill2: "#6e6860", fill3: "#544e48", stroke: "#3a342e",
    decoration: { kind: "pebbles", color: "#3a342e", density: 0.6 },
  },
  {
    id: "peak", name: "Снежный пик",
    fill: "#a0989c", fill2: "#807c80", fill3: "#605c5e", stroke: "#3e3a3c",
    glow: { color: "#c8c4d0", alpha: 0.10, radius: 0.95 },
    decoration: { kind: "pebbles", color: "#48424a", density: 0.4 },
  },
  {
    id: "cliff", name: "Обрыв",
    fill: "#94908a", fill2: "#7a766f", fill3: "#5a5650", stroke: "#3a3630",
    decoration: { kind: "cracks", color: "#26221c", density: 0.7 },
  },
  {
    id: "irradiated", name: "Радзона",
    fill: "#94a868", fill2: "#7e9054", fill3: "#5e7038", stroke: "#3a4a20",
    glow: { color: "#a8c060", alpha: 0.14, radius: 0.95 },
    decoration: { kind: "specks", color: "#c8d878", density: 0.7 },
  },
  {
    id: "anomaly", name: "Аномалия",
    fill: "#5a4a60", fill2: "#6e5c78", fill3: "#3e3244", stroke: "#241e30",
    glow: { color: "#a890c0", alpha: 0.18, radius: 1.0 },
    decoration: { kind: "specks", color: "#d8c0e0", density: 0.5 },
  },
];

export const FALLOUT_BIOME_DEFAULT = FALLOUT_BIOMES[0];

// ============================================================
// ТАЙЛЫ (28) — features, биом-агностичны
// Только iconColor + опц. decoration/glow поверх биома
// ============================================================
export const FALLOUT_TILES: TileDef[] = [
  // ── Поселения ──
  {
    id: "settlement", name: "Поселение",
    icon: "settlement", iconColor: "#1c1208", iconColor2: "#7a5832",
    glow: { color: "#c8a878", alpha: 0.06, radius: 0.85 },
  },
  {
    id: "megacity", name: "Мегаполис",
    icon: "megacity", iconColor: "#1a140e", iconColor2: "#e8c060",
    glow: { color: "#a89878", alpha: 0.10, radius: 1.0 },
    decoration: { kind: "pebbles", color: "#2a221a", density: 0.4 },
  },
  {
    id: "trader-post", name: "Торговый пост",
    icon: "trader-post", iconColor: "#3a2a14", iconColor2: "#7a5a32",
    glow: { color: "#c89858", alpha: 0.08, radius: 0.85 },
  },
  {
    id: "diner", name: "Закусочная",
    icon: "diner", iconColor: "#3a2820", iconColor2: "#e8c050",
    glow: { color: "#c89858", alpha: 0.07, radius: 0.75 },
  },
  {
    id: "factory", name: "Завод",
    icon: "factory", iconColor: "#28201a", iconColor2: "#5a4630",
    decoration: { kind: "pebbles", color: "#1a1814", density: 0.4 },
  },
  {
    id: "slum", name: "Трущобы",
    icon: "slum", iconColor: "#3a2c20",
    decoration: { kind: "pebbles", color: "#221a14", density: 0.5 },
  },

  // ── Инфраструктура / руины ──
  {
    id: "ruins", name: "Руины",
    icon: "ruin", iconColor: "#1c160e",
    decoration: { kind: "pebbles", color: "#2a241c", density: 0.5 },
  },
  {
    id: "concrete", name: "Бетон",
    icon: "concrete", iconColor: "#363230",
    decoration: { kind: "cracks", color: "#1c1a18", density: 0.5 },
  },
  {
    id: "tower", name: "Вышка",
    icon: "tower", iconColor: "#1a1410",
  },
  {
    id: "gas", name: "Заправка",
    icon: "gas", iconColor: "#902020", iconColor2: "#1a1a14",
  },
  {
    id: "raider", name: "Лагерь рейд.",
    icon: "raider", iconColor: "#0e0804", iconColor2: "#b08434",
    glow: { color: "#a05a40", alpha: 0.08, radius: 0.85 },
  },

  // ── Подземелья ──
  {
    id: "mine", name: "Шахта",
    icon: "mine", iconColor: "#0c0a08", iconColor2: "#bfa856",
  },
  {
    id: "cave-entrance", name: "Пещера",
    icon: "cave", iconColor: "#28221c", iconColor2: "#7e6a4c",
    glow: { color: "#1a1814", alpha: 0.16, radius: 0.55 },
  },
  {
    id: "quarry", name: "Карьер",
    icon: "quarry", iconColor: "#3a2e22", iconColor2: "#5a4a36",
    decoration: { kind: "pebbles", color: "#2c241c", density: 0.5 },
  },

  // ── Опасные зоны ──
  {
    id: "debris", name: "Обломки",
    icon: "debris", iconColor: "#1a140c",
    decoration: { kind: "pebbles", color: "#2c241a", density: 0.6 },
  },
  {
    id: "wreck", name: "Авто-обломки",
    icon: "wreck", iconColor: "#3a2c20", iconColor2: "#574030",
  },
  {
    id: "minefield", name: "Мин. поле",
    icon: "minefield", iconColor: "#8a3030",
    glow: { color: "#a04a3c", alpha: 0.07, radius: 0.85 },
  },
  {
    id: "crater", name: "Кратер",
    icon: "crater", iconColor: "#1a1208",
    glow: { color: "#a86848", alpha: 0.10, radius: 0.65 },
  },
  {
    id: "graveyard", name: "Кладбище",
    icon: "graveyard", iconColor: "#1a1a14", iconColor2: "#bcbcbc",
  },

  // ── Растительность (на любом биоме) ──
  {
    id: "lone-tree", name: "Одинокое дерево",
    icon: "tree-lone", iconColor: "#2a4018", iconColor2: "#3a5a24",
  },
  {
    id: "sparse-grove", name: "Редкая роща",
    icon: "tree-sparse", iconColor: "#28401a", iconColor2: "#3a5a24",
  },
  {
    id: "grove", name: "Роща",
    icon: "tree", iconColor: "#243b18", iconColor2: "#345020",
  },
  {
    id: "dense-forest", name: "Густой лес",
    icon: "tree-dense", iconColor: "#1c3010", iconColor2: "#2a4218",
  },
  {
    id: "dead-grove", name: "Сухая роща",
    icon: "deadtree-sparse", iconColor: "#3e342a", iconColor2: "#5a4a36",
  },
  {
    id: "dense-deadwood", name: "Густой сухостой",
    icon: "deadtree-dense", iconColor: "#322a20", iconColor2: "#48382a",
  },
  {
    id: "birch-cluster", name: "Берёзовая роща",
    icon: "birch", iconColor: "#3a4a28", iconColor2: "#5a6e3c",
  },

  // ── Радиоактивные феномены (на любом биоме) ──
  {
    id: "glowing-pool", name: "Рад. лужа",
    icon: "water", iconColor: "#c0d878",
    glow: { color: "#b0d860", alpha: 0.20, radius: 0.85 },
    decoration: { kind: "ripples", color: "#c0d878", density: 0.6 },
  },
  {
    id: "mutated-flora", name: "Мутафлора",
    icon: "tree", iconColor: "#1a3008", iconColor2: "#5a8024",
    glow: { color: "#a8d050", alpha: 0.12, radius: 0.85 },
    decoration: { kind: "tufts", color: "#3a5a18", density: 0.5 },
  },
  {
    id: "fungal-bloom", name: "Грибной мутант",
    icon: "swamp", iconColor: "#7c5e88", iconColor2: "#3a2840",
    glow: { color: "#9874a8", alpha: 0.14, radius: 0.85 },
    decoration: { kind: "pebbles", color: "#5a3a68", density: 0.4 },
  },

  // ── Убежища ──
  {
    id: "vault", name: "Убежище",
    icon: "vault", iconColor: "#d8b840", iconColor2: "#cccccc",
    glow: { color: "#6090b0", alpha: 0.10, radius: 0.85 },
  },
  {
    id: "vault-sealed", name: "Запеч. убежище",
    icon: "vault-sealed", iconColor: "#5a4a28", iconColor2: "#888888",
    glow: { color: "#3e5a72", alpha: 0.06, radius: 0.75 },
  },
  {
    id: "vault-open", name: "Откр. убежище",
    icon: "vault-open", iconColor: "#f0c850", iconColor2: "#e0e0e0",
    glow: { color: "#80b8d8", alpha: 0.18, radius: 1.0 },
  },
  {
    id: "bunker", name: "Бункер БС",
    icon: "bunker", iconColor: "#b89438", iconColor2: "#1a1a18",
    glow: { color: "#506a7c", alpha: 0.06, radius: 0.75 },
  },
  {
    id: "bos-outpost", name: "БС-пост",
    icon: "bos-outpost", iconColor: "#3a3530", iconColor2: "#c8a040",
    glow: { color: "#5a7088", alpha: 0.08, radius: 0.85 },
  },
  {
    id: "enclave-base", name: "База Анклава",
    icon: "enclave", iconColor: "#2a3040", iconColor2: "#88b0c8",
    glow: { color: "#4060a0", alpha: 0.14, radius: 0.85 },
  },
];

export const FALLOUT_DEFAULT = FALLOUT_TILES[0];

export const ROAD_TYPES: RoadType[] = [
  { id: "highway", name: "Шоссе",      color: "#1a1812", width: 0.30, centerLine: "#c8b048" },
  { id: "asphalt", name: "Асфальт",    color: "#2a2620", width: 0.22 },
  { id: "dirt",    name: "Грунтовка",  color: "#5e4628", width: 0.18, dash: [0.30, 0.18] },
  { id: "trail",   name: "Тропа",      color: "#4a3a20", width: 0.08, dash: [0.14, 0.14] },
  { id: "rail",    name: "Ж/д путь",   color: "#1f1c14", width: 0.22, dash: [0.10, 0.10] },
];

export const ROAD_DEFAULT = ROAD_TYPES[0];
