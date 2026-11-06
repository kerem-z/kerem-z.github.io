// The ReLU output model from Elhage et al., "Toy Models of Superposition" (2022):
//   h = W x,   x' = ReLU(Wᵀ h + b),   L = E_x Σ_i I_i (x_i − x'_i)²
// x ∈ [0,1]ⁿ: each x_i is 0 with probability 1 − density, otherwise uniform on [0,1].
// W is m × n, stored row-major (W[k*n + i] is row k, column i); column i is the
// direction feature i is written to. Trained with Adam on fresh batches.

export type Params = { n: number; m: number; density: number; decay: number };

/** mulberry32: a small seeded generator, so a run can be repeated. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ToyModel {
  readonly n: number;
  readonly m: number;
  readonly density: number;
  readonly importance: Float64Array;
  W: Float64Array;
  b: Float64Array;
  steps = 0;
  private rand: () => number;
  private mW: Float64Array;
  private vW: Float64Array;
  private mb: Float64Array;
  private vb: Float64Array;
  private t = 0;
  // scratch
  private x: Float64Array;
  private h: Float64Array;
  private g: Float64Array;
  private Wg: Float64Array;
  private gW: Float64Array;
  private gb: Float64Array;

  constructor(n: number, m: number, density: number, importance: ArrayLike<number>, seed = 1) {
    this.n = n;
    this.m = m;
    this.density = density;
    this.importance = Float64Array.from(importance);
    this.rand = rng(seed);
    this.W = new Float64Array(m * n);
    // Xavier-normal init via Box–Muller
    const s = Math.sqrt(2 / (m + n));
    for (let j = 0; j < m * n; j++) {
      const u = 1 - this.rand();
      const v = this.rand();
      this.W[j] = s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }
    this.b = new Float64Array(n);
    this.mW = new Float64Array(m * n);
    this.vW = new Float64Array(m * n);
    this.mb = new Float64Array(n);
    this.vb = new Float64Array(n);
    this.x = new Float64Array(n);
    this.h = new Float64Array(m);
    this.g = new Float64Array(n);
    this.Wg = new Float64Array(m);
    this.gW = new Float64Array(m * n);
    this.gb = new Float64Array(n);
  }

  /** Forget Adam's moments (after the weights were moved by hand). */
  resetOptimizer() {
    this.mW.fill(0);
    this.vW.fill(0);
    this.mb.fill(0);
    this.vb.fill(0);
    this.t = 0;
  }

  sample(out: Float64Array) {
    for (let i = 0; i < this.n; i++) {
      out[i] = this.rand() < this.density ? this.rand() : 0;
    }
  }

  /**
   * Loss and, if `accumulate`, its gradient for one input x (added into gW, gb).
   * dL/dW_{k,i} = g_i h_k + (W g)_k x_i, with g_i = 2 I_i (x'_i − x_i) 1[y_i > 0].
   */
  private forwardBackward(x: Float64Array, accumulate: boolean): number {
    const { n, m, W, b, h, g, Wg, importance } = this;
    for (let k = 0; k < m; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += W[k * n + i] * x[i];
      h[k] = s;
    }
    let loss = 0;
    for (let i = 0; i < n; i++) {
      let y = b[i];
      for (let k = 0; k < m; k++) y += W[k * n + i] * h[k];
      const r = y > 0 ? y : 0;
      const e = r - x[i];
      loss += importance[i] * e * e;
      g[i] = y > 0 ? 2 * importance[i] * e : 0;
    }
    if (!accumulate) return loss;
    for (let k = 0; k < m; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += W[k * n + i] * g[i];
      Wg[k] = s;
    }
    for (let k = 0; k < m; k++) {
      for (let i = 0; i < n; i++) {
        this.gW[k * n + i] += g[i] * h[k] + Wg[k] * x[i];
      }
    }
    for (let i = 0; i < n; i++) this.gb[i] += g[i];
    return loss;
  }

  /** One Adam step on a fresh batch; returns the batch's mean loss. */
  step(batch = 512, lr = 0.01): number {
    this.gW.fill(0);
    this.gb.fill(0);
    let loss = 0;
    for (let s = 0; s < batch; s++) {
      this.sample(this.x);
      loss += this.forwardBackward(this.x, true);
    }
    const b1 = 0.9, b2 = 0.999, eps = 1e-8;
    this.t++;
    const c1 = 1 - Math.pow(b1, this.t);
    const c2 = 1 - Math.pow(b2, this.t);
    const upd = (p: Float64Array, gr: Float64Array, mo: Float64Array, ve: Float64Array) => {
      for (let j = 0; j < p.length; j++) {
        const gj = gr[j] / batch;
        mo[j] = b1 * mo[j] + (1 - b1) * gj;
        ve[j] = b2 * ve[j] + (1 - b2) * gj * gj;
        p[j] -= (lr * (mo[j] / c1)) / (Math.sqrt(ve[j] / c2) + eps);
      }
    };
    upd(this.W, this.gW, this.mW, this.vW);
    upd(this.b, this.gb, this.mb, this.vb);
    this.steps++;
    return loss / batch;
  }

  /** Mean loss on a fixed set of inputs (n values per input, concatenated). */
  evaluate(inputs: Float64Array): number {
    const count = inputs.length / this.n;
    let loss = 0;
    for (let s = 0; s < count; s++) {
      loss += this.forwardBackward(inputs.subarray(s * this.n, (s + 1) * this.n), false);
    }
    return loss / count;
  }

  makeEvalSet(count: number, seed: number): Float64Array {
    const r = rng(seed);
    const out = new Float64Array(count * this.n);
    for (let j = 0; j < out.length; j++) out[j] = r() < this.density ? r() : 0;
    return out;
  }
}

export function importanceFor(n: number, decay: number): number[] {
  return Array.from({ length: n }, (_, i) => Math.pow(decay, i));
}

/** Gram matrix Wᵀ W (n × n): entry (i, j) is W_i · W_j. */
export function gram(W: Float64Array, n: number, m: number): Float64Array {
  const G = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      let s = 0;
      for (let k = 0; k < m; k++) s += W[k * n + i] * W[k * n + j];
      G[i * n + j] = s;
    }
  }
  return G;
}

/**
 * Feature dimensionality from the paper: D_i = ‖W_i‖² / Σ_j (Ŵ_i · W_j)².
 * 1 for a feature with a dimension to itself, 1/2 for an antipodal pair,
 * 2/5 for a pentagon; 0 for a feature that is not represented.
 */
export function dimensionality(W: Float64Array, n: number, m: number): Float64Array {
  const G = gram(W, n, m);
  const D = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const nn = G[i * n + i];
    if (nn < 1e-4) continue;
    let s = 0;
    for (let j = 0; j < n; j++) s += (G[i * n + j] * G[i * n + j]) / nn;
    D[i] = nn / s;
  }
  return D;
}

/** x' = ReLU(Wᵀ W x + b) for one input. */
export function reconstruct(W: Float64Array, b: Float64Array, n: number, m: number, x: ArrayLike<number>) {
  const h = new Float64Array(m);
  for (let k = 0; k < m; k++) {
    let s = 0;
    for (let i = 0; i < n; i++) s += W[k * n + i] * x[i];
    h[k] = s;
  }
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let y = b[i];
    for (let k = 0; k < m; k++) y += W[k * n + i] * h[k];
    out[i] = y > 0 ? y : 0;
  }
  return out;
}

export type Phase = "ignored" | "dedicated" | "superposed";

/**
 * One cell of the phase diagram: n = 2 features squeezed into m = 1 dimension.
 * Sparse inputs are mostly zeros, so the batch grows as density falls. Two
 * restarts, keeping the lower loss on held-out inputs, because single runs
 * sometimes stop in a worse local minimum.
 */
export function phaseCell(relImportance: number, density: number, seed: number, restarts = 2, steps = 600) {
  const batch = Math.min(1024, Math.ceil(48 / density));
  let best: { loss: number; W: Float64Array; b: Float64Array } | null = null;
  for (let k = 0; k < restarts; k++) {
    const model = new ToyModel(2, 1, density, [1, relImportance], seed * 7 + k);
    for (let s = 0; s < steps; s++) model.step(batch, 0.03);
    const loss = model.evaluate(model.makeEvalSet(4096, seed));
    if (!best || loss < best.loss) best = { loss, W: model.W, b: model.b };
  }
  const [w1, w2] = best!.W;
  const on1 = Math.abs(w1) > 0.5;
  const on2 = Math.abs(w2) > 0.5;
  const phase: Phase = on1 && on2 ? "superposed" : on2 ? "dedicated" : "ignored";
  return { w1, w2, b1: best!.b[0], b2: best!.b[1], loss: best!.loss, phase };
}

/**
 * The loss as a function of where column `col` sits, with every other weight
 * held fixed: a res × res grid over [−R, R]² (row 0 at the top, y = +R).
 * Only valid for m = 2.
 */
export function lossLandscape(
  W: Float64Array,
  b: Float64Array,
  n: number,
  importance: ArrayLike<number>,
  inputs: Float64Array,
  col: number,
  R: number,
  res: number,
) {
  const count = inputs.length / n;
  // the part of h that does not depend on column `col`
  const rest0 = new Float64Array(count);
  const rest1 = new Float64Array(count);
  const xc = new Float64Array(count);
  for (let s = 0; s < count; s++) {
    let a0 = 0;
    let a1 = 0;
    for (let i = 0; i < n; i++) {
      if (i === col) continue;
      const v = inputs[s * n + i];
      a0 += W[i] * v;
      a1 += W[n + i] * v;
    }
    rest0[s] = a0;
    rest1[s] = a1;
    xc[s] = inputs[s * n + col];
  }
  const out = new Float64Array(res * res);
  for (let r = 0; r < res; r++) {
    const wy = R - (2 * R * r) / (res - 1);
    for (let c = 0; c < res; c++) {
      const wx = -R + (2 * R * c) / (res - 1);
      let loss = 0;
      for (let s = 0; s < count; s++) {
        const h0 = rest0[s] + wx * xc[s];
        const h1 = rest1[s] + wy * xc[s];
        for (let i = 0; i < n; i++) {
          const y = b[i] + (i === col ? wx * h0 + wy * h1 : W[i] * h0 + W[n + i] * h1);
          const e = (y > 0 ? y : 0) - inputs[s * n + i];
          loss += importance[i] * e * e;
        }
      }
      out[r * res + c] = loss / count;
    }
  }
  return out;
}
