// Fills the phase diagram off the main thread, one cell per message.
import { phaseCell } from "./model";

type Job = { size: number; run: number };

self.onmessage = (e: MessageEvent<Job>) => {
  const { size, run } = e.data;
  // Visit cells in a scattered order so the picture resolves as a whole
  // rather than row by row.
  const order = Array.from({ length: size * size }, (_, j) => j);
  for (let j = order.length - 1; j > 0; j--) {
    const k = (j * 7919 + 13) % (j + 1);
    [order[j], order[k]] = [order[k], order[j]];
  }
  for (const j of order) {
    const xi = j % size;
    const yi = Math.floor(j / size);
    const rel = Math.pow(10, -1 + (2 * xi) / (size - 1));
    const density = Math.pow(10, -2 + (2 * yi) / (size - 1));
    const cell = phaseCell(rel, density, 1 + j + run * 1000);
    self.postMessage({ run, xi, yi, rel, density, ...cell });
  }
};
