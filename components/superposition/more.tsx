"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { dimensionality, ToyModel } from "./model";
import styles from "./superposition.module.css";
import { Scrub, setupCanvas, usePalette, useVisible, useWidth, withAlpha } from "./widgets";

type Mat3 = number[]; // row-major 3 × 3

const mul = (a: Mat3, b: Mat3): Mat3 => {
  const o = new Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) o[i * 3 + j] += a[i * 3 + k] * b[k * 3 + j];
  return o;
};

/** Rotation by `angle` about the unit axis (x, y, z) (Rodrigues). */
const axisAngle = (x: number, y: number, z: number, angle: number): Mat3 => {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
};

const apply = (R: Mat3, v: [number, number, number]) =>
  [
    R[0] * v[0] + R[1] * v[1] + R[2] * v[2],
    R[3] * v[0] + R[4] * v[1] + R[5] * v[2],
    R[6] * v[0] + R[7] * v[1] + R[8] * v[2],
  ] as const;

const PRESETS = [4, 6, 8, 10];

// ---------------------------------------------------------------------------
// Figure 4: the same model with a third hidden dimension, on a sphere you turn.
// ---------------------------------------------------------------------------

export function SphereFigure() {
  const rootRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const visible = useVisible(rootRef);
  const size = Math.max(240, Math.min(useWidth(boxRef), 420));
  const [n, setN] = useState(6);
  const [density, setDensity] = useState(0.03);
  const [seed, setSeed] = useState(1);
  const model = useRef<ToyModel | null>(null);
  const rot = useRef<Mat3>(mul(axisAngle(1, 0, 0, 0.45), axisAngle(0, 1, 0, 0.6)));
  const drag = useRef<{ x: number; y: number } | null>(null);
  const idle = useRef(0);
  const [, setFrame] = useState(0);

  useEffect(() => {
    model.current = new ToyModel(n, 3, density, new Array(n).fill(1), seed);
  }, [n, density, seed]);

  // One loop does both: a few training steps (until 6,000) and a slow turn of
  // the sphere when nobody is holding it.
  useEffect(() => {
    if (!visible) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const loop = () => {
      const m = model.current;
      if (m && m.steps < 6000) for (let k = 0; k < 10; k++) m.step(256, 0.01);
      if (!drag.current && !reduced && performance.now() - idle.current > 1500) {
        rot.current = mul(axisAngle(0, 1, 0, 0.0025), rot.current);
      }
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  const m = model.current;
  const D = m && m.n === n ? dimensionality(m.W, n, 3) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal || !m || m.n !== n) return;
    const ctx = setupCanvas(canvas, size, size);
    const R = rot.current;
    const cx = size / 2;
    const cy = size / 2;
    const s = size * 0.3;
    const proj = (v: readonly [number, number, number] | [number, number, number]) => {
      const p = apply(R, v as [number, number, number]);
      const f = 3.2 / (3.2 - p[2]);
      return { x: cx + p[0] * s * f, y: cy - p[1] * s * f, z: p[2] };
    };
    const depthA = (z: number) => 0.25 + 0.75 * Math.min(1, Math.max(0, (z + 1.2) / 2.4));

    // the unit sphere: outline and three great circles, fainter behind
    ctx.strokeStyle = withAlpha(pal.faint, 0.35);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, s * 1.0, 0, Math.PI * 2);
    ctx.stroke();
    const circles: ((t: number) => [number, number, number])[] = [
      (t) => [Math.cos(t), 0, Math.sin(t)],
      (t) => [Math.cos(t), Math.sin(t), 0],
      (t) => [0, Math.cos(t), Math.sin(t)],
    ];
    for (const c of circles) {
      let prev = proj(c(0));
      for (let k = 1; k <= 72; k++) {
        const cur = proj(c((k / 72) * Math.PI * 2));
        ctx.strokeStyle = withAlpha(pal.faint, 0.28 * depthA((prev.z + cur.z) / 2));
        ctx.setLineDash(prev.z + cur.z < 0 ? [1.5, 3] : []);
        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(cur.x, cur.y);
        ctx.stroke();
        prev = cur;
      }
    }
    ctx.setLineDash([]);

    const cols = Array.from({ length: n }, (_, i) => [m.W[i], m.W[n + i], m.W[2 * n + i]] as [number, number, number]);
    const norms = cols.map((v) => Math.hypot(...v));

    // edges of the shape: each represented feature to its nearest neighbours
    // (within a small tolerance of the nearest), ignoring antipodal partners
    const on = cols.map((_, i) => norms[i] > 0.5);
    const cos = (i: number, j: number) => (cols[i][0] * cols[j][0] + cols[i][1] * cols[j][1] + cols[i][2] * cols[j][2]) / (norms[i] * norms[j]);
    const edges = new Set<string>();
    for (let i = 0; i < n; i++) {
      if (!on[i]) continue;
      let best = -1;
      for (let j = 0; j < n; j++) if (j !== i && on[j]) best = Math.max(best, cos(i, j));
      for (let j = 0; j < n; j++) {
        if (j === i || !on[j]) continue;
        const c = cos(i, j);
        if (c > -0.9 && c >= best - 0.08) edges.add(i < j ? `${i}-${j}` : `${j}-${i}`);
      }
    }
    for (const e of edges) {
      const [i, j] = e.split("-").map(Number);
      const a = proj(cols[i]);
      const b = proj(cols[j]);
      ctx.strokeStyle = withAlpha(pal.accent, 0.5 * depthA((a.z + b.z) / 2));
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // arrows, back to front
    const order = cols.map((v, i) => ({ i, z: apply(R, v)[2] })).sort((a, b) => a.z - b.z);
    for (const { i, z } of order) {
      const tip = proj(cols[i]);
      const a = depthA(z);
      ctx.strokeStyle = withAlpha(pal.ink, a);
      ctx.fillStyle = withAlpha(pal.ink, a);
      ctx.lineWidth = 0.75 + 1.25 * a;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tip.x, tip.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tip.x, tip.y, 1.5 + 2.5 * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.fillStyle = withAlpha(pal.muted, a);
      ctx.fillText(String(i + 1), tip.x + 6, tip.y - 6);
    }
  });

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    const len = Math.hypot(dx, dy);
    if (len < 0.01) return;
    // turn about the screen axis perpendicular to the drag
    rot.current = mul(axisAngle(dy / len, dx / len, 0, len * 0.01), rot.current);
    idle.current = performance.now();
  };
  const up = () => {
    drag.current = null;
    idle.current = performance.now();
  };

  // group the dimensionalities into "k features at about D"
  const groups: { d: number; k: number }[] = [];
  if (D) {
    for (const d of [...D].sort((a, b) => b - a)) {
      const g = groups.find((g) => Math.abs(g.d - d) < 0.04);
      if (g) g.k++;
      else groups.push({ d, k: 1 });
    }
  }

  return (
    <figure ref={rootRef} className={`${styles.figure} ${styles.root}`}>
      <div className={styles.phaseGrid}>
        <div ref={boxRef}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ cursor: "grab" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            role="img"
            aria-label={`The ${n} columns of W in a three-dimensional hidden space, on the unit sphere. Drag to turn it.`}
          />
          <div className={styles.planeLabel}>hidden space, m = 3 · drag to turn</div>
        </div>
        <div className={styles.side}>
          <div className={styles.chips}>
            <span className={styles.dim}>features:</span>
            {PRESETS.map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={n === k}
                className={`${styles.chip} ${n === k ? styles.chipOn : ""}`}
                onClick={() => setN(k)}
              >
                {k}
              </button>
            ))}
          </div>
          <p className={styles.sideText}>
            density{" "}
            <Scrub
              value={density}
              min={0.005}
              max={1}
              step={0.05}
              log
              format={(v) => `${+(v * 100).toPrecision(2)}%`}
              onChange={setDensity}
              label="Feature density in three dimensions"
            />
          </p>
          <div className={styles.panelHead}>dimensionality</div>
          <ul className={styles.legend}>
            {groups.map((g) => (
              <li key={g.d.toFixed(2)}>
                <span className={styles.mono}>
                  {g.k} × D ≈ {g.d.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <div className={styles.readout}>
            step {m ? m.steps.toLocaleString("en") : 0}
            {m && m.steps >= 6000 ? " · done" : ""}
          </div>
          <div className={styles.controls} style={{ marginTop: "0.6rem" }}>
            <button type="button" className={styles.btn} onClick={() => setSeed((s) => s + 1)}>
              ↺ new seed
            </button>
          </div>
        </div>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Figure 5: how much of a dimension each feature gets, as inputs get sparser.
// ---------------------------------------------------------------------------

type Column = { k: number; density: number; D: number[]; perFeature: number; born: number };

const COUNT = 16;
const FRACTIONS: [number, string][] = [
  [1, "1"],
  [1 / 2, "1/2"],
  [2 / 5, "2/5"],
  [1 / 3, "1/3"],
  [1 / 4, "1/4"],
];

export function StaircaseFigure() {
  const rootRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const visible = useVisible(rootRef);
  const w = Math.max(280, useWidth(boxRef));
  const H = 300;
  const [cols, setCols] = useState<Column[]>([]);
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [hover, setHover] = useState<{ k: number; i: number } | null>(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (visible && !started) setStarted(true);
  }, [visible, started]);

  useEffect(() => {
    if (!started) return;
    setCols([]);
    const worker = new Worker(new URL("./staircase.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<Omit<Column, "born"> & { run: number }>) => {
      if (e.data.run !== run) return;
      setCols((c) => [...c, { ...e.data, born: performance.now() }]);
    };
    worker.postMessage({ count: COUNT, run });
    return () => worker.terminate();
  }, [started, run]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setFrame((f) => f + 1);
      if (cols.some((c) => performance.now() - c.born < 900)) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cols]);

  const left = 40;
  const right = 36;
  const top = 10;
  const bottom = 34;
  const X = (density: number) => left + ((Math.log10(1 / density) - 0.1) / 1.5) * (w - left - right);
  const Y = (d: number) => top + (1 - Math.min(1.05, d) / 1.05) * (H - top - bottom);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal) return;
    const ctx = setupCanvas(canvas, w, H);
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    for (const [f, label] of FRACTIONS) {
      ctx.strokeStyle = withAlpha(pal.faint, 0.35);
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(left, Y(f));
      ctx.lineTo(w - right, Y(f));
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = pal.faint;
      ctx.fillText(label, w - right + 6, Y(f) + 3);
    }
    ctx.strokeStyle = pal.border;
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, H - bottom);
    ctx.lineTo(w - right, H - bottom);
    ctx.stroke();
    ctx.fillStyle = pal.faint;
    ctx.textAlign = "center";
    for (const e of [1.5, 3, 10, 30]) ctx.fillText(String(e), X(1 / e), H - bottom + 14);
    ctx.fillText("1 / density", (left + w - right) / 2, H - 4);
    ctx.textAlign = "right";
    for (const d of [0, 0.5, 1]) ctx.fillText(String(d), left - 6, Y(d) + 3);
    ctx.textAlign = "start";

    const now = performance.now();
    const sorted = [...cols].sort((a, b) => a.k - b.k);
    // dimensions per feature, m / ‖W‖_F², as a line
    ctx.strokeStyle = withAlpha(pal.ink, 0.55);
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    sorted.forEach((c, j) => (j ? ctx.lineTo(X(c.density), Y(c.perFeature)) : ctx.moveTo(X(c.density), Y(c.perFeature))));
    ctx.stroke();
    // one dot per feature; dots fall into place as each model arrives
    for (const c of cols) {
      const t = Math.min(1, (now - c.born) / 900);
      const ease = 1 - Math.pow(1 - t, 3);
      c.D.forEach((d, i) => {
        const x = X(c.density) + ((i % 6) - 2.5) * 1.6;
        const y = Y(1.05) + (Y(d) - Y(1.05)) * ease;
        const hot = hover && hover.k === c.k && hover.i === i;
        ctx.fillStyle = hot ? pal.neg : withAlpha(pal.accent, 0.55);
        ctx.beginPath();
        ctx.arc(x, y, hot ? 3.5 : 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  });

  const pick = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    let best: { k: number; i: number } | null = null;
    let bd = 10;
    for (const c of cols) {
      c.D.forEach((d, i) => {
        const dist = Math.hypot(X(c.density) + ((i % 6) - 2.5) * 1.6 - px, Y(d) - py);
        if (dist < bd) {
          bd = dist;
          best = { k: c.k, i };
        }
      });
    }
    setHover(best);
  };
  const hovered = hover ? cols.find((c) => c.k === hover.k) : undefined;

  return (
    <figure ref={rootRef} className={`${styles.figure} ${styles.root}`}>
      <div ref={boxRef}>
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          onPointerMove={pick}
          onPointerLeave={() => setHover(null)}
          role="img"
          aria-label="Feature dimensionality against one over density, for 24 features in 6 dimensions."
        />
      </div>
      <div className={styles.controls} style={{ marginTop: "0.5rem" }}>
        <span className={styles.readout}>
          {hovered && hover
            ? `feature ${hover.i + 1} at density ${hovered.density.toFixed(3)}: D = ${hovered.D[hover.i].toFixed(3)}`
            : cols.length < COUNT
              ? `training ${cols.length} / ${COUNT} models (24 features, 6 dimensions)…`
              : `${COUNT} models trained in your browser · dots: D_i per feature · line: m / ‖W‖²`}
        </span>
        <button type="button" className={styles.btn} onClick={() => setRun((r) => r + 1)} disabled={!started}>
          ↺ new seeds
        </button>
      </div>
    </figure>
  );
}
