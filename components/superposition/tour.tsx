"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./superposition.module.css";
import type { Stop } from "./tour.worker";
import { setupCanvas, usePalette, useVisible, useWidth, withAlpha } from "./widgets";

const N = 5;

const STOPS: (Stop & { title: string; body: ReactNode })[] = [
  {
    density: 1,
    decay: 0.9,
    steps: 0,
    title: "Before training",
    body: <>Five random directions. Nothing about them is chosen yet.</>,
  },
  {
    density: 1,
    decay: 0.9,
    steps: 5000,
    title: "Every feature on, all the time",
    body: (
      <>
        Dense inputs. The two most important features take a dimension each, at a right angle. The other three shrink
        to nothing: with this much traffic, any overlap would cost more than the feature is worth.
      </>
    ),
  },
  {
    density: 0.3,
    decay: 0.9,
    steps: 5000,
    title: "On 30% of the time",
    body: (
      <>
        Features start to share. Four of them sit in two antipodal pairs, each pair on one axis, each feature at{" "}
        <i>D</i> = 1/2. Feature 5, the least important, is still dropped.
      </>
    ),
  },
  {
    density: 0.05,
    decay: 0.9,
    steps: 5000,
    title: "On 5% of the time",
    body: (
      <>
        All five are kept, spaced 72° apart: the pentagon. Each gets about 2/5 of a dimension, and the arrows end a
        little longer than 1 (about 1.13 in this run).
      </>
    ),
  },
  {
    density: 0.05,
    decay: 0.6,
    steps: 5000,
    title: "Same sparsity, steeper importance",
    body: (
      <>
        Now each feature matters 0.6 times as much as the one before. Feature 5 is worth too little to pay for its
        interference, and the model goes back to two pairs. Sparsity and importance pull against each other.
      </>
    ),
  },
];

type Trained = { W: number[]; b: number[]; D: number[] };

/** Orthogonal Q (rotation or reflection) minimising ‖Q·B − A‖ for 2 × n matrices A, B. */
function align(A: number[], B: number[]): number[] {
  // C = A Bᵀ; maximise Σ Q_ij C_ij
  let c00 = 0, c01 = 0, c10 = 0, c11 = 0;
  for (let i = 0; i < N; i++) {
    c00 += A[i] * B[i];
    c01 += A[i] * B[N + i];
    c10 += A[N + i] * B[i];
    c11 += A[N + i] * B[N + i];
  }
  const tr = Math.atan2(c10 - c01, c00 + c11);
  const tf = Math.atan2(c01 + c10, c00 - c11);
  const rot = Math.hypot(c10 - c01, c00 + c11) >= Math.hypot(c01 + c10, c00 - c11);
  const [c, s] = rot ? [Math.cos(tr), Math.sin(tr)] : [Math.cos(tf), Math.sin(tf)];
  const Q = rot ? [c, -s, s, c] : [c, s, s, -c];
  const out = new Array(2 * N);
  for (let i = 0; i < N; i++) {
    out[i] = Q[0] * B[i] + Q[1] * B[N + i];
    out[N + i] = Q[2] * B[i] + Q[3] * B[N + i];
  }
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * A scroll-driven tour: the figure stays pinned while the steps scroll past,
 * and the arrows move from one trained model to the next as you go.
 */
export function Tour() {
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pal = usePalette(rootRef);
  const near = useVisible(rootRef);
  const size = Math.max(220, Math.min(useWidth(boxRef), 380));
  const [stops, setStops] = useState<(Trained | null)[]>(() => STOPS.map(() => null));
  const [progress, setProgress] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!near || started.current) return;
    started.current = true;
    const worker = new Worker(new URL("./tour.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<Trained & { k: number }>) => {
      const { k, ...t } = e.data;
      setStops((prev) => {
        const next = [...prev];
        next[k] = t;
        return next;
      });
    };
    worker.postMessage(STOPS.map(({ density, decay, steps }) => ({ density, decay, steps })));
    return () => worker.terminate();
  }, [near]);

  // Each trained model is rotated (or reflected) to line up with the one before
  // it. The loss only sees WᵀW, so this changes nothing about the model; it
  // just stops the picture from spinning between stops.
  const aligned: (Trained | null)[] = [];
  for (let k = 0; k < stops.length; k++) {
    const s = stops[k];
    const prev = aligned[k - 1];
    aligned.push(s && prev ? { ...s, W: align(prev.W, s.W) } : s);
  }

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const anchor = window.innerHeight * 0.55;
      const centers = stepRefs.current.map((el) => {
        if (!el) return 0;
        const r = el.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      let p = 0;
      if (anchor <= centers[0]) p = 0;
      else if (anchor >= centers[centers.length - 1]) p = centers.length - 1;
      else {
        for (let k = 0; k < centers.length - 1; k++) {
          if (anchor >= centers[k] && anchor < centers[k + 1]) {
            p = k + (anchor - centers[k]) / (centers[k + 1] - centers[k]);
            break;
          }
        }
      }
      setProgress(p);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  const k0 = Math.min(STOPS.length - 1, Math.floor(progress));
  const k1 = Math.min(STOPS.length - 1, k0 + 1);
  // hold still near each stop and move in between
  const f = smooth(Math.min(1, Math.max(0, (progress - k0 - 0.25) / 0.5)));
  const A = aligned[k0];
  const B = aligned[k1] ?? A;
  const active = Math.round(progress);
  const settled = Math.abs(progress - active) < 0.25 ? aligned[active] : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal) return;
    const ctx = setupCanvas(canvas, size, size);
    const cx = size / 2;
    const cy = size / 2;
    const scale = (size / 2 - 30) / 1.3;
    ctx.strokeStyle = withAlpha(pal.faint, 0.35);
    ctx.beginPath();
    ctx.moveTo(10, cy);
    ctx.lineTo(size - 10, cy);
    ctx.moveTo(cx, 10);
    ctx.lineTo(cx, size - 10);
    ctx.stroke();
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    if (!A || !B) {
      ctx.fillStyle = pal.faint;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText("training the stops…", cx, cy + scale + 18);
      return;
    }
    for (let i = N - 1; i >= 0; i--) {
      const x = (1 - f) * A.W[i] + f * B.W[i];
      const y = (1 - f) * A.W[N + i] + f * B.W[N + i];
      const tx = cx + x * scale;
      const ty = cy - y * scale;
      const col = withAlpha(pal.ink, 0.4 + 0.6 * Math.pow(0.9, i));
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = 1.75;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      const norm = Math.hypot(x, y);
      if (norm * scale > 8) {
        const ang = Math.atan2(cy - ty, tx - cx);
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - 8 * Math.cos(ang - 0.38), ty + 8 * Math.sin(ang - 0.38));
        ctx.lineTo(tx - 8 * Math.cos(ang + 0.38), ty + 8 * Math.sin(ang + 0.38));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      const ux = norm > 1e-3 ? x / norm : 0;
      const uy = norm > 1e-3 ? y / norm : 1;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), tx + ux * 14, ty - uy * 14 + 4);
    }
    ctx.textAlign = "start";
  });

  return (
    <div ref={rootRef} className={`${styles.root} ${styles.tour}`}>
      <div className={styles.tourStick}>
        <div className={styles.tourFigure}>
          <div ref={boxRef}>
            <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Five feature directions, changing with the tour step" />
          </div>
          <div className={styles.tourMeta}>
            <span>
              stop {active + 1} / {STOPS.length} · density {Math.round(STOPS[active].density * 100)}% · I<sub>i</sub> ={" "}
              {STOPS[active].decay}
              <sup>i−1</sup>
            </span>
            <span className={styles.tourDims}>
              {settled
                ? settled.D.map((d, i) => (
                    <span key={i} title={`D${i + 1}`}>
                      <span style={{ height: `${Math.min(1, d) * 100}%` }} />
                    </span>
                  ))
                : null}
            </span>
          </div>
        </div>
      </div>
      <div className={styles.tourSteps}>
        {STOPS.map((s, k) => (
          <div
            key={k}
            ref={(el) => {
              stepRefs.current[k] = el;
            }}
            className={`${styles.tourStep} ${k === active ? styles.tourStepOn : ""}`}
          >
            <div className={styles.tourCard}>
              <div className={styles.tourKicker}>{k === 0 ? "start" : `stop ${k + 1}`}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          </div>
        ))}
        <p className={styles.caption}>
          Every stop is a model trained in your browser (seed 1, 5,000 steps). Between stops the arrows are interpolated,
          which is a drawing, not a training path. Bars under the figure: <i>D<sub>i</sub></i> at each stop.
        </p>
      </div>
    </div>
  );
}
