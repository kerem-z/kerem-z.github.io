// Finds every smallest grounding set off the main thread (it takes most of a
// second in a browser, which is too long to freeze the page for).
import { minimumSets } from "./dictionary";

self.onmessage = () => {
  const m = minimumSets();
  const sets: string[][] = [];
  for (let i = 0; i < m.count; i++) sets.push(m.nth(i));
  self.postMessage({ size: m.size, sets });
};
