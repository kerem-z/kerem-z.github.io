// An invented script. Each glyph is a short pen path on a 3×3 lattice of
// points, drawn from a seeded generator, so the shapes are stable from visit to
// visit and mean nothing to anyone. Shared with the symbol-grounding post.

export type Stroke = readonly [number, number, number, number]; // x1 y1 x2 y2, lattice units 0–2
export type Glyph = readonly Stroke[];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEIGHBOURS: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

const edgeKey = (x1: number, y1: number, x2: number, y2: number) =>
  x1 < x2 || (x1 === x2 && y1 < y2) ? `${x1}${y1}${x2}${y2}` : `${x2}${y2}${x1}${y1}`;

/** One glyph: a pen walk of 3–5 strokes, sometimes with a short second stroke. */
function makeGlyph(rand: () => number): Glyph {
  const strokes: Stroke[] = [];
  const used = new Set<string>();
  const walk = (x: number, y: number, len: number) => {
    for (let k = 0; k < len; k++) {
      const options = NEIGHBOURS.map(([dx, dy]) => [x + dx, y + dy] as const).filter(
        ([nx, ny]) => nx >= 0 && nx <= 2 && ny >= 0 && ny <= 2 && !used.has(edgeKey(x, y, nx, ny)),
      );
      // Prefer straight strokes; diagonals make the script look like noise.
      const straight = options.filter(([nx, ny]) => nx === x || ny === y);
      const pool = straight.length && rand() < 0.72 ? straight : options;
      if (!pool.length) return;
      const [nx, ny] = pool[Math.floor(rand() * pool.length)];
      used.add(edgeKey(x, y, nx, ny));
      strokes.push([x, y, nx, ny]);
      x = nx;
      y = ny;
    }
  };
  walk(Math.floor(rand() * 3), Math.floor(rand() * 3), 3 + Math.floor(rand() * 3));
  if (rand() < 0.45) walk(Math.floor(rand() * 3), Math.floor(rand() * 3), 1);
  return strokes;
}

const canonical = (g: Glyph) =>
  g
    .map(([a, b, c, d]) => edgeKey(a, b, c, d))
    .sort()
    .join("|");

/** A distinct glyph for every key, the same ones on every visit. */
export function makeScript(keys: readonly string[], seed: number): Record<string, Glyph> {
  const rand = mulberry32(seed);
  const seen = new Set<string>();
  const out: Record<string, Glyph> = {};
  for (const key of keys) {
    for (;;) {
      const g = makeGlyph(rand);
      const c = canonical(g);
      if (g.length >= 3 && !seen.has(c)) {
        seen.add(c);
        out[key] = g;
        break;
      }
    }
  }
  return out;
}
