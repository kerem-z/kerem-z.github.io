"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { dimensionality, gram, lossLandscape, reconstruct, type Phase } from "./model";
import styles from "./superposition.module.css";
import { Scrub, setupCanvas, usePalette, useVisible, useWidth, withAlpha, type Focus } from "./widgets";

export type Snap = { step: number; loss: number; W: Float64Array; b: Float64Array; edited?: boolean };

const fmt = (v: number, d = 2) => (Math.abs(v) < 0.005 && d <= 2 ? "0.00" : v.toFixed(d));

// ---------------------------------------------------------------------------
// Figure 1: the columns of W in the hidden plane, WᵀW, and training over time.
// ---------------------------------------------------------------------------

export function GeometryFigure(props: {
  n: number;
  importance: number[];
  inputs: Float64Array;
  shown: Snap;
  snaps: Snap[];
  scrub: number | null;
  setScrub: (i: number | null) => void;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  onDrag: (i: number, x: number, y: number) => void;
  onDragEnd: () => void;
  canDrag: boolean;
  focus: Focus;
  setFocus: (f: Focus) => void;
  tick: number;
}) {
  const { n, shown, snaps, scrub, focus, setFocus, importance } = props;
  const rootRef = useRef<HTMLElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const planeW = useWidth(planeRef);
  const size = Math.max(220, Math.min(planeW, 400));
  const drag = useRef<{ i: number; scale: number } | null>(null);
  const [hoverTip, setHoverTip] = useState<number | null>(null);

  const G = useMemo(() => gram(shown.W, n, 2), [shown, n, props.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const D = useMemo(() => dimensionality(shown.W, n, 2), [shown, n, props.tick]); // eslint-disable-line react-hooks/exhaustive-deps
  const sumD = D.reduce((a, b) => a + b, 0);

  const geometry = () => {
    let maxNorm = 0;
    for (let i = 0; i < n; i++) maxNorm = Math.max(maxNorm, Math.hypot(shown.W[i], shown.W[n + i]));
    const scale = drag.current?.scale ?? (size / 2 - 30) / Math.max(1.25, maxNorm);
    return { cx: size / 2, cy: size / 2, scale };
  };

  const highlighted = (i: number) =>
    (focus?.kind === "feature" && focus.i === i) ||
    (focus?.kind === "pair" && (focus.i === i || focus.j === i)) ||
    hoverTip === i;
  const anyFeatureFocus = focus?.kind === "feature" || focus?.kind === "pair" || hoverTip !== null;

  // While training is paused, the feature under the pointer gets its loss
  // landscape drawn behind it: the loss as a function of where that one arrow
  // sits, all other weights held still. Dragging moves only that arrow, so the
  // landscape stays valid for the whole drag.
  const land = useRef<Landscape | null>(null);
  const landTarget = props.playing ? null : (hoverTip ?? (focus?.kind === "feature" ? focus.i : null));
  if (landTarget === null || landTarget >= n) {
    land.current = null;
  } else {
    const key = `${landTarget}|${n}|${props.tick}|${scrub}|${size}`;
    const dragging = drag.current !== null && land.current?.i === landTarget;
    if (!dragging && land.current?.key !== key) {
      const R = size / 2 / geometry().scale;
      const data = lossLandscape(shown.W, shown.b, n, importance, props.inputs, landTarget, R, LAND_RES);
      let best = 0;
      for (let k = 1; k < data.length; k++) if (data[k] < data[best]) best = k;
      const r = Math.floor(best / LAND_RES);
      const c = best % LAND_RES;
      land.current = {
        key,
        i: landTarget,
        R,
        data,
        min: [-R + (2 * R * c) / (LAND_RES - 1), R - (2 * R * r) / (LAND_RES - 1)],
      };
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal || size <= 0) return;
    const ctx = setupCanvas(canvas, size, size);
    const { cx, cy, scale } = geometry();
    const P = (x: number, y: number) => [cx + x * scale, cy - y * scale] as const;

    if (land.current) drawLandscape(ctx, land.current, pal, P);

    // frame: axes and the unit circle
    ctx.strokeStyle = withAlpha(pal.faint, 0.35);
    ctx.lineWidth = 1;
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
    ctx.fillStyle = pal.faint;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("‖W_i‖ = 1", cx + scale * 0.72 + 4, cy - scale * 0.72 - 4);

    // trails: where each tip has been over the last snapshots
    const end = scrub ?? snaps.length - 1;
    const from = Math.max(0, end - 60);
    if (end - from > 1) {
      for (let i = 0; i < n; i++) {
        ctx.strokeStyle = withAlpha(highlighted(i) ? pal.neg : pal.faint, highlighted(i) ? 0.55 : 0.28);
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let s = from; s <= end; s++) {
          const [x, y] = P(snaps[s].W[i], snaps[s].W[n + i]);
          if (s === from) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // the angle between a pair of features, when one is pointed at
    if (focus?.kind === "pair" && focus.i !== focus.j) {
      const a1 = Math.atan2(shown.W[n + focus.i], shown.W[focus.i]);
      const a2 = Math.atan2(shown.W[n + focus.j], shown.W[focus.j]);
      let d = a2 - a1;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      ctx.strokeStyle = pal.neg;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 0.28, -a1, -(a1 + d), d > 0);
      ctx.stroke();
      const mid = a1 + d / 2;
      ctx.fillStyle = pal.neg;
      ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(Math.abs((d * 180) / Math.PI))}°`, cx + Math.cos(mid) * scale * 0.42, cy - Math.sin(mid) * scale * 0.42 + 4);
      ctx.textAlign = "start";
    }

    // the arrows, least important first so the important ones sit on top
    const maxI = Math.max(...importance);
    for (let i = n - 1; i >= 0; i--) {
      const x = shown.W[i];
      const y = shown.W[n + i];
      const norm = Math.hypot(x, y);
      const [tx, ty] = P(x, y);
      const hi = highlighted(i);
      const base = 0.35 + 0.65 * (importance[i] / maxI);
      const alpha = anyFeatureFocus && !hi ? 0.18 : base;
      const col = hi ? pal.neg : withAlpha(pal.ink, alpha);
      ctx.strokeStyle = col;
      ctx.fillStyle = col;
      ctx.lineWidth = hi ? 2.25 : 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      if (norm * scale > 8) {
        const ang = Math.atan2(cy - ty, tx - cx);
        const L = 8;
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.lineTo(tx - L * Math.cos(ang - 0.38), ty + L * Math.sin(ang - 0.38));
        ctx.lineTo(tx - L * Math.cos(ang + 0.38), ty + L * Math.sin(ang + 0.38));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // label, pushed outward along the arrow
      const ux = norm > 1e-3 ? x / norm : 0;
      const uy = norm > 1e-3 ? y / norm : 1;
      ctx.font = `${hi ? 600 : 400} 11px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(String(i + 1), tx + ux * 13, ty - uy * 13 + 4);
      ctx.textAlign = "start";
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pal, size, shown, snaps, scrub, focus, hoverTip, n, props.tick, importance]);

  const local = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const nearestTip = (px: number, py: number) => {
    const { cx, cy, scale } = geometry();
    let best = -1;
    let bd = 14;
    for (let i = 0; i < n; i++) {
      const d = Math.hypot(cx + shown.W[i] * scale - px, cy - shown.W[n + i] * scale - py);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!props.canDrag) return;
    const [px, py] = local(e);
    const i = nearestTip(px, py);
    if (i < 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { i, scale: geometry().scale };
    setHoverTip(i);
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const [px, py] = local(e);
    if (drag.current) {
      const { cx, cy } = geometry();
      const s = drag.current.scale;
      props.onDrag(drag.current.i, (px - cx) / s, (cy - py) / s);
      return;
    }
    const i = nearestTip(px, py);
    setHoverTip(i >= 0 ? i : null);
  };
  const up = () => {
    if (drag.current) props.onDragEnd();
    drag.current = null;
  };

  const cell = Math.max(10, Math.min(24, Math.floor(216 / n)));
  const gramFocusRow = focus?.kind === "feature" ? focus.i : hoverTip;

  return (
    <figure ref={rootRef} className={`${styles.figure} ${styles.root}`}>
      <div className={styles.geoGrid}>
        <div ref={planeRef} className={styles.plane}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            style={{ cursor: hoverTip !== null && props.canDrag ? "grab" : "default" }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            onPointerLeave={() => !drag.current && setHoverTip(null)}
            role="img"
            aria-label={`The ${n} columns of W drawn as arrows in the two-dimensional hidden space.`}
          />
          <div className={styles.planeLabel}>
            {land.current
              ? `loss landscape of W${land.current.i + 1}, the others held still · + is its best spot`
              : props.playing
                ? "hidden space, m = 2 · pause to see loss landscapes"
                : "hidden space, m = 2 · point at an arrow"}
          </div>
        </div>

        <div className={styles.side}>
          <div className={styles.panelHead}>
            W<sup>T</sup>W <span className={styles.dim}>— overlaps between features</span>
          </div>
          <svg
            width={cell * n + 18}
            height={cell * n + 18}
            className={styles.gram}
            onPointerLeave={() => setFocus(null)}
          >
            {Array.from({ length: n }, (_, i) =>
              Array.from({ length: n }, (_, j) => {
                const v = G[i * n + j];
                const diag = i === j;
                const fadeDiag = focus?.kind === "interference" && diag;
                const inFocus =
                  (focus?.kind === "pair" && ((focus.i === i && focus.j === j) || (focus.i === j && focus.j === i))) ||
                  (gramFocusRow != null && (i === gramFocusRow || j === gramFocusRow));
                return (
                  <rect
                    key={`${i}-${j}`}
                    x={18 + j * cell}
                    y={18 + i * cell}
                    width={cell - 1}
                    height={cell - 1}
                    fill={v >= 0 ? "var(--accent)" : "var(--sp-neg)"}
                    fillOpacity={(fadeDiag ? 0.12 : 1) * Math.min(1, Math.abs(v) / 1.2) * 0.92 + 0.04}
                    stroke={inFocus ? "var(--ink)" : "none"}
                    strokeWidth={1}
                    onPointerEnter={() => setFocus(diag ? { kind: "feature", i } : { kind: "pair", i, j })}
                  >
                    <title>{diag ? `‖W${i + 1}‖² = ${fmt(v)}` : `W${i + 1} · W${j + 1} = ${fmt(v)}`}</title>
                  </rect>
                );
              }),
            )}
            {Array.from({ length: n }, (_, i) => (
              <g key={i} className={styles.gramLabel}>
                <text x={18 + i * cell + cell / 2} y={12} textAnchor="middle">
                  {i + 1}
                </text>
                <text x={8} y={18 + i * cell + cell / 2 + 3} textAnchor="middle">
                  {i + 1}
                </text>
              </g>
            ))}
          </svg>
          <div className={styles.gramReadout}>
            {focus?.kind === "pair" && focus.i !== focus.j ? (
              <>
                W<sub>{focus.i + 1}</sub>·W<sub>{focus.j + 1}</sub> = {fmt(G[focus.i * n + focus.j])}
              </>
            ) : (
              <span className={styles.dim}>point at a cell</span>
            )}
          </div>

          <table className={styles.dims}>
            <thead>
              <tr>
                <th>i</th>
                <th className={focus?.kind === "dims" ? styles.colFocus : ""}>dimensionality D_i</th>
                <th className={focus?.kind === "bias" ? styles.colFocus : ""}>b_i</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: n }, (_, i) => (
                <tr
                  key={i}
                  className={highlighted(i) ? styles.rowFocus : ""}
                  onPointerEnter={() => setFocus({ kind: "feature", i })}
                  onPointerLeave={() => setFocus(null)}
                >
                  <td>{i + 1}</td>
                  <td className={focus?.kind === "dims" ? styles.colFocus : ""}>
                    <span className={styles.dbar}>
                      <span style={{ width: `${Math.min(1, D[i]) * 100}%` }} />
                      <i style={{ left: "50%" }} />
                      <i style={{ left: "40%" }} />
                    </span>
                    {fmt(D[i])}
                  </td>
                  <td className={focus?.kind === "bias" ? styles.colFocus : ""}>{fmt(shown.b[i])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td>Σ</td>
                <td>{fmt(sumD)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <Timeline {...props} />
    </figure>
  );
}

type Landscape = { key: string; i: number; R: number; data: Float64Array; min: [number, number] };
const LAND_RES = 44;

/**
 * A tinted field (darker where the loss is lower) and iso-loss lines from
 * marching squares, on a log scale between the grid's lowest and highest loss.
 */
function drawLandscape(
  ctx: CanvasRenderingContext2D,
  land: Landscape,
  pal: NonNullable<ReturnType<typeof usePalette>>,
  P: (x: number, y: number) => readonly [number, number],
) {
  const N = LAND_RES;
  const v = Array.from(land.data, (l) => Math.log(l + 1e-6));
  let lo = Infinity;
  let hi = -Infinity;
  for (const x of v) {
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  }
  const t = v.map((x) => (x - lo) / Math.max(1e-9, hi - lo));

  const off = document.createElement("canvas");
  off.width = N;
  off.height = N;
  const octx = off.getContext("2d")!;
  const img = octx.createImageData(N, N);
  const m = withAlpha(pal.accent, 1).match(/[\d.]+/g)!.map(Number);
  for (let k = 0; k < N * N; k++) {
    img.data[4 * k] = m[0];
    img.data[4 * k + 1] = m[1];
    img.data[4 * k + 2] = m[2];
    img.data[4 * k + 3] = Math.round(255 * 0.42 * Math.pow(1 - t[k], 2.2));
  }
  octx.putImageData(img, 0, 0);
  const [x0, y0] = P(-land.R, land.R);
  const [x1, y1] = P(land.R, -land.R);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(off, x0, y0, x1 - x0, y1 - y0);

  // iso-lines
  const cell = (x1 - x0) / (N - 1);
  ctx.lineWidth = 0.75;
  for (let L = 1; L <= 9; L++) {
    const level = Math.pow(L / 10, 1.6);
    ctx.strokeStyle = withAlpha(pal.accent, 0.5 - L * 0.035);
    ctx.beginPath();
    for (let r = 0; r < N - 1; r++) {
      for (let c = 0; c < N - 1; c++) {
        const a = t[r * N + c];
        const b = t[r * N + c + 1];
        const d = t[(r + 1) * N + c + 1];
        const e = t[(r + 1) * N + c];
        const pts: [number, number][] = [];
        const edge = (p: number, q: number, ax: number, ay: number, bx: number, by: number) => {
          if ((p < level) !== (q < level)) {
            const f = (level - p) / (q - p);
            pts.push([x0 + (ax + f * (bx - ax)) * cell, y0 + (ay + f * (by - ay)) * cell]);
          }
        };
        edge(a, b, c, r, c + 1, r);
        edge(b, d, c + 1, r, c + 1, r + 1);
        edge(e, d, c, r + 1, c + 1, r + 1);
        edge(a, e, c, r, c, r + 1);
        for (let k = 0; k + 1 < pts.length; k += 2) {
          ctx.moveTo(pts[k][0], pts[k][1]);
          ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
        }
      }
    }
    ctx.stroke();
  }

  const [mx, my] = P(land.min[0], land.min[1]);
  ctx.strokeStyle = pal.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(mx - 5, my);
  ctx.lineTo(mx + 5, my);
  ctx.moveTo(mx, my - 5);
  ctx.lineTo(mx, my + 5);
  ctx.stroke();
  ctx.restore();
}

function Timeline({
  snaps,
  scrub,
  setScrub,
  playing,
  onPlay,
  onPause,
  onReset,
  shown,
  tick,
}: {
  snaps: Snap[];
  scrub: number | null;
  setScrub: (i: number | null) => void;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  shown: Snap;
  tick: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const w = useWidth(ref);
  const H = 56;
  const last = snaps[snaps.length - 1];
  const maxStep = Math.max(1000, last?.step ?? 0);
  const losses = snaps.map((s) => s.loss).filter((l) => l > 0);
  const lo = Math.log10(Math.max(1e-4, Math.min(...losses, 1)));
  const hi = Math.log10(Math.max(...losses, 1e-3));
  const X = (step: number) => 4 + (step / maxStep) * (w - 8);
  const Y = (loss: number) => 6 + (1 - (Math.log10(Math.max(loss, 1e-6)) - lo) / Math.max(1e-6, hi - lo)) * (H - 12);
  const d = useMemo(
    () => snaps.map((s, k) => `${k ? "L" : "M"}${X(s.step).toFixed(1)},${Y(s.loss).toFixed(1)}`).join(""),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snaps.length, w, tick],
  );
  const pick = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const step = ((e.clientX - r.left - 4) / (w - 8)) * maxStep;
    let best = 0;
    for (let k = 0; k < snaps.length; k++) if (Math.abs(snaps[k].step - step) < Math.abs(snaps[best].step - step)) best = k;
    setScrub(best);
  };

  return (
    <div className={styles.timeline}>
      <div className={styles.controls}>
        <button type="button" className={styles.btn} onClick={playing ? onPause : onPlay}>
          {playing ? "❚❚ pause" : "▶ train"}
        </button>
        <button type="button" className={styles.btn} onClick={onReset}>
          ↺ new seed
        </button>
        <span className={styles.readout}>
          step {shown.step.toLocaleString("en")} · loss {shown.loss.toFixed(4)}
          {scrub !== null ? <span className={styles.replay}> · replay</span> : null}
        </span>
      </div>
      <div ref={ref}>
        {w > 0 ? (
          <svg
            width={w}
            height={H}
            className={styles.lossSvg}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              onPause();
              pick(e);
            }}
            onPointerMove={(e) => e.buttons && pick(e)}
            role="slider"
            aria-label="Replay training"
            aria-valuemin={0}
            aria-valuemax={snaps.length - 1}
            aria-valuenow={scrub ?? snaps.length - 1}
            tabIndex={0}
            onKeyDown={(e) => {
              const cur = scrub ?? snaps.length - 1;
              if (e.key === "ArrowLeft") setScrub(Math.max(0, cur - 1));
              else if (e.key === "ArrowRight") setScrub(cur + 1 >= snaps.length - 1 ? null : cur + 1);
              else return;
              onPause();
              e.preventDefault();
            }}
          >
            <path d={d} fill="none" stroke="var(--ink-muted)" strokeWidth={1.25} />
            {snaps.map((s, k) =>
              s.edited ? <line key={k} x1={X(s.step)} x2={X(s.step)} y1={H - 6} y2={H} stroke="var(--sp-neg)" strokeWidth={2} /> : null,
            )}
            <line x1={X(shown.step)} x2={X(shown.step)} y1={0} y2={H} stroke="var(--accent)" strokeWidth={1} />
            <circle cx={X(shown.step)} cy={Y(shown.loss)} r={3} fill="var(--accent)" />
          </svg>
        ) : null}
      </div>
      <div className={styles.axisNote}>
        <span>loss (log scale) against training step — drag along it to replay</span>
        <span className={styles.editKey}>edits by hand</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figure 2: one input through the current model.
// ---------------------------------------------------------------------------

export function ProbeFigure({ n, W, b, importance }: { n: number; W: Float64Array; b: Float64Array; importance: number[] }) {
  const [on, setOn] = useState<number[]>([0]);
  const [amp, setAmp] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const w = Math.max(240, useWidth(ref));
  const active = on.filter((i) => i < n);
  const x = Array.from({ length: n }, (_, i) => (active.includes(i) ? amp : 0));
  const out = reconstruct(W, b, n, 2, x);
  let err = 0;
  for (let i = 0; i < n; i++) err += importance[i] * (x[i] - out[i]) ** 2;
  const H = 132;
  const top = 1.35;
  const gw = w / n;
  const Y = (v: number) => H - 18 - (Math.min(v, top) / top) * (H - 30);
  const toggle = (i: number) => setOn((s) => (s.includes(i) ? s.filter((j) => j !== i) : [...s, i]));

  return (
    <figure className={`${styles.figure} ${styles.root}`}>
      <div className={styles.chips}>
        <span className={styles.dim}>active features:</span>
        {Array.from({ length: n }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={active.includes(i)}
            className={`${styles.chip} ${active.includes(i) ? styles.chipOn : ""}`}
            onClick={() => toggle(i)}
          >
            {i + 1}
          </button>
        ))}
        <span className={styles.dim}>
          {" "}
          each set to{" "}
          <Scrub value={amp} min={0.1} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={setAmp} label="Input value" />
        </span>
      </div>
      <div ref={ref}>
        <svg width={w} height={H} className={styles.probe}>
          <line x1={0} x2={w} y1={Y(0)} y2={Y(0)} stroke="var(--border-strong)" />
          {Array.from({ length: n }, (_, i) => {
            const x0 = i * gw + gw * 0.25;
            const bw = gw * 0.5;
            const leak = !active.includes(i) && out[i] > 0.005;
            return (
              <g key={i} onClick={() => toggle(i)} style={{ cursor: "pointer" }}>
                <rect x={i * gw} y={0} width={gw} height={H} fill="transparent" />
                {x[i] > 0 ? (
                  <rect x={x0 - 3} y={Y(x[i])} width={bw + 6} height={Y(0) - Y(x[i])} fill="none" stroke="var(--ink-faint)" strokeDasharray="3 3" />
                ) : null}
                <rect
                  x={x0}
                  y={Y(out[i])}
                  width={bw}
                  height={Math.max(0, Y(0) - Y(out[i]))}
                  fill={leak ? "var(--sp-neg)" : "var(--accent)"}
                  className={styles.bar}
                />
                <text x={i * gw + gw / 2} y={H - 4} textAnchor="middle" className={styles.tick}>
                  {i + 1}
                </text>
                {out[i] > 0.005 ? (
                  <text x={i * gw + gw / 2} y={Y(out[i]) - 4} textAnchor="middle" className={styles.tick}>
                    {out[i].toFixed(2)}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      <figcaption className={styles.caption}>
        Dashed outline: the input <i>x</i>. Bars: the output <i>x′</i>, in{" "}
        <span style={{ color: "var(--sp-neg)" }}>red</span> where a feature that is off comes out on. Weighted error{" "}
        <span className={styles.mono}>{err.toFixed(3)}</span>.
      </figcaption>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Figure 3: phase diagram for two features in one dimension, computed now.
// ---------------------------------------------------------------------------

type Cell = { xi: number; yi: number; rel: number; density: number; w1: number; w2: number; b1: number; b2: number; loss: number; phase: Phase; born: number };

const SIZE = 14;
const PHASE_NAME: Record<Phase, string> = {
  ignored: "feature 2 dropped",
  dedicated: "feature 2 takes the dimension",
  superposed: "both, in superposition",
};

export function PhaseFigure() {
  const rootRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pal = usePalette(rootRef);
  const visible = useVisible(rootRef);
  const gw = useWidth(gridRef);
  const size = Math.max(200, Math.min(gw, 340));
  const [cells, setCells] = useState<Map<number, Cell>>(new Map());
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    if (visible && !started) setStarted(true);
  }, [visible, started]);

  useEffect(() => {
    if (!started) return;
    setCells(new Map());
    const worker = new Worker(new URL("./phase.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<Omit<Cell, "born"> & { run: number }>) => {
      const c = e.data;
      if (c.run !== run) return;
      setCells((prev) => new Map(prev).set(c.yi * SIZE + c.xi, { ...c, born: performance.now() }));
    };
    worker.postMessage({ size: SIZE, run });
    return () => worker.terminate();
  }, [started, run]);

  // a short fade for cells as they arrive
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setFrame((f) => f + 1);
      if ([...cells.values()].some((c) => performance.now() - c.born < 400)) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cells]);

  const plot = size - 36;
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal) return;
    const ctx = setupCanvas(canvas, size, size);
    const c = plot / SIZE;
    const ox = 32;
    const now = performance.now();
    ctx.strokeStyle = pal.border;
    ctx.strokeRect(ox - 0.5, 0.5, plot, plot);
    for (const cell of cells.values()) {
      const k = Math.min(1, (now - cell.born) / 400);
      const col = cell.phase === "superposed" ? pal.neg : cell.phase === "dedicated" ? pal.accent : pal.ignored;
      ctx.fillStyle = withAlpha(col, 0.88 * k);
      // sparse at the top: row 0 (density 0.01) is drawn highest
      const px = ox + cell.xi * c;
      const py = cell.yi * c;
      ctx.fillRect(px + 0.5, plot - py - c + 0.5, c - 1, c - 1);
    }
    for (const [key, colr, lw] of [
      [hover, pal.ink, 1],
      [sel, pal.ink, 2],
    ] as const) {
      if (key == null) continue;
      const xi = key % SIZE;
      const yi = Math.floor(key / SIZE);
      ctx.strokeStyle = colr;
      ctx.lineWidth = lw;
      ctx.strokeRect(ox + xi * c + 0.5, plot - yi * c - c + 0.5, c - 1, c - 1);
    }
    ctx.lineWidth = 1;
    ctx.fillStyle = pal.faint;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.fillText("0.1", ox + c / 2, plot + 14);
    ctx.fillText("1", ox + plot / 2, plot + 14);
    ctx.fillText("10", ox + plot - c / 2, plot + 14);
    ctx.fillText("importance of feature 2", ox + plot / 2, plot + 28);
    ctx.textAlign = "right";
    ctx.fillText("0.01", ox - 4, c / 2 + 4);
    ctx.fillText("0.1", ox - 4, plot / 2 + 4);
    ctx.fillText("1", ox - 4, plot - c / 2 + 4);
    ctx.save();
    ctx.translate(9, plot / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("density", 0, 0);
    ctx.restore();
    ctx.textAlign = "start";
  });

  const cellAt = (e: { clientX: number; clientY: number; currentTarget: HTMLCanvasElement }) => {
    const r = e.currentTarget.getBoundingClientRect();
    const c = plot / SIZE;
    const xi = Math.floor((e.clientX - r.left - 32) / c);
    const yi = Math.floor((plot - (e.clientY - r.top)) / c);
    if (xi < 0 || yi < 0 || xi >= SIZE || yi >= SIZE) return null;
    return yi * SIZE + xi;
  };

  const shownKey = hover ?? sel;
  const shownCell = shownKey != null ? cells.get(shownKey) : undefined;
  const counts = { ignored: 0, dedicated: 0, superposed: 0 };
  for (const c of cells.values()) counts[c.phase]++;

  return (
    <figure ref={rootRef} className={`${styles.figure} ${styles.root}`}>
      <div className={styles.phaseGrid}>
        <div ref={gridRef}>
          <canvas
            ref={canvasRef}
            className={styles.canvas}
            onPointerMove={(e) => setHover(cellAt(e))}
            onPointerLeave={() => setHover(null)}
            onClick={(e) => setSel(cellAt(e))}
            role="img"
            aria-label="Phase diagram: which solution two features in one dimension reach, by density and relative importance."
          />
        </div>
        <div className={styles.side}>
          <ul className={styles.legend}>
            {(["ignored", "dedicated", "superposed"] as Phase[]).map((p) => (
              <li key={p}>
                <span
                  className={styles.swatch}
                  style={{ background: p === "superposed" ? "var(--sp-neg)" : p === "dedicated" ? "var(--accent)" : "var(--sp-ignored)" }}
                />
                {PHASE_NAME[p]} <span className={styles.dim}>{counts[p]}</span>
              </li>
            ))}
          </ul>
          <NumberLine cell={shownCell} pal={pal} />
          <div className={styles.controls}>
            <span className={styles.readout}>
              {cells.size < SIZE * SIZE ? `training ${cells.size} / ${SIZE * SIZE} models…` : `${SIZE * SIZE} models trained in your browser`}
            </span>
            <button type="button" className={styles.btn} onClick={() => setRun((r) => r + 1)} disabled={!started}>
              ↺ new seeds
            </button>
          </div>
        </div>
      </div>
    </figure>
  );
}

function NumberLine({ cell, pal }: { cell: Cell | undefined; pal: ReturnType<typeof usePalette> }) {
  const ref = useRef<HTMLDivElement>(null);
  const w = Math.max(200, useWidth(ref));
  const X = (v: number) => w / 2 + (v / 1.6) * (w / 2 - 12);
  return (
    <div ref={ref} className={styles.numberLine}>
      {cell && pal ? (
        <>
          <svg width={w} height={44}>
            <line x1={8} x2={w - 8} y1={26} y2={26} stroke="var(--border-strong)" />
            <line x1={X(0)} x2={X(0)} y1={20} y2={32} stroke="var(--ink-faint)" />
            {[
              { v: cell.w1, col: "var(--ink)", label: "W₁", y: 20 },
              { v: cell.w2, col: "var(--accent)", label: "W₂", y: 32 },
            ].map(({ v, col, label, y }) => (
              <g key={label}>
                <line x1={X(0)} x2={X(v)} y1={y} y2={y} stroke={col} strokeWidth={2} />
                <circle cx={X(v)} cy={y} r={3} fill={col} />
                <text x={X(v)} y={y < 26 ? y - 6 : y + 12} textAnchor="middle" className={styles.tick} fill={col}>
                  {label}
                </text>
              </g>
            ))}
          </svg>
          <div className={styles.mono}>
            density {cell.density.toFixed(3)} · importance {cell.rel.toFixed(2)}
            <br />W = [{fmt(cell.w1)}, {fmt(cell.w2)}] · b = [{fmt(cell.b1)}, {fmt(cell.b2)}]
          </div>
        </>
      ) : (
        <div className={styles.dim}>Point at a cell to see the weights it found.</div>
      )}
    </div>
  );
}
