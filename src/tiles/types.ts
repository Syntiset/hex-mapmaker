// ============================================================
// Биомы — окружение/террейн (фон гекса, источник палитры).
// Тайлы — features/локации (только иконка + декорация-overlay).
// Гекс может иметь и биом, и тайл одновременно.
// ============================================================

export type BiomeId =
  | "wasteland"
  | "sand"
  | "ash"
  | "forest"
  | "pine-forest"
  | "burned-forest"
  | "swamp"
  | "water"
  | "toxic"
  | "mountain"
  | "peak"
  | "cliff"
  | "irradiated"
  | "anomaly";

export type IconKind =
  | "none"
  | "rad"
  | "skull"
  | "ruin"
  | "settlement"
  | "megacity"
  | "trader-post"
  | "diner"
  | "factory"
  | "slum"
  | "vault"
  | "vault-sealed"
  | "vault-open"
  | "tree"
  | "tree-lone"
  | "tree-sparse"
  | "tree-dense"
  | "deadtree"
  | "deadtree-sparse"
  | "deadtree-dense"
  | "birch"
  | "mountain"
  | "crater"
  | "water"
  | "swamp"
  | "sand"
  | "debris"
  | "concrete"
  | "raider"
  | "tower"
  | "gas"
  | "mine"
  | "cave"
  | "quarry"
  | "anomaly"
  | "minefield"
  | "wreck"
  | "bunker"
  | "bos-outpost"
  | "enclave"
  | "graveyard"
  | "ash";

export type DecorationKind = "pebbles" | "cracks" | "specks" | "tufts" | "ripples" | "none";

export interface DecorationDef {
  kind: DecorationKind;
  color: string;
  density: number; // 0..1
}

export interface GlowDef {
  color: string;
  alpha: number;  // 0..1
  radius: number; // fraction of hex size (0..1.2)
}

// BiomeDef: full palette describing the terrain. Used as base layer when
// rendering a hex with cell.biomeId.
export interface BiomeDef {
  id: BiomeId;
  name: string;
  fill: string;
  fill2?: string;
  fill3?: string;
  stroke: string;
  glow?: GlowDef;
  decoration?: DecorationDef;
  // Сила процедурного noise-overlay'я (0..1). Default 0.4. Для тёмных/насыщенных
  // биомов (ash, swamp, burned-forest и т.п.) стоит понижать до 0.2-0.25,
  // иначе noise читается как пузыри/кляксы вместо текстуры поверхности.
  noiseStrength?: number;
}

// TileDef: a feature placed on top of a biome. No fill colors — biome
// provides the background. Tile contributes icon + an optional small
// decoration overlay + optional feature-specific glow (e.g., vault lights).
export interface TileDef {
  id: string;
  name: string;
  icon: IconKind;
  iconColor?: string;
  iconColor2?: string;
  iconScale?: number;         // 1 = default; >1 enlarges the icon (e.g. trees)
  glow?: GlowDef;             // tile-specific overlay glow (optional)
  decoration?: DecorationDef; // tile-specific decoration overlay (optional)
}

export interface RoadType {
  id: string;
  name: string;
  color: string;
  width: number;       // line thickness in px (relative to hex size 1.0)
  dash?: number[];     // optional dash pattern (in px relative to hex size 1.0)
  centerLine?: string; // optional inner stripe color (highway)
}
