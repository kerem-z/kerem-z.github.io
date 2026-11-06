// Trains the stops of the scroll tour (n = 5, m = 2, seed 1, 5,000 steps each)
// and posts each one as it is done. Stop 0 is the untrained model.
import { dimensionality, importanceFor, ToyModel } from "./model";

export type Stop = { density: number; decay: number; steps: number };

self.onmessage = (e: MessageEvent<Stop[]>) => {
  e.data.forEach((stop, k) => {
    const m = new ToyModel(5, 2, stop.density, importanceFor(5, stop.decay), 1);
    for (let s = 0; s < stop.steps; s++) m.step(256, 0.01);
    self.postMessage({ k, W: Array.from(m.W), b: Array.from(m.b), D: Array.from(dimensionality(m.W, 5, 2)) });
  });
};
