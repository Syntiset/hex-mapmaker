// SVG-based icon bitmaps for complex tile icons.
// SVG strings are converted to ImageBitmap at app startup via preloadIconBitmaps().
// drawIcon uses getIconBitmap() to draw synchronously from the cache.

const RENDER_SIZE = 256;
const cache = new Map<string, ImageBitmap | null>();

// ============================================================
// SVG generators
// ============================================================

function vaultSvg(c: string, c2: string): string {
  const bolts = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    const bx = (50 + Math.cos(a) * 37).toFixed(2);
    const by = (50 + Math.sin(a) * 37).toFixed(2);
    return `<circle cx="${bx}" cy="${by}" r="3.8" fill="${c2}"/>
            <circle cx="${(+bx - 1).toFixed(1)}" cy="${(+by - 1).toFixed(1)}" r="1.5" fill="rgba(255,255,255,0.30)"/>`;
  }).join("");

  const spokes = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2;
    const x1 = (50 + Math.cos(a) * 9).toFixed(2);
    const y1 = (50 + Math.sin(a) * 9).toFixed(2);
    const x2 = (50 + Math.cos(a) * 20).toFixed(2);
    const y2 = (50 + Math.sin(a) * 20).toFixed(2);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c2}" stroke-width="2.8" stroke-linecap="round"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="doorGrad" cx="35%" cy="30%" r="70%">
      <stop offset="0%"   stop-color="#506888"/>
      <stop offset="55%"  stop-color="#2e4a6a"/>
      <stop offset="100%" stop-color="#12223a"/>
    </radialGradient>
    <radialGradient id="specGrad" cx="32%" cy="26%" r="52%">
      <stop offset="0%"   stop-color="rgba(255,255,255,0.24)"/>
      <stop offset="60%"  stop-color="rgba(255,255,255,0.06)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </radialGradient>
  </defs>
  <!-- frame shadow -->
  <circle cx="51" cy="52" r="46" fill="rgba(0,0,0,0.45)"/>
  <!-- outer frame -->
  <circle cx="50" cy="50" r="46" fill="#0c1828"/>
  <!-- door face -->
  <circle cx="50" cy="50" r="42" fill="url(#doorGrad)"/>
  <!-- groove rings -->
  <circle cx="50" cy="50" r="34" fill="none" stroke="#1a2e48" stroke-width="2.2"/>
  <circle cx="50" cy="50" r="23" fill="none" stroke="#1a2e48" stroke-width="1.6"/>
  <!-- bolts -->
  ${bolts}
  <!-- wheel spokes -->
  ${spokes}
  <!-- wheel rim -->
  <circle cx="50" cy="50" r="21" fill="none" stroke="${c2}" stroke-width="2.2"/>
  <!-- wheel hub -->
  <circle cx="50" cy="50" r="9" fill="#1e3050" stroke="${c2}" stroke-width="2"/>
  <circle cx="50" cy="50" r="4.5" fill="${c2}"/>
  <!-- vault number -->
  <text x="50" y="54" text-anchor="middle" dominant-baseline="middle"
        font-family="Consolas,monospace" font-weight="bold" font-size="10"
        fill="${c}" opacity="0.75">V</text>
  <!-- specular highlight -->
  <clipPath id="doorClip"><circle cx="50" cy="50" r="42"/></clipPath>
  <rect x="0" y="0" width="100" height="100" fill="url(#specGrad)" clip-path="url(#doorClip)"/>
</svg>`;
}

// ============================================================
// Registry — add new icons here
// ============================================================

const SVG_GENERATORS: Record<string, (c: string, c2: string) => string> = {
  vault: vaultSvg,
};

export function hasSvgIcon(iconKind: string): boolean {
  return iconKind in SVG_GENERATORS;
}

function bitmapKey(iconKind: string, c: string, c2: string): string {
  return `${iconKind}|${c}|${c2}`;
}

export function getIconBitmap(
  iconKind: string,
  iconColor: string,
  iconColor2: string,
): ImageBitmap | null {
  return cache.get(bitmapKey(iconKind, iconColor, iconColor2)) ?? null;
}

async function svgToBitmap(svgStr: string): Promise<ImageBitmap> {
  const blob = new Blob([svgStr], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await createImageBitmap(img, {
      resizeWidth: RENDER_SIZE,
      resizeHeight: RENDER_SIZE,
      resizeQuality: "high",
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function preloadIconBitmaps(
  tiles: { icon: string; iconColor?: string; iconColor2?: string }[],
): Promise<void> {
  const pending: Promise<void>[] = [];
  for (const tile of tiles) {
    const gen = SVG_GENERATORS[tile.icon];
    if (!gen) continue;
    const c = tile.iconColor ?? "#d8b840";
    const c2 = tile.iconColor2 ?? c;
    const key = bitmapKey(tile.icon, c, c2);
    if (cache.has(key)) continue;
    cache.set(key, null); // mark as loading
    pending.push(
      svgToBitmap(gen(c, c2)).then((bm) => {
        cache.set(key, bm);
      }),
    );
  }
  await Promise.all(pending);
}
