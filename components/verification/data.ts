// The toy data set: two interleaved half-moons, centred and scaled to sit
// inside [-2, 2]², with a seeded generator so the page and train.ts agree.

/** mulberry32: a small seeded uniform generator on [0, 1). */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Sample = { x: [number, number]; y: 0 | 1 };

export function moons(n: number, noise: number, seed: number): Sample[] {
  const rand = rng(seed * 31 + 5);
  const gauss = () => Math.sqrt(-2 * Math.log(1 - rand())) * Math.cos(2 * Math.PI * rand());
  const out: Sample[] = [];
  for (let i = 0; i < n; i++) {
    const y = (i % 2) as 0 | 1;
    const t = Math.PI * rand();
    // the classic pair: an upper arc, and a lower arc shifted right and down
    let px = y === 0 ? Math.cos(t) : 1 - Math.cos(t);
    let py = y === 0 ? Math.sin(t) : 0.5 - Math.sin(t);
    px += noise * gauss();
    py += noise * gauss();
    out.push({ x: [(px - 0.5) * 1.6, (py - 0.25) * 1.6], y });
  }
  return out;
}
