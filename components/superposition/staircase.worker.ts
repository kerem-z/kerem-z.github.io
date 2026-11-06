// Feature dimensionality against sparsity: one model per density, n = 24
// features in m = 6 dimensions, all equally important. Posts each model's
// per-feature dimensionalities as soon as it is trained.
import { dimensionality, ToyModel } from "./model";

const N = 24;
const M = 6;

self.onmessage = (e: MessageEvent<{ count: number; run: number }>) => {
  const { count, run } = e.data;
  for (let k = 0; k < count; k++) {
    const density = Math.pow(10, -0.1 - (1.5 * k) / (count - 1));
    const model = new ToyModel(N, M, density, new Array(N).fill(1), 1 + k + run * 100);
    const batch = Math.min(1024, Math.ceil(64 / density));
    for (let s = 0; s < 1500; s++) model.step(batch, 0.01);
    let fro = 0;
    for (const w of model.W) fro += w * w;
    self.postMessage({ run, k, density, D: Array.from(dimensionality(model.W, N, M)), perFeature: M / fro });
  }
};
