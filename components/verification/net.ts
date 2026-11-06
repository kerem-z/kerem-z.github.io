// A small ReLU network and four ways of bounding it on a box of inputs:
//
//   ibp     interval arithmetic, layer by layer                     (sound)
//   crown   linear bounds carried back to the input                 (sound)
//   exact   every linear region of the network, clipped to the box  (exact, 2-D only)
//   BaB     branch and bound over ReLU phases, with exact leaves    (sound and complete, 2-D only)
//
// Conventions. W[k] is row-major with shape sizes[k+1] × sizes[k]. "Layer k"
// means the pre-activation z_k = W[k] a_{k-1} + b[k], with a_{-1} = x; hidden
// layers are followed by a ReLU, the last one is the logits. Bounds are always
// on pre-activations.

export type Net = { sizes: number[]; W: number[][]; b: number[][] };
export type Box = { lo: number[]; hi: number[] };
export type Interval = { l: Float64Array; u: Float64Array };
export type Pt = [number, number];

export const boxAround = (x: Pt, eps: number): Box => ({
  lo: [x[0] - eps, x[1] - eps],
  hi: [x[0] + eps, x[1] + eps],
});

/** Pre-activations of every layer at one input. */
export function forward(net: Net, x: ArrayLike<number>): Float64Array[] {
  const out: Float64Array[] = [];
  let a = Float64Array.from(x);
  for (let k = 0; k < net.W.length; k++) {
    const n = net.sizes[k + 1];
    const m = net.sizes[k];
    const z = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v = net.b[k][i];
      for (let j = 0; j < m; j++) v += net.W[k][i * m + j] * a[j];
      z[i] = v;
    }
    out.push(z);
    a = z.map((v) => Math.max(0, v));
  }
  return out;
}

export const logits = (net: Net, x: ArrayLike<number>) => forward(net, x)[net.W.length - 1];
export const predict = (net: Net, x: ArrayLike<number>) => {
  const z = logits(net, x);
  return z[1] > z[0] ? 1 : 0;
};

/** The specification "class k stays on top", as a linear function of the logits. */
export const marginSpec = (k: number) => Float64Array.from(k === 0 ? [1, -1] : [-1, 1]);
export const margin = (net: Net, x: ArrayLike<number>, k: number) => {
  const z = logits(net, x);
  return k === 0 ? z[0] - z[1] : z[1] - z[0];
};

// ---------------------------------------------------------------------------
// Interval bound propagation
// ---------------------------------------------------------------------------

export function ibp(net: Net, box: Box): Interval[] {
  const out: Interval[] = [];
  let lo = Float64Array.from(box.lo);
  let hi = Float64Array.from(box.hi);
  for (let k = 0; k < net.W.length; k++) {
    const n = net.sizes[k + 1];
    const m = net.sizes[k];
    const l = new Float64Array(n);
    const u = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let a = net.b[k][i];
      let b = net.b[k][i];
      for (let j = 0; j < m; j++) {
        const w = net.W[k][i * m + j];
        // a positive weight takes the low end to the low end; a negative one swaps them
        a += w >= 0 ? w * lo[j] : w * hi[j];
        b += w >= 0 ? w * hi[j] : w * lo[j];
      }
      l[i] = a;
      u[i] = b;
    }
    out.push({ l, u });
    lo = l.map((v) => Math.max(0, v));
    hi = u.map((v) => Math.max(0, v));
  }
  return out;
}

// ---------------------------------------------------------------------------
// Linear bound propagation (CROWN)
// ---------------------------------------------------------------------------

/** How an unstable ReLU's lower bound is chosen: y ≥ 0, y ≥ x, or whichever has less area. */
export type AlphaMode = "adaptive" | "zero" | "one";

/** Per hidden layer: 0 = free, +1 = forced active (z ≥ 0), −1 = forced inactive (z ≤ 0). */
export type Splits = Int8Array[];

export const noSplits = (net: Net): Splits => net.sizes.slice(1, -1).map((n) => new Int8Array(n));

export type LinearBound = {
  /** the certified lower bound on c·z_k over the box */
  value: number;
  /** c·z_k ≥ A·x + c0 for every x in the box (and in the split region) */
  A: Float64Array;
  c0: number;
  /** the box corner that minimises A·x + c0 */
  argmin: Float64Array;
  /** coefficient met by each hidden ReLU output on the way back, per layer */
  lam: Float64Array[];
};

/**
 * A lower bound on c·z_k over the box, given bounds on the pre-activations of
 * every earlier layer. Walks back through the network, replacing each ReLU by
 * a line under it (if its coefficient is positive) or over it (if negative).
 */
export function linearLower(
  net: Net,
  k: number,
  c: ArrayLike<number>,
  bounds: Interval[],
  box: Box,
  alpha: AlphaMode = "adaptive",
): LinearBound {
  let lamZ = Float64Array.from(c); // coefficients on z_j
  let c0 = 0;
  const lam: Float64Array[] = [];
  for (let j = k; j >= 0; j--) {
    const n = net.sizes[j + 1];
    const m = net.sizes[j];
    for (let i = 0; i < n; i++) c0 += lamZ[i] * net.b[j][i];
    const mu = new Float64Array(m); // coefficients on a_{j-1} (or on x when j = 0)
    for (let i = 0; i < n; i++) {
      const li = lamZ[i];
      if (li === 0) continue;
      for (let q = 0; q < m; q++) mu[q] += li * net.W[j][i * m + q];
    }
    if (j === 0) {
      lamZ = mu;
      break;
    }
    lam[j - 1] = mu;
    const { l, u } = bounds[j - 1];
    const next = new Float64Array(m);
    for (let q = 0; q < m; q++) {
      const g = mu[q];
      if (g === 0) continue;
      if (l[q] >= 0) next[q] = g; // always on: a = z
      else if (u[q] <= 0) next[q] = 0; // always off: a = 0
      else if (g > 0) {
        // need a ≥ (something): a line through the origin with slope 0 or 1
        const s = alpha === "one" ? 1 : alpha === "zero" ? 0 : u[q] >= -l[q] ? 1 : 0;
        next[q] = g * s;
      } else {
        // need a ≤ (something): the chord from (l, 0) to (u, u)
        const s = u[q] / (u[q] - l[q]);
        next[q] = g * s;
        c0 += g * -s * l[q];
      }
    }
    lamZ = next;
  }
  // minimise A·x + c0 over the box, one coordinate at a time
  const A = lamZ;
  const argmin = new Float64Array(A.length);
  let value = c0;
  for (let q = 0; q < A.length; q++) {
    argmin[q] = A[q] >= 0 ? box.lo[q] : box.hi[q];
    value += A[q] * argmin[q];
  }
  return { value, A, c0, argmin, lam };
}

export type CrownResult = { bounds: Interval[]; infeasible: boolean };

/**
 * CROWN bounds on every hidden layer, computed in order so each layer can use
 * the ones before it. With splits, a forced-active neuron gets l ← max(l, 0)
 * and a forced-inactive one u ← min(u, 0); if that empties an interval, no
 * input in the box has that activation pattern.
 */
export function crownHidden(
  net: Net,
  box: Box,
  splits?: Splits,
  alpha: AlphaMode = "adaptive",
): CrownResult {
  const L = net.W.length;
  const bounds: Interval[] = [];
  for (let k = 0; k < L - 1; k++) {
    const n = net.sizes[k + 1];
    const l = new Float64Array(n);
    const u = new Float64Array(n);
    const e = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      e.fill(0);
      e[i] = 1;
      l[i] = linearLower(net, k, e, bounds, box, alpha).value;
      e[i] = -1;
      u[i] = -linearLower(net, k, e, bounds, box, alpha).value;
      const s = splits?.[k][i] ?? 0;
      if (s > 0) l[i] = Math.max(l[i], 0);
      if (s < 0) u[i] = Math.min(u[i], 0);
      if (l[i] > u[i]) return { bounds, infeasible: true };
    }
    bounds.push({ l, u });
  }
  return { bounds, infeasible: false };
}

/** CROWN bounds on every layer including the logits (no splits). */
export function crown(net: Net, box: Box, alpha: AlphaMode = "adaptive"): Interval[] {
  const { bounds } = crownHidden(net, box, undefined, alpha);
  const L = net.W.length;
  const n = net.sizes[L];
  const l = new Float64Array(n);
  const u = new Float64Array(n);
  const e = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    e.fill(0);
    e[i] = 1;
    l[i] = linearLower(net, L - 1, e, bounds, box, alpha).value;
    e[i] = -1;
    u[i] = -linearLower(net, L - 1, e, bounds, box, alpha).value;
  }
  return [...bounds, { l, u }];
}

/** Lower bound on the margin of class k over the box. */
export function crownMargin(net: Net, box: Box, k: number, alpha: AlphaMode = "adaptive") {
  const { bounds } = crownHidden(net, box, undefined, alpha);
  return linearLower(net, net.W.length - 1, marginSpec(k), bounds, box, alpha).value;
}

/** The same lower bound, but from IBP: the margin's interval, read off the logit intervals' corners. */
export function ibpMargin(net: Net, box: Box, k: number) {
  const out = ibp(net, box)[net.W.length - 1];
  return k === 0 ? out.l[0] - out.u[1] : out.l[1] - out.u[0];
}

// ---------------------------------------------------------------------------
// Exact: the linear regions of the network (two inputs only)
// ---------------------------------------------------------------------------

/** Keep the part of a convex polygon where m·x + c ≥ 0 (Sutherland–Hodgman, one edge). */
export function clip(poly: Pt[], m0: number, m1: number, c: number): Pt[] {
  const out: Pt[] = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % n];
    const fp = m0 * p[0] + m1 * p[1] + c;
    const fq = m0 * q[0] + m1 * q[1] + c;
    if (fp >= 0) out.push(p);
    if ((fp >= 0) !== (fq >= 0)) {
      const t = fp / (fp - fq);
      out.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
    }
  }
  return out;
}

const area = (poly: Pt[]) => {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    s += p[0] * q[1] - q[0] * p[1];
  }
  return Math.abs(s) / 2;
};

const clipBox = (poly: Pt[], box: Box) => {
  let p = clip(poly, 1, 0, -box.lo[0]);
  if (p.length) p = clip(p, -1, 0, box.hi[0]);
  if (p.length) p = clip(p, 0, 1, -box.lo[1]);
  if (p.length) p = clip(p, 0, -1, box.hi[1]);
  return p;
};

/** An affine map of the two inputs: row i is M[2i]·x₀ + M[2i+1]·x₁ + c[i]. */
export type Affine = { M: Float64Array; c: Float64Array };

/** A piece of the input plane on which every ReLU keeps one phase, so the network is affine there. */
export type Region = { poly: Pt[]; pattern: Int8Array[]; maps: Affine[] };

const compose = (net: Net, k: number, a: Affine): Affine => {
  // z_k = W[k] a + b[k], where a is itself affine in x
  const n = net.sizes[k + 1];
  const m = net.sizes[k];
  const M = new Float64Array(2 * n);
  const c = Float64Array.from(net.b[k]);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      const w = net.W[k][i * m + j];
      M[2 * i] += w * a.M[2 * j];
      M[2 * i + 1] += w * a.M[2 * j + 1];
      c[i] += w * a.c[j];
    }
  }
  return { M, c };
};

/**
 * Cut the box into the network's linear regions: split by each first-layer
 * neuron's line, then, inside each piece (where the first layer is affine),
 * by each second-layer neuron's line, and so on.
 */
export function regions(net: Net, box: Box): Region[] {
  const L = net.W.length;
  type Piece = { poly: Pt[]; pattern: Int8Array[]; maps: Affine[]; a: Affine };
  const start: Pt[] = [
    [box.lo[0], box.lo[1]],
    [box.hi[0], box.lo[1]],
    [box.hi[0], box.hi[1]],
    [box.lo[0], box.hi[1]],
  ];
  let pieces: Piece[] = [
    { poly: start, pattern: [], maps: [], a: { M: Float64Array.from([1, 0, 0, 1]), c: new Float64Array(2) } },
  ];
  for (let k = 0; k < L; k++) {
    const next: Piece[] = [];
    for (const p of pieces) {
      const z = compose(net, k, p.a);
      if (k === L - 1) {
        next.push({ ...p, maps: [...p.maps, z] });
        continue;
      }
      const n = net.sizes[k + 1];
      // split this piece by every neuron of layer k in turn
      let parts: { poly: Pt[]; s: Int8Array }[] = [{ poly: p.poly, s: new Int8Array(n) }];
      for (let i = 0; i < n; i++) {
        const split: typeof parts = [];
        for (const q of parts) {
          const on = clip(q.poly, z.M[2 * i], z.M[2 * i + 1], z.c[i]);
          const off = clip(q.poly, -z.M[2 * i], -z.M[2 * i + 1], -z.c[i]);
          if (on.length >= 3 && area(on) > 1e-12) {
            const s = q.s.slice();
            s[i] = 1;
            split.push({ poly: on, s });
          }
          if (off.length >= 3 && area(off) > 1e-12) {
            const s = q.s.slice();
            s[i] = -1;
            split.push({ poly: off, s });
          }
        }
        parts = split;
      }
      for (const q of parts) {
        const M = z.M.slice();
        const c = z.c.slice();
        for (let i = 0; i < n; i++)
          if (q.s[i] < 0) {
            M[2 * i] = M[2 * i + 1] = 0;
            c[i] = 0;
          }
        next.push({ poly: q.poly, pattern: [...p.pattern, q.s], maps: [...p.maps, z], a: { M, c } });
      }
    }
    pieces = next;
  }
  return pieces.map(({ poly, pattern, maps }) => ({ poly, pattern, maps }));
}

const evalMap = (f: Affine, i: number, p: Pt) => f.M[2 * i] * p[0] + f.M[2 * i + 1] * p[1] + f.c[i];

/** The regions that meet the box, each clipped to it. */
export function within(rs: Region[], box: Box): Region[] {
  const out: Region[] = [];
  for (const r of rs) {
    const poly = clipBox(r.poly, box);
    if (poly.length >= 3) out.push({ ...r, poly });
  }
  return out;
}

/** The exact range of every neuron over the box: an affine function on a polygon peaks at a vertex. */
export function exactBounds(net: Net, inBox: Region[]): Interval[] {
  const L = net.W.length;
  const out: Interval[] = net.sizes.slice(1).map((n) => ({
    l: new Float64Array(n).fill(Infinity),
    u: new Float64Array(n).fill(-Infinity),
  }));
  for (const r of inBox)
    for (let k = 0; k < L; k++)
      for (let i = 0; i < net.sizes[k + 1]; i++)
        for (const p of r.poly) {
          const v = evalMap(r.maps[k], i, p);
          if (v < out[k].l[i]) out[k].l[i] = v;
          if (v > out[k].u[i]) out[k].u[i] = v;
        }
  return out;
}

/** The exact minimum of the margin over the box, and where it is attained. */
export function exactMargin(net: Net, inBox: Region[], k: number) {
  const L = net.W.length;
  let best = Infinity;
  let at: Pt = [0, 0];
  for (const r of inBox)
    for (const p of r.poly) {
      const z0 = evalMap(r.maps[L - 1], 0, p);
      const z1 = evalMap(r.maps[L - 1], 1, p);
      const v = k === 0 ? z0 - z1 : z1 - z0;
      if (v < best) {
        best = v;
        at = p;
      }
    }
  return { value: best, at };
}

/** The image of the box in logit space: one polygon per region, exactly. */
export function exactImage(net: Net, inBox: Region[]): Pt[][] {
  const L = net.W.length;
  return inBox.map((r) => r.poly.map((p) => [evalMap(r.maps[L - 1], 0, p), evalMap(r.maps[L - 1], 1, p)] as Pt));
}

/**
 * The largest ε (to `tol`) for which `holds(ε)` is true, by bisection on
 * [0, hi]. Only ever returns an ε at which `holds` was actually checked true,
 * so the answer is certified even if `holds` is not monotone in ε.
 */
export function bisect(holds: (eps: number) => boolean, hi: number, tol = 1e-4) {
  if (holds(hi)) return hi;
  let lo = 0;
  while (hi - lo > tol) {
    const mid = (lo + hi) / 2;
    if (holds(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

// ---------------------------------------------------------------------------
// Branch and bound over ReLU phases
// ---------------------------------------------------------------------------

export type NodeStatus = "open" | "branched" | "verified" | "infeasible" | "falsified";

export type BabNode = {
  id: number;
  parent: number;
  depth: number;
  splits: Splits;
  /** the neuron this node was split on (set once branched) */
  split?: { layer: number; i: number };
  children?: [number, number];
  /** lower bound on the margin over this sub-problem; exact if `exact` */
  lb: number;
  exact: boolean;
  status: NodeStatus;
  /** for a falsified node, the input that breaks the property */
  cex?: Pt;
};

/**
 * Proves "the margin of class k is positive on the box", or finds an input
 * where it is not. Each node fixes the phase of some ReLUs; its bound is
 * CROWN with those phases imposed. A node with no undecided unstable ReLU is
 * affine on its (polygonal) region, so it is solved exactly: that is what
 * makes this complete here. In higher dimensions the leaf would be an LP.
 */
export class BaB {
  nodes: BabNode[] = [];
  verdict: "running" | "verified" | "falsified" = "running";
  cex: Pt | null = null;
  steps = 0;

  constructor(
    readonly net: Net,
    readonly box: Box,
    readonly k: number,
  ) {
    this.bound(this.add(-1, 0, noSplits(net)));
    this.settle();
  }

  private add(parent: number, depth: number, splits: Splits) {
    const node: BabNode = { id: this.nodes.length, parent, depth, splits, lb: -Infinity, exact: false, status: "open" };
    this.nodes.push(node);
    return node;
  }

  /** Bound one node; decide it if possible. */
  private bound(node: BabNode) {
    const { net, box, k } = this;
    const L = net.W.length;
    const { bounds, infeasible } = crownHidden(net, box, node.splits);
    if (infeasible) {
      node.status = "infeasible";
      node.lb = Infinity;
      return;
    }
    const lin = linearLower(net, L - 1, marginSpec(k), bounds, box);
    // A child's region sits inside its parent's, so the parent's bound holds for it too.
    const parentLb = node.parent >= 0 ? this.nodes[node.parent].lb : -Infinity;
    node.lb = Math.max(lin.value, parentLb);
    // The corner that minimises the linear bound is a real input: try it.
    const x: Pt = [lin.argmin[0], lin.argmin[1]];
    if (margin(net, x, k) <= 0) return this.falsify(node, x);
    if (node.lb > 0) {
      node.status = "verified";
      return;
    }
    if (this.pick(node, bounds, lin.lam) === null) this.solveLeaf(node, bounds);
  }

  /** The undecided unstable ReLU whose relaxation costs the bound most (a crude BaBSR-style score). */
  private pick(node: BabNode, bounds: Interval[], lam: Float64Array[]) {
    let best: { layer: number; i: number } | null = null;
    let bestScore = -1;
    for (let j = 0; j < bounds.length; j++)
      for (let i = 0; i < bounds[j].l.length; i++) {
        const l = bounds[j].l[i];
        const u = bounds[j].u[i];
        if (node.splits[j][i] !== 0 || l >= 0 || u <= 0) continue;
        const score = Math.abs(lam[j][i]) * ((-l * u) / (u - l)) + 1e-9;
        if (score > bestScore) {
          bestScore = score;
          best = { layer: j, i };
        }
      }
    if (best) node.split = best;
    return best;
  }

  /** Every ReLU's phase is known: the region is a polygon and the margin is affine on it. */
  private solveLeaf(node: BabNode, bounds: Interval[]) {
    const { net, box, k } = this;
    const L = net.W.length;
    let poly: Pt[] = [
      [box.lo[0], box.lo[1]],
      [box.hi[0], box.lo[1]],
      [box.hi[0], box.hi[1]],
      [box.lo[0], box.hi[1]],
    ];
    let a: Affine = { M: Float64Array.from([1, 0, 0, 1]), c: new Float64Array(2) };
    for (let j = 0; j < L - 1; j++) {
      const z = compose(net, j, a);
      const n = net.sizes[j + 1];
      const M = z.M.slice();
      const c = z.c.slice();
      for (let i = 0; i < n; i++) {
        const s = node.splits[j][i];
        if (s > 0) poly = clip(poly, z.M[2 * i], z.M[2 * i + 1], z.c[i]);
        if (s < 0) poly = clip(poly, -z.M[2 * i], -z.M[2 * i + 1], -z.c[i]);
        const on = s > 0 || (s === 0 && bounds[j].l[i] >= 0);
        if (!on) {
          M[2 * i] = M[2 * i + 1] = 0;
          c[i] = 0;
        }
      }
      a = { M, c };
    }
    node.exact = true;
    if (poly.length < 3) {
      node.status = "infeasible";
      node.lb = Infinity;
      return;
    }
    const out = compose(net, L - 1, a);
    let best = Infinity;
    let at: Pt = poly[0];
    for (const p of poly) {
      const z0 = evalMap(out, 0, p);
      const z1 = evalMap(out, 1, p);
      const v = k === 0 ? z0 - z1 : z1 - z0;
      if (v < best) {
        best = v;
        at = p;
      }
    }
    node.lb = best;
    if (best > 0) node.status = "verified";
    else this.falsify(node, at);
  }

  private falsify(node: BabNode, x: Pt) {
    node.status = "falsified";
    node.cex = x;
    this.cex = x;
    this.verdict = "falsified";
  }

  private settle() {
    if (this.verdict === "running" && !this.nodes.some((n) => n.status === "open")) this.verdict = "verified";
  }

  /** The open node with the lowest bound. */
  private next() {
    let best: BabNode | null = null;
    for (const n of this.nodes) if (n.status === "open" && (!best || n.lb < best.lb)) best = n;
    return best;
  }

  /** The best lower bound on the margin over the whole box known so far. */
  get globalLb() {
    if (this.verdict === "verified") {
      let m = Infinity;
      for (const n of this.nodes) if (n.status === "verified") m = Math.min(m, n.lb);
      return m;
    }
    let m = Infinity;
    for (const n of this.nodes) if (n.status === "open") m = Math.min(m, n.lb);
    return m;
  }

  /** Split one node into its two phases and bound both. Returns false when finished. */
  step() {
    if (this.verdict !== "running") return false;
    const node = this.next();
    if (!node || !node.split) return false;
    const { layer, i } = node.split;
    node.status = "branched";
    const kids: number[] = [];
    for (const s of [1, -1]) {
      const splits = node.splits.map((a) => a.slice());
      splits[layer][i] = s;
      const child = this.add(node.id, node.depth + 1, splits);
      kids.push(child.id);
      this.bound(child);
      if (this.verdict !== "running") break;
    }
    node.children = [kids[0], kids[1] ?? -1];
    this.steps++;
    this.settle();
    return this.verdict === "running";
  }

  run(maxSteps = 5000) {
    while (this.steps < maxSteps && this.step());
    return this;
  }
}
