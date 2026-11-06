"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import sp from "@/components/superposition/superposition.module.css";
import { Scrub, setupCanvas, TeX, usePalette, useVisible, useWidth, withAlpha } from "@/components/superposition/widgets";
import styles from "./grokking.module.css";

const P = 23;
const HIDDEN = 64;
const F = (P - 1) / 2;
const BUDGET = 20000;

type Snap = {
  step: number;
  loss: number;
  trainAcc: number;
  testAcc: number;
  ok: Uint8Array;
  perNeuron: Float32Array;
  U: Float32Array;
};

export function GrokkingEssay() {
  const [wd, setWd] = useState(0.3);
  const [frac, setFrac] = useState(0.5);
  const [seed, setSeed] = useState(2);
  const [snaps, setSnaps] = useState<Snap[]>([]);
  const [isTrain, setIsTrain] = useState<Uint8Array | null>(null);
  const [running, setRunning] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [neuron, setNeuron] = useState<number | null>(null);
  const worker = useRef<Worker | null>(null);
  const runId = useRef(0);
  const figRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(figRef);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (visible && !started) setStarted(true);
  }, [visible, started]);

  useEffect(() => {
    if (!started) return;
    const w = new Worker(new URL("./grok.worker.ts", import.meta.url));
    worker.current = w;
    const run = ++runId.current;
    setSnaps([]);
    setScrub(null);
    w.onmessage = (e) => {
      const d = e.data;
      if (d.run !== run) return;
      if (d.done) {
        setRunning(false);
        return;
      }
      if (d.isTrain) setIsTrain(d.isTrain);
      setSnaps((s) => [...s, d as Snap]);
    };
    w.postMessage({ type: "start", cfg: { p: P, hidden: HIDDEN, frac, wd, lr: 3e-3, seed }, maxSteps: BUDGET, run });
    setRunning(true);
    return () => w.terminate();
  }, [started, wd, frac, seed]);

  // pause the worker while the figure is off screen
  useEffect(() => {
    const w = worker.current;
    if (!w || !started) return;
    if (!visible && running) w.postMessage({ type: "pause" });
    if (visible && running) w.postMessage({ type: "resume", maxSteps: BUDGET });
  }, [visible, running, started]);

  const pause = () => {
    worker.current?.postMessage({ type: "pause" });
    setRunning(false);
  };
  const resume = () => {
    const last = snaps[snaps.length - 1];
    worker.current?.postMessage({ type: "resume", maxSteps: Math.max(BUDGET, (last?.step ?? 0) + 5000) });
    setScrub(null);
    setRunning(true);
  };

  const shown = scrub !== null ? snaps[scrub] : snaps[snaps.length - 1];
  // when the test accuracy first passed 95%, and how long after train did
  const firstAt = (key: "trainAcc" | "testAcc", t: number) => snaps.find((s) => s[key] >= t)?.step;
  const trainAt = firstAt("trainAcc", 0.99);
  const testAt = firstAt("testAcc", 0.95);

  return (
    <article className={`prose ${sp.root}`}>
      <p className={sp.draftNote}>
        <b>Mock post.</b> The network on this page trains in your browser, in a background thread, while you read. The
        numbers quoted in the text are from my runs with the default settings; yours are computed live and may differ.
      </p>

      <p>
        Teach a small network to add modulo 23 from half of the table. It gets every training example right within a
        few hundred steps and almost every unseen one wrong. Keep training, with weight decay, and thousands of steps
        later the test accuracy climbs to the top too. Power et al. called this delayed generalisation{" "}
        <em>grokking</em>{" "}
        <a href="#g-ref-power" className={sp.cite}>
          [1]
        </a>
        .
      </p>

      <h2>The table</h2>
      <p>
        The network sees <TeX>{"a"}</TeX> and <TeX>{"b"}</TeX> as one-hot vectors and must output{" "}
        <TeX>{"(a+b) \\bmod 23"}</TeX>. It is two layers:
      </p>
      <TeX block>{"z_k = U_{k,a} + V_{k,b}, \\qquad h_k = z_k^2, \\qquad \\hat y = W h,"}</TeX>
      <p>
        with 64 hidden units, a squared-error loss against the one-hot answer, and AdamW. A two-layer network with a
        squared-error loss on this task is the setting Gromov studies [2]; the other choices are mine. The training set
        is{" "}
        <Scrub
          value={frac}
          min={0.2}
          max={0.8}
          step={0.05}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={setFrac}
          label="Training fraction"
        />{" "}
        of the 529 pairs, and the weight decay is{" "}
        <Scrub value={wd} min={0.01} max={1} step={0.05} log format={(v) => v.toFixed(2)} onChange={setWd} label="Weight decay" />
        .
      </p>

      <div ref={figRef}>
        <figure className={`${sp.figure}`}>
          <div className={styles.tableGrid}>
            <AnswerTable snap={shown} isTrain={isTrain} />
            <div className={sp.side}>
              <Curves snaps={snaps} scrub={scrub} setScrub={(i) => (pause(), setScrub(i))} />
              <div className={sp.controls} style={{ marginTop: "0.75rem" }}>
                <button type="button" className={sp.btn} onClick={running ? pause : resume} disabled={!started}>
                  {running ? "❚❚ pause" : "▶ train"}
                </button>
                <button type="button" className={sp.btn} onClick={() => setSeed((s) => s + 1)}>
                  ↺ new seed
                </button>
              </div>
              <div className={sp.readout}>
                {shown ? (
                  <>
                    step {shown.step.toLocaleString("en")} · train {(shown.trainAcc * 100).toFixed(0)}% · test{" "}
                    {(shown.testAcc * 100).toFixed(0)}%{scrub !== null ? <span className={sp.replay}> · replay</span> : null}
                    <br />
                    {trainAt !== undefined ? `train ≥ 99% at step ${trainAt.toLocaleString("en")}` : "train < 99% so far"}
                    {" · "}
                    {testAt !== undefined ? `test ≥ 95% at step ${testAt.toLocaleString("en")}` : "test < 95% so far"}
                  </>
                ) : started ? (
                  "starting…"
                ) : (
                  "starts when on screen"
                )}
              </div>
            </div>
          </div>
        </figure>
        <p className={sp.caption}>
          <b>Figure 1.</b> The whole addition table, row <i>a</i>, column <i>b</i>. Grey squares are training pairs, teal
          squares are held-out pairs, each drawn once the network gets it right. Hover a square to see what the network
          answers. Drag along the curves to replay.
        </p>
      </div>

      <p>
        With the defaults, my three runs (seeds 1–3) all fit the training half by step 1,000. On the held-out half they
        reached 71%, 100%, and 92% by step 16,000, after thousands of steps at 100% training accuracy. With a weight decay
        of 0.05, or with only 30% of the table to learn from, none of my runs got there within 16,000 steps. Try them.
      </p>

      <h2>What changes inside</h2>
      <p>
        Nanda et al. reverse-engineered a small transformer that had grokked this task and found that it adds by turning
        numbers into rotations: waves at a few frequencies and trigonometric identities [3]. The network here is
        simpler, but the input weights can be read the same way. Take neuron <TeX>{"k"}</TeX>&apos;s row{" "}
        <TeX>{"U_{k,\\cdot}"}</TeX>, a function of <TeX>{"a \\in \\{0,\\dots,22\\}"}</TeX>, and measure its power at each
        frequency <TeX>{"f = 1,\\dots,11"}</TeX>:
      </p>
      <TeX block>{"\\Big|\\sum_{a=0}^{22} U_{k,a}\\, e^{-2\\pi i f a / 23}\\Big|^2."}</TeX>
      <p>
        At the start each neuron spreads its power over many frequencies. As the test accuracy rises, each neuron
        settles on one. In my run with seed 2 the share of a neuron&apos;s power at its strongest frequency, averaged
        over neurons, went from 0.30 at step 500 to 0.77 at step 14,000, while the neurons as a group kept covering all
        11 frequencies. So the total spectrum stays flat and is not where the change shows. It shows neuron by neuron.
      </p>

      <SpectrumFigure snap={shown} neuron={neuron} setNeuron={setNeuron} />
      <p className={sp.caption}>
        <b>Figure 2.</b> Left: one row per hidden neuron, one column per frequency, darker for more power (each row scaled
        to its own maximum), rows sorted by their strongest frequency. Right: the weights of the neuron you point at, as
        dots over <i>a</i>, with the single wave at its strongest frequency drawn through them.
      </p>

      <h2>Caveats</h2>
      <ul>
        <li>
          The hyperparameters were tuned until grokking showed up in under a minute of browser time. The effect depends on
          them; that is part of the point of the sliders.
        </li>
        <li>
          &ldquo;Settles on one frequency&rdquo; is a statement about this measure in these runs, not a proof of which
          algorithm the network uses.
        </li>
      </ul>

      <h2 className={sp.refsHead}>References</h2>
      <ol className={sp.refs}>
        <li id="g-ref-power">
          A. Power, Y. Burda, H. Edwards, I. Babuschkin, V. Misra. &ldquo;Grokking: Generalization Beyond Overfitting on
          Small Algorithmic Datasets.&rdquo; 2022. <a href="https://arxiv.org/abs/2201.02177">arXiv:2201.02177</a>
        </li>
        <li>
          A. Gromov. &ldquo;Grokking modular arithmetic.&rdquo; 2023.{" "}
          <a href="https://arxiv.org/abs/2301.02679">arXiv:2301.02679</a>
        </li>
        <li>
          N. Nanda, L. Chan, T. Lieberum, J. Smith, J. Steinhardt. &ldquo;Progress measures for grokking via mechanistic
          interpretability.&rdquo; 2023. <a href="https://arxiv.org/abs/2301.05217">arXiv:2301.05217</a>
        </li>
      </ol>
    </article>
  );
}

function AnswerTable({ snap, isTrain }: { snap: Snap | undefined; isTrain: Uint8Array | null }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const w = useWidth(rootRef);
  const size = Math.max(230, Math.min(w, 368));
  const cell = size / P;
  const [hover, setHover] = useState<[number, number] | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal) return;
    const ctx = setupCanvas(canvas, size, size);
    for (let a = 0; a < P; a++) {
      for (let b = 0; b < P; b++) {
        const j = a * P + b;
        const train = isTrain?.[j] === 1;
        const ok = snap?.ok[j] === 1;
        const x = b * cell;
        const y = a * cell;
        if (ok) {
          ctx.fillStyle = train ? withAlpha(pal.muted, 0.45) : pal.accent;
          ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        } else {
          ctx.strokeStyle = withAlpha(train ? pal.muted : pal.faint, train ? 0.5 : 0.3);
          ctx.strokeRect(x + 1.5, y + 1.5, cell - 3, cell - 3);
        }
      }
    }
    if (hover) {
      ctx.strokeStyle = pal.neg;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(hover[1] * cell + 0.75, hover[0] * cell + 0.75, cell - 1.5, cell - 1.5);
      ctx.lineWidth = 1;
    }
  }, [pal, size, cell, snap, isTrain, hover]);

  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const b = Math.floor((e.clientX - r.left) / cell);
    const a = Math.floor((e.clientY - r.top) / cell);
    setHover(a >= 0 && a < P && b >= 0 && b < P ? [a, b] : null);
  };

  return (
    <div ref={rootRef} className={styles.table}>
      <canvas
        ref={canvasRef}
        className={sp.canvas}
        onPointerMove={move}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="The 23 by 23 addition table, coloured where the network answers correctly."
      />
      <div className={sp.planeLabel}>
        {hover && snap
          ? `${hover[0]} + ${hover[1]} ≡ ${(hover[0] + hover[1]) % P} (mod 23) · ${
              isTrain?.[hover[0] * P + hover[1]] ? "training pair" : "held out"
            } · ${snap.ok[hover[0] * P + hover[1]] ? "right" : "wrong"}`
          : "row a, column b · point at a square"}
      </div>
    </div>
  );
}

function Curves({ snaps, scrub, setScrub }: { snaps: Snap[]; scrub: number | null; setScrub: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = Math.max(200, useWidth(ref));
  const H = 150;
  const maxStep = Math.max(4000, snaps[snaps.length - 1]?.step ?? 0);
  const X = (s: number) => 28 + (s / maxStep) * (w - 34);
  const Y = (v: number) => 8 + (1 - v) * (H - 28);
  const path = (key: "trainAcc" | "testAcc") => snaps.map((s, k) => `${k ? "L" : "M"}${X(s.step).toFixed(1)},${Y(s[key]).toFixed(1)}`).join("");
  const cur = scrub !== null ? snaps[scrub] : snaps[snaps.length - 1];
  const pick = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!snaps.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const step = ((e.clientX - r.left - 28) / (w - 34)) * maxStep;
    let best = 0;
    for (let k = 0; k < snaps.length; k++) if (Math.abs(snaps[k].step - step) < Math.abs(snaps[best].step - step)) best = k;
    setScrub(best);
  };
  return (
    <div ref={ref}>
      <svg
        width={w}
        height={H}
        className={sp.lossSvg}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pick(e);
        }}
        onPointerMove={(e) => e.buttons && pick(e)}
      >
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={28} x2={w - 6} y1={Y(v)} y2={Y(v)} stroke="var(--border)" />
            <text x={22} y={Y(v) + 3} textAnchor="end" className={sp.tick}>
              {v * 100}%
            </text>
          </g>
        ))}
        <text x={28} y={H - 4} className={sp.tick}>
          0
        </text>
        <text x={w - 6} y={H - 4} textAnchor="end" className={sp.tick}>
          {maxStep.toLocaleString("en")} steps
        </text>
        <path d={path("trainAcc")} fill="none" stroke="var(--ink-faint)" strokeWidth={1.5} />
        <path d={path("testAcc")} fill="none" stroke="var(--accent)" strokeWidth={2} />
        {cur ? <line x1={X(cur.step)} x2={X(cur.step)} y1={4} y2={H - 18} stroke="var(--sp-neg)" strokeWidth={1} /> : null}
      </svg>
      <div className={sp.axisNote}>
        <span>
          <span className={styles.keyTrain} /> train accuracy <span className={styles.keyTest} /> test accuracy
        </span>
      </div>
    </div>
  );
}

function SpectrumFigure({ snap, neuron, setNeuron }: { snap: Snap | undefined; neuron: number | null; setNeuron: (k: number | null) => void }) {
  const rootRef = useRef<HTMLElement>(null);
  const heatRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const waveBox = useRef<HTMLDivElement>(null);
  const ww = Math.max(220, useWidth(waveBox));
  const colW = 18;
  const rowH = 4;
  const HW = colW * F + 30;
  const HH = rowH * HIDDEN + 22;

  // rows sorted by strongest frequency, then by how concentrated they are
  const { order, share, top } = useMemo(() => {
    const top = new Array(HIDDEN).fill(0);
    const share = new Array(HIDDEN).fill(0);
    if (snap) {
      for (let k = 0; k < HIDDEN; k++) {
        let mx = 0;
        let tot = 0;
        for (let f = 0; f < F; f++) {
          const v = snap.perNeuron[k * F + f];
          tot += v;
          if (v > mx) {
            mx = v;
            top[k] = f;
          }
        }
        share[k] = tot > 0 ? mx / tot : 0;
      }
    }
    const order = Array.from({ length: HIDDEN }, (_, k) => k).sort((a, b) => top[a] - top[b] || share[b] - share[a]);
    return { order, share, top };
  }, [snap]);
  const meanShare = share.reduce((s, v) => s + v, 0) / HIDDEN;

  useEffect(() => {
    const canvas = heatRef.current;
    if (!canvas || !pal || !snap) return;
    const ctx = setupCanvas(canvas, HW, HH);
    order.forEach((k, r) => {
      let mx = 0;
      for (let f = 0; f < F; f++) mx = Math.max(mx, snap.perNeuron[k * F + f]);
      for (let f = 0; f < F; f++) {
        ctx.fillStyle = withAlpha(pal.accent, mx > 0 ? Math.pow(snap.perNeuron[k * F + f] / mx, 1.5) : 0);
        ctx.fillRect(30 + f * colW, r * rowH, colW - 1, rowH - 0.5);
      }
      if (k === neuron) {
        ctx.strokeStyle = pal.neg;
        ctx.strokeRect(29.5, r * rowH - 0.5, colW * F, rowH);
      }
    });
    ctx.fillStyle = pal.faint;
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    for (let f = 0; f < F; f++) ctx.fillText(String(f + 1), 30 + f * colW + colW / 2, HH - 8);
    ctx.save();
    ctx.translate(10, (rowH * HIDDEN) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("neurons", 0, 0);
    ctx.restore();
  }, [pal, snap, order, neuron, HW, HH]);

  const pickRow = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const row = Math.floor((e.clientY - r.top) / rowH);
    if (row >= 0 && row < HIDDEN) setNeuron(order[row]);
  };

  const k = neuron ?? order[order.length - 1];
  const wave = useMemo(() => {
    if (!snap) return null;
    const u = Array.from({ length: P }, (_, a) => snap.U[k * P + a]);
    const mean = u.reduce((s, v) => s + v, 0) / P;
    const f = top[k] + 1;
    let re = 0;
    let im = 0;
    u.forEach((v, a) => {
      re += v * Math.cos((2 * Math.PI * f * a) / P);
      im -= v * Math.sin((2 * Math.PI * f * a) / P);
    });
    const amp = (2 / P) * Math.hypot(re, im);
    const phase = Math.atan2(im, re);
    return { u, mean, f, amp, phase };
  }, [snap, k, top]);

  const WH = 150;
  let lo = -1;
  let hi = 1;
  if (wave) {
    lo = Math.min(...wave.u, wave.mean - wave.amp);
    hi = Math.max(...wave.u, wave.mean + wave.amp);
  }
  const WX = (a: number) => 10 + (a / (P - 1)) * (ww - 20);
  const WY = (v: number) => 10 + (1 - (v - lo) / Math.max(1e-9, hi - lo)) * (WH - 30);

  return (
    <figure ref={rootRef} className={`${sp.figure} ${sp.root}`}>
      <div className={styles.specGrid}>
        <div>
          <canvas
            ref={heatRef}
            className={sp.canvas}
            onPointerMove={pickRow}
            onClick={pickRow}
            role="img"
            aria-label="Power of each neuron's input weights at each frequency."
          />
          <div className={sp.planeLabel}>frequency f · mean top-frequency share {meanShare.toFixed(2)}</div>
        </div>
        <div ref={waveBox} className={sp.side}>
          {wave ? (
            <>
              <div className={sp.panelHead}>
                neuron {k + 1} · strongest frequency f = {wave.f} · share {share[k].toFixed(2)}
              </div>
              <svg width={ww} height={WH}>
                <path
                  d={Array.from({ length: 200 }, (_, j) => {
                    const a = (j / 199) * (P - 1);
                    const v = wave.mean + wave.amp * Math.cos((2 * Math.PI * wave.f * a) / P + wave.phase);
                    return `${j ? "L" : "M"}${WX(a).toFixed(1)},${WY(v).toFixed(1)}`;
                  }).join("")}
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth={1.25}
                  opacity={0.8}
                />
                {wave.u.map((v, a) => (
                  <circle key={a} cx={WX(a)} cy={WY(v)} r={2.6} fill="var(--ink)" />
                ))}
                <text x={10} y={WH - 4} className={sp.tick}>
                  a = 0
                </text>
                <text x={ww - 10} y={WH - 4} textAnchor="end" className={sp.tick}>
                  22
                </text>
              </svg>
              <p className={sp.sideText}>Point at a row on the left to pick a neuron.</p>
            </>
          ) : (
            <div className={sp.dim}>Waiting for the network in Figure 1.</div>
          )}
        </div>
      </div>
    </figure>
  );
}
