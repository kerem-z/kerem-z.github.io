// A two-layer network on (a + b) mod p. Gromov, "Grokking modular arithmetic"
// (2023), studies two-layer MLPs on this task with an MSE loss; the specific
// choices here (quadratic activation, AdamW with weight decay, sizes, learning
// rate) are this page's, tuned so the effect shows up in under a minute.
//   z_k = U[k, a] + V[k, b],   h_k = z_k²,   out_c = Σ_k Wo[c, k] h_k
// Inputs are one-hot, the target is the one-hot answer, training is full-batch
// on a fixed fraction of all p² pairs.

export type Config = { p: number; hidden: number; frac: number; wd: number; lr: number; seed: number };

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

export class ModNet {
  readonly p: number;
  readonly N: number;
  readonly cfg: Config;
  U: Float64Array;
  V: Float64Array;
  Wo: Float64Array;
  /** isTrain[a * p + b] */
  isTrain: Uint8Array;
  train: Int32Array;
  steps = 0;
  private ms: Float64Array[];
  private vs: Float64Array[];
  private gs: Float64Array[];
  private z: Float64Array;
  private h: Float64Array;
  private o: Float64Array;
  private gh: Float64Array;

  constructor(cfg: Config) {
    this.cfg = cfg;
    const { p, hidden: N } = cfg;
    this.p = p;
    this.N = N;
    const r = rng(cfg.seed);
    const gauss = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    this.U = Float64Array.from({ length: N * p }, gauss);
    this.V = Float64Array.from({ length: N * p }, gauss);
    this.Wo = Float64Array.from({ length: p * N }, () => gauss() / Math.sqrt(N));
    const pairs = Array.from({ length: p * p }, (_, j) => j);
    for (let i = pairs.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    const nTrain = Math.round(cfg.frac * p * p);
    this.train = Int32Array.from(pairs.slice(0, nTrain));
    this.isTrain = new Uint8Array(p * p);
    for (const j of this.train) this.isTrain[j] = 1;
    const params = [this.U, this.V, this.Wo];
    this.ms = params.map((x) => new Float64Array(x.length));
    this.vs = params.map((x) => new Float64Array(x.length));
    this.gs = params.map((x) => new Float64Array(x.length));
    this.z = new Float64Array(N);
    this.h = new Float64Array(N);
    this.o = new Float64Array(p);
    this.gh = new Float64Array(N);
  }

  private forward(a: number, b: number) {
    const { p, N, U, V, Wo, z, h, o } = this;
    for (let k = 0; k < N; k++) {
      z[k] = U[k * p + a] + V[k * p + b];
      h[k] = z[k] * z[k];
    }
    for (let c = 0; c < p; c++) {
      let s = 0;
      for (let k = 0; k < N; k++) s += Wo[c * N + k] * h[k];
      o[c] = s;
    }
    return o;
  }

  predict(a: number, b: number) {
    const o = this.forward(a, b);
    let best = 0;
    for (let c = 1; c < this.p; c++) if (o[c] > o[best]) best = c;
    return best;
  }

  /** One full-batch AdamW step; returns the training loss. */
  step(): number {
    const { p, N, Wo, z, h, gh, train } = this;
    const [gU, gV, gW] = this.gs;
    gU.fill(0);
    gV.fill(0);
    gW.fill(0);
    let loss = 0;
    const scale = 2 / train.length;
    for (const j of train) {
      const a = Math.floor(j / p);
      const b = j % p;
      const o = this.forward(a, b);
      const y = (a + b) % p;
      gh.fill(0);
      for (let c = 0; c < p; c++) {
        const e = o[c] - (c === y ? 1 : 0);
        loss += e * e;
        const gc = scale * e;
        for (let k = 0; k < N; k++) {
          gW[c * N + k] += gc * h[k];
          gh[k] += gc * Wo[c * N + k];
        }
      }
      for (let k = 0; k < N; k++) {
        const gz = 2 * z[k] * gh[k];
        gU[k * p + a] += gz;
        gV[k * p + b] += gz;
      }
    }
    const { lr, wd } = this.cfg;
    const b1 = 0.9;
    const b2 = 0.98;
    this.steps++;
    const c1 = 1 - Math.pow(b1, this.steps);
    const c2 = 1 - Math.pow(b2, this.steps);
    [this.U, this.V, this.Wo].forEach((P, j) => {
      const G = this.gs[j];
      const M = this.ms[j];
      const S = this.vs[j];
      for (let i = 0; i < P.length; i++) {
        M[i] = b1 * M[i] + (1 - b1) * G[i];
        S[i] = b2 * S[i] + (1 - b2) * G[i] * G[i];
        P[i] -= lr * (M[i] / c1 / (Math.sqrt(S[i] / c2) + 1e-8) + wd * P[i]);
      }
    });
    return loss / train.length;
  }

  /** Correct (1) or not (0) for every pair, and the train / test accuracies. */
  grid() {
    const { p } = this;
    const ok = new Uint8Array(p * p);
    let tr = 0;
    let te = 0;
    for (let a = 0; a < p; a++) {
      for (let b = 0; b < p; b++) {
        const j = a * p + b;
        ok[j] = this.predict(a, b) === (a + b) % p ? 1 : 0;
        if (this.isTrain[j]) tr += ok[j];
        else te += ok[j];
      }
    }
    const nTrain = this.train.length;
    return { ok, trainAcc: tr / nTrain, testAcc: te / (p * p - nTrain) };
  }

  /**
   * Power of the input weights U at each frequency f = 1 … (p−1)/2:
   * Σ_k |Σ_a U[k, a] e^{−2πi f a / p}|², per neuron and summed, normalised so
   * the total over frequencies is 1. (f = 0, the mean, is left out.)
   */
  spectrum() {
    const { p, N, U } = this;
    const F = (p - 1) / 2;
    const perNeuron = new Float64Array(N * F);
    const total = new Float64Array(F);
    for (let k = 0; k < N; k++) {
      for (let f = 1; f <= F; f++) {
        let re = 0;
        let im = 0;
        for (let a = 0; a < p; a++) {
          const th = (2 * Math.PI * f * a) / p;
          re += U[k * p + a] * Math.cos(th);
          im -= U[k * p + a] * Math.sin(th);
        }
        const pw = re * re + im * im;
        perNeuron[k * F + f - 1] = pw;
        total[f - 1] += pw;
      }
    }
    const sum = total.reduce((s, v) => s + v, 0) || 1;
    for (let f = 0; f < F; f++) total[f] /= sum;
    return { perNeuron, total, F };
  }
}
