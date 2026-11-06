// A deterministic force-directed layout (Fruchterman–Reingold, then a pass
// that pushes overlapping labels apart), computed in pixels for the size the
// figure actually has.

export type Pt = { x: number; y: number };

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

export function layout(
  nodes: string[],
  edges: [string, string][],
  W: number,
  H: number,
  boxW: (n: string) => number,
  boxH: number,
  seed = 7,
): Record<string, Pt> {
  const rand = mulberry32(seed);
  const n = nodes.length;
  const index = new Map(nodes.map((v, i) => [v, i]));
  const xs = nodes.map(() => W / 2 + (rand() - 0.5) * W * 0.6);
  const ys = nodes.map(() => H / 2 + (rand() - 0.5) * H * 0.6);
  const k = Math.sqrt((W * H) / n) * 0.9;
  const E = edges.map(([a, b]) => [index.get(a)!, index.get(b)!] as const);
  const iters = 500;

  for (let it = 0; it < iters; it++) {
    const temp = (Math.min(W, H) / 8) * (1 - it / iters) + 0.5;
    const dx = new Float64Array(n);
    const dy = new Float64Array(n);
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        // Labels are wide, so horizontal distance counts for less.
        const ex = (xs[i] - xs[j]) / 1.6;
        const ey = ys[i] - ys[j];
        const d2 = Math.max(ex * ex + ey * ey, 1);
        const f = (k * k) / d2;
        dx[i] += ex * f;
        dy[i] += ey * f;
        dx[j] -= ex * f;
        dy[j] -= ey * f;
      }
    for (const [a, b] of E) {
      const ex = xs[a] - xs[b];
      const ey = ys[a] - ys[b];
      const d = Math.max(Math.hypot(ex, ey), 0.01);
      const f = d / k;
      dx[a] -= ex * f;
      dy[a] -= ey * f;
      dx[b] += ex * f;
      dy[b] += ey * f;
    }
    // a weak pull to the centre keeps loose words from drifting off
    for (let i = 0; i < n; i++) {
      dx[i] += (W / 2 - xs[i]) * 0.02;
      dy[i] += (H / 2 - ys[i]) * 0.02;
      const d = Math.max(Math.hypot(dx[i], dy[i]), 0.01);
      xs[i] += (dx[i] / d) * Math.min(d, temp);
      ys[i] += (dy[i] / d) * Math.min(d, temp);
    }
  }

  // fit to the box
  const pad = (i: number) => boxW(nodes[i]) / 2 + 4;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < n; i++) {
    minX = Math.min(minX, xs[i]);
    maxX = Math.max(maxX, xs[i]);
    minY = Math.min(minY, ys[i]);
    maxY = Math.max(maxY, ys[i]);
  }
  const maxPad = Math.max(...nodes.map((_, i) => pad(i)));
  for (let i = 0; i < n; i++) {
    xs[i] = maxPad + ((xs[i] - minX) / Math.max(maxX - minX, 1)) * (W - 2 * maxPad);
    ys[i] = boxH + ((ys[i] - minY) / Math.max(maxY - minY, 1)) * (H - 2 * boxH);
  }

  // push overlapping labels apart
  for (let it = 0; it < 300; it++) {
    let moved = false;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++) {
        const ox = (boxW(nodes[i]) + boxW(nodes[j])) / 2 + 6 - Math.abs(xs[i] - xs[j]);
        const oy = boxH + 6 - Math.abs(ys[i] - ys[j]);
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox / (boxW(nodes[i]) + boxW(nodes[j])) < oy / boxH) {
            const s = (xs[i] < xs[j] ? -1 : 1) * (ox / 2 + 0.5);
            xs[i] += s;
            xs[j] -= s;
          } else {
            const s = (ys[i] < ys[j] ? -1 : 1) * (oy / 2 + 0.5);
            ys[i] += s;
            ys[j] -= s;
          }
        }
      }
    for (let i = 0; i < n; i++) {
      xs[i] = Math.min(W - pad(i), Math.max(pad(i), xs[i]));
      ys[i] = Math.min(H - boxH / 2 - 2, Math.max(boxH / 2 + 2, ys[i]));
    }
    if (!moved) break;
  }

  return Object.fromEntries(nodes.map((v, i) => [v, { x: xs[i], y: ys[i] }]));
}

/** Pairs of labels that still overlap, for testing. */
export function overlaps(pos: Record<string, Pt>, boxW: (n: string) => number, boxH: number) {
  const names = Object.keys(pos);
  const out: [string, string][] = [];
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = pos[names[i]];
      const b = pos[names[j]];
      if (
        Math.abs(a.x - b.x) < (boxW(names[i]) + boxW(names[j])) / 2 &&
        Math.abs(a.y - b.y) < boxH
      )
        out.push([names[i], names[j]]);
    }
  return out;
}
