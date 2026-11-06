// Trains one ModNet in small slices so it can be paused, and posts a snapshot
// every SNAP steps.
import { ModNet, type Config } from "./model";

const SNAP = 100;
let net: ModNet | null = null;
let running = false;
let maxSteps = 0;
let run = 0;

function snapshot(net: ModNet, loss: number) {
  const { ok, trainAcc, testAcc } = net.grid();
  const { perNeuron } = net.spectrum();
  return { run, step: net.steps, loss, trainAcc, testAcc, ok, perNeuron: Float32Array.from(perNeuron), U: Float32Array.from(net.U) };
}

function slice() {
  if (!net || !running) return;
  let loss = 0;
  const end = Math.min(maxSteps, net.steps + SNAP);
  while (net.steps < end) loss = net.step();
  self.postMessage(snapshot(net, loss));
  if (net.steps >= maxSteps) {
    running = false;
    self.postMessage({ run, done: true });
    return;
  }
  setTimeout(slice, 0);
}

self.onmessage = (e: MessageEvent<{ type: "start"; cfg: Config; maxSteps: number; run: number } | { type: "pause" } | { type: "resume"; maxSteps: number }>) => {
  const msg = e.data;
  if (msg.type === "start") {
    net = new ModNet(msg.cfg);
    maxSteps = msg.maxSteps;
    run = msg.run;
    running = true;
    self.postMessage({ ...snapshot(net, NaN), isTrain: net.isTrain });
    setTimeout(slice, 0);
  } else if (msg.type === "pause") {
    running = false;
  } else if (msg.type === "resume" && net && !running) {
    maxSteps = Math.max(maxSteps, msg.maxSteps);
    running = true;
    setTimeout(slice, 0);
  }
};
