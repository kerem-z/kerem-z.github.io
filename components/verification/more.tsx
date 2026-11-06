"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  BaB,
  bisect,
  boxAround,
  clip,
  crownHidden,
  crownMargin,
  exactImage,
  exactMargin,
  forward,
  ibp,
  ibpMargin,
  linearLower,
  logits,
  marginSpec,
  predict,
  within,
  type BabNode,
  type Pt,
} from "./net";
import styles from "./verification.module.css";
import { NET } from "./weights";
import type { BoxProps } from "./figures";
import {
  allRegions,
  classColor,
  drawCross,
  EPS_MAX,
  FieldCanvas,
  fmt,
  makeView,
  renderField,
  setupCanvas,
  strokeBox,
  usePalette,
  useVisible,
  useWidth,
  VIEW,
  withAlpha,
  type Palette,
  type View,
} from "./widgets";

type Method = "ibp" | "crown" | "exact";
const METHODS: { m: Method; name: string }[] = [
  { m: "ibp", name: "intervals (IBP)" },
  { m: "crown", name: "linear (CROWN)" },
  { m: "exact", name: "exact" },
];

/** Lower bound on the margin over the box, by each method. */
function marginBy(m: Method, x0: Pt, eps: number, k: number) {
  const box = boxAround(x0, eps);
  if (m === "ibp") return ibpMargin(NET, box, k);
  if (m === "crown") return crownMargin(NET, box, k);
  return exactMargin(NET, within(allRegions(), box), k).value;
}

const GW = 104;
const GH = Math.round((GW * (VIEW.y1 - VIEW.y0)) / (VIEW.x1 - VIEW.x0));
type MapMode = "none" | "crown" | "exact" | "ratio";

// ---------------------------------------------------------------------------
// Figure 4: certified radii in the input plane, and the box's image in logit space.
// ---------------------------------------------------------------------------

export function CompareFigure({ x0, eps, setX0, setEps, focus }: BoxProps) {
  const rootRef = useRef<HTMLElement>(null);
  const pal = usePalette(rootRef);
  const visible = useVisible(rootRef);
  const k = predict(NET, x0);
  const [hover, setHover] = useState<Method | null>(null);
  const shown = hover ?? (focus?.kind === "method" ? focus.m : null);

  const radii = useMemo(() => {
    const out = {} as Record<Method, number>;
    for (const { m } of METHODS) out[m] = bisect((e) => marginBy(m, x0, e, k) > 0, EPS_MAX, 1e-3);
    return out;
  }, [x0, k]);
  const bounds = useMemo(() => {
    const out = {} as Record<Method, number>;
    for (const { m } of METHODS) out[m] = marginBy(m, x0, eps, k);
    return out;
  }, [x0, eps, k]);

  // the radius map, computed once in a worker when the figure first comes into view
  const [mapMode, setMapMode] = useState<MapMode>("none");
  const grid = useRef<{ ibp: Float32Array; crown: Float32Array; exact: Float32Array; rows: number } | null>(null);
  const [rows, setRows] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!visible || started.current) return;
    started.current = true;
    grid.current = {
      ibp: new Float32Array(GW * GH),
      crown: new Float32Array(GW * GH),
      exact: new Float32Array(GW * GH),
      rows: 0,
    };
    const worker = new Worker(new URL("./radius.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ j: number; ibp: Float32Array; crown: Float32Array; exact: Float32Array }>) => {
      const g = grid.current!;
      const { j } = e.data;
      g.ibp.set(e.data.ibp, j * GW);
      g.crown.set(e.data.crown, j * GW);
      g.exact.set(e.data.exact, j * GW);
      g.rows = j + 1;
      if (j % 4 === 3 || j === GH - 1) setRows(j + 1);
    };
    worker.postMessage({ gw: GW, gh: GH, view: VIEW, epsMax: EPS_MAX });
    return () => {
      // keep the worker if the figure merely scrolls away; it finishes on its own
    };
  }, [visible]);

  const overlay = (ctx: CanvasRenderingContext2D, view: View, p: Palette) => {
    const g = grid.current;
    if (mapMode !== "none" && g) {
      const cw = view.w / GW;
      const ch = view.h / GH;
      ctx.fillStyle = withAlpha(p.bg, 0.55);
      ctx.fillRect(0, 0, view.w, view.h);
      for (let j = 0; j < g.rows; j++)
        for (let i = 0; i < GW; i++) {
          const q = j * GW + i;
          let a: number;
          let col = p.ink;
          if (mapMode === "ratio") {
            if (g.exact[q] < 0.02) continue;
            a = 0.5 * (1 - Math.min(1, g.crown[q] / g.exact[q]));
            col = p.neg;
          } else {
            const t = (mapMode === "crown" ? g.crown[q] : g.exact[q]) / EPS_MAX;
            // banded, like a contour map: one band per 0.1
            a = 0.04 + 0.42 * (1 - Math.floor(t * 10) / 10);
          }
          ctx.fillStyle = withAlpha(col, a);
          ctx.fillRect(i * cw, j * ch, cw + 0.5, ch + 0.5);
        }
    }
    // the three certified boxes, largest first
    const styleOf = (m: Method) =>
      m === "ibp"
        ? { c: withAlpha(p.ink, 0.6), w: 1, d: [3, 3] }
        : m === "crown"
          ? { c: p.accent, w: 1.5, d: [] }
          : { c: p.ink, w: 1, d: [1, 2.5] };
    for (const { m } of [...METHODS].reverse()) {
      const s = styleOf(m);
      const on = shown === m;
      strokeBox(ctx, view, x0, radii[m], s.c, on ? s.w + 1.25 : s.w, s.d);
    }
  };

  return (
    <figure ref={rootRef} className={styles.figure}>
      <div className={styles.controls}>
        <span>shade by</span>
        {(
          [
            ["none", "decisions"],
            ["crown", "CROWN radius"],
            ["exact", "true radius"],
            ["ratio", "what CROWN misses"],
          ] as [MapMode, string][]
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            className={`${styles.btn} ${mapMode === m ? styles.btnOn : ""}`}
            aria-pressed={mapMode === m}
            onClick={() => setMapMode(m)}
          >
            {label}
          </button>
        ))}
        {mapMode !== "none" && rows < GH ? (
          <span className={styles.dim}>computing… {Math.round((100 * rows) / GH)}%</span>
        ) : null}
      </div>
      <div className={styles.halves}>
        <div>
          <FieldCanvas
            x0={x0}
            eps={eps}
            setX0={setX0}
            setEps={setEps}
            pal={pal}
            overlay={overlay}
            overlayKey={`${mapMode}|${rows}|${shown}|${radii.ibp}|${radii.crown}|${radii.exact}`}
            maxWidth={420}
            label="Input plane with certified boxes. Drag to move the point."
          />
          <p className={styles.planeLabel}>input plane · the box of Figure 1 and the largest certified boxes</p>
        </div>
        <div>
          <LogitPlane x0={x0} eps={eps} k={k} pal={pal} shown={shown} bounds={bounds} />
          <p className={styles.planeLabel}>logit plane · where the box lands, and what each method can say about it</p>
        </div>
      </div>
      <table className={`${styles.table} ${styles.side}`} style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>method</th>
            <th>margin on this box ≥</th>
            <th>largest certified ε</th>
          </tr>
        </thead>
        <tbody>
          {METHODS.map(({ m, name }) => (
            <tr
              key={m}
              className={shown === m ? styles.rowFocus : ""}
              onPointerEnter={() => setHover(m)}
              onPointerLeave={() => setHover(null)}
            >
              <td>
                <span
                  className={`${styles.key} ${m === "ibp" ? styles.keyDash : ""}`}
                  style={{
                    color: m === "crown" ? "var(--accent)" : "var(--ink)",
                    borderTopStyle: m === "exact" ? "dotted" : undefined,
                  }}
                />
                {name}
              </td>
              <td className={bounds[m] > 0 ? styles.good : styles.bad}>{fmt(bounds[m])}</td>
              <td>{radii[m].toFixed(3)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** CROWN's outer polygon for the logits: the intersection of its bounds in many directions. */
function crownPolygon(x0: Pt, eps: number, dirs = 64): Pt[] {
  const box = boxAround(x0, eps);
  const L = NET.W.length;
  const { bounds } = crownHidden(NET, box);
  let poly: Pt[] = [
    [-1e4, -1e4],
    [1e4, -1e4],
    [1e4, 1e4],
    [-1e4, 1e4],
  ];
  for (let t = 0; t < dirs; t++) {
    const a = (2 * Math.PI * t) / dirs;
    const d = [Math.cos(a), Math.sin(a)];
    // d·z ≤ h, where −h is CROWN's lower bound on −d·z
    const h = -linearLower(NET, L - 1, [-d[0], -d[1]], bounds, box).value;
    poly = clip(poly, -d[0], -d[1], h);
    if (poly.length < 3) break;
  }
  return poly;
}

function LogitPlane({
  x0,
  eps,
  k,
  pal,
  shown,
  bounds,
}: {
  x0: Pt;
  eps: number;
  k: number;
  pal: Palette | null;
  shown: Method | null;
  bounds: Record<Method, number>;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = Math.max(240, Math.min(useWidth(wrapRef), 420));

  const geo = useMemo(() => {
    const box = boxAround(x0, eps);
    const image = exactImage(NET, within(allRegions(), box));
    const out = ibp(NET, box)[NET.W.length - 1];
    const poly = crownPolygon(x0, eps);
    const z = logits(NET, x0);
    return { image, rect: out, poly, z };
  }, [x0, eps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal) return;
    const ctx = setupCanvas(canvas, size, size);
    const { image, rect, poly, z } = geo;
    // fit everything, same scale on both axes
    let lo0 = Math.min(rect.l[0], ...poly.map((p) => p[0]));
    let hi0 = Math.max(rect.u[0], ...poly.map((p) => p[0]));
    let lo1 = Math.min(rect.l[1], ...poly.map((p) => p[1]));
    let hi1 = Math.max(rect.u[1], ...poly.map((p) => p[1]));
    const span = Math.max(hi0 - lo0, hi1 - lo1) * 1.12 || 1;
    const c0 = (lo0 + hi0) / 2;
    const c1 = (lo1 + hi1) / 2;
    lo0 = c0 - span / 2;
    hi0 = c0 + span / 2;
    lo1 = c1 - span / 2;
    hi1 = c1 + span / 2;
    const P = (a: number, b: number) => [((a - lo0) / span) * size, ((hi1 - b) / span) * size] as const;

    // the half-plane where the decision flips, faintly
    const other = classColor(pal, 1 - k);
    ctx.fillStyle = withAlpha(other, 0.07);
    ctx.beginPath();
    // k = 1 ("lower") holds where z_low > z_up, above the diagonal, so the flip is
    // the triangle below it; for k = 0 it is the triangle above
    const A = Math.min(lo0, lo1) - span;
    const B = Math.max(hi0, hi1) + span;
    const corners: [number, number][] = [
      [A, A],
      [B, B],
      k === 1 ? [B, A] : [A, B],
    ];
    corners.forEach(([a, b], i) => (i ? ctx.lineTo(...P(a, b)) : ctx.moveTo(...P(a, b))));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = withAlpha(pal.ink, 0.6);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(...P(lo0 - span, lo0 - span));
    ctx.lineTo(...P(hi0 + span, hi0 + span));
    ctx.stroke();

    // CROWN's polygon
    ctx.fillStyle = withAlpha(pal.accent, shown === "crown" ? 0.16 : 0.09);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = shown === "crown" ? 2.25 : 1.25;
    ctx.beginPath();
    poly.forEach((p, i) => (i ? ctx.lineTo(...P(p[0], p[1])) : ctx.moveTo(...P(p[0], p[1]))));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // IBP's rectangle
    const [rx, ry] = P(rect.l[0], rect.u[1]);
    const [sx, sy] = P(rect.u[0], rect.l[1]);
    ctx.strokeStyle = withAlpha(pal.ink, 0.6);
    ctx.lineWidth = shown === "ibp" ? 2.25 : 1;
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(rx, ry, sx - rx, sy - ry);
    ctx.setLineDash([]);

    // the true image of the box: one polygon per linear region, all one colour
    ctx.fillStyle = shown === "exact" ? pal.ink : pal.muted;
    for (const q of image) {
      ctx.beginPath();
      q.forEach((p, i) => (i ? ctx.lineTo(...P(p[0], p[1])) : ctx.moveTo(...P(p[0], p[1]))));
      ctx.closePath();
      ctx.fill();
      // hairline in the same colour closes the seams between neighbouring pieces
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    // where each method's margin bound sits: the line z_k − z_other = bound
    const c = marginSpec(k);
    for (const m of ["ibp", "crown"] as Method[]) {
      const b = bounds[m];
      // c·z = b  ⇔  z_1 = z_0 − b·sign (for c = ±(1, −1))
      const off = c[0] > 0 ? -b : b;
      ctx.strokeStyle = m === "crown" ? pal.accent : withAlpha(pal.ink, 0.6);
      ctx.lineWidth = shown === m ? 1.75 : 0.9;
      ctx.setLineDash(m === "ibp" ? [3, 3] : [6, 3]);
      ctx.beginPath();
      ctx.moveTo(...P(lo0 - span, lo0 - span + off));
      ctx.lineTo(...P(hi0 + span, hi0 + span + off));
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // x₀'s own logits
    const [zx, zy] = P(z[0], z[1]);
    ctx.fillStyle = pal.bg;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(zx, zy, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = pal.faint;
    ctx.font = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText("z_up →", size - 46, size - 6);
    ctx.save();
    ctx.translate(10, 46);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("z_low →", 0, 0);
    ctx.restore();
  }, [geo, pal, size, k, shown, bounds]);

  return (
    <div ref={wrapRef} className={styles.plane}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="Logit plane: the exact image of the box, the IBP rectangle and the CROWN polygon around it, and the decision line"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figure 5: branch and bound on ReLU phases.
// ---------------------------------------------------------------------------

const STEP_MS = 110;

const splitText = (n: BabNode) => {
  const parts: string[] = [];
  n.splits.forEach((layer, j) =>
    layer.forEach((s, i) => {
      if (s) parts.push(`z${j === 0 ? "₁" : "₂"}[${i + 1}] ${s > 0 ? "≥" : "≤"} 0`);
    }),
  );
  return parts.length ? parts.join(", ") : "no phases fixed";
};

/** The leaf of the tree that a point falls in, by following its signs down. */
function leafAt(bab: BaB, pre: Float64Array[]) {
  let n = bab.nodes[0];
  while (n.children && n.split) {
    const next = pre[n.split.layer][n.split.i] >= 0 ? n.children[0] : n.children[1];
    if (next < 0) break;
    n = bab.nodes[next];
  }
  return n;
}

export function BabFigure({ x0, eps, setEps }: Pick<BoxProps, "x0" | "eps" | "setEps">) {
  const rootRef = useRef<HTMLElement>(null);
  const pal = usePalette(rootRef);
  const visible = useVisible(rootRef);
  const k = predict(NET, x0);
  const bab = useRef<BaB | null>(null);
  const history = useRef<number[]>([]);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const exact = useMemo(() => exactMargin(NET, within(allRegions(), boxAround(x0, eps)), k).value, [x0, eps, k]);

  useEffect(() => {
    bab.current = new BaB(NET, boxAround(x0, eps), k);
    history.current = [bab.current.globalLb];
    setPlaying(false);
    setHover(null);
    setTick((t) => t + 1);
  }, [x0, eps, k]);

  useEffect(() => {
    if (!playing || !visible) return;
    const id = window.setInterval(() => {
      const b = bab.current;
      if (!b) return;
      const more = b.step();
      if (b.verdict !== "falsified") history.current.push(b.globalLb);
      setTick((t) => t + 1);
      if (!more) setPlaying(false);
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, [playing, visible]);

  const stepOnce = () => {
    const b = bab.current;
    if (!b) return;
    b.step();
    if (b.verdict !== "falsified") history.current.push(b.globalLb);
    setTick((t) => t + 1);
  };
  const finish = () => {
    const b = bab.current;
    if (!b) return;
    while (b.step()) history.current.push(b.globalLb);
    if (b.verdict !== "falsified") history.current.push(b.globalLb);
    setPlaying(false);
    setTick((t) => t + 1);
  };
  const play = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else setPlaying(true);
  };
  const restart = () => {
    bab.current = new BaB(NET, boxAround(x0, eps), k);
    history.current = [bab.current.globalLb];
    setPlaying(false);
    setTick((t) => t + 1);
  };

  const b = bab.current;
  const done = !b || b.verdict !== "running";
  const counts = { open: 0, verified: 0, infeasible: 0 };
  if (b) for (const n of b.nodes) if (n.status in counts) counts[n.status as keyof typeof counts]++;
  const hovered = b && hover !== null ? b.nodes[hover] : null;

  return (
    <figure ref={rootRef} className={styles.figure}>
      <div className={styles.controls}>
        <button type="button" className={styles.btn} onClick={stepOnce} disabled={done || playing}>
          split one
        </button>
        <button type="button" className={styles.btn} onClick={playing ? () => setPlaying(false) : play} disabled={done}>
          {playing ? "pause" : "run"}
        </button>
        <button type="button" className={styles.btn} onClick={finish} disabled={done}>
          finish
        </button>
        <button type="button" className={styles.btn} onClick={restart}>
          restart
        </button>
        <span className={styles.dim}>presets</span>
        {[0.3, 0.5, 0.6].map((e) => (
          <button
            key={e}
            type="button"
            className={`${styles.btn} ${Math.abs(eps - e) < 1e-9 ? styles.btnOn : ""}`}
            onClick={() => setEps(e)}
          >
            ε = {e.toFixed(2)}
          </button>
        ))}
      </div>
      <div className={styles.halves}>
        <div>
          {pal && b ? <BoxZoom bab={b} x0={x0} eps={eps} pal={pal} hover={hover} tick={tick} /> : null}
          <p className={styles.planeLabel}>
            the box (ε = {eps.toFixed(2)}), coloured by the leaf each point falls in
          </p>
        </div>
        <div style={{ minWidth: 0 }}>
          {pal && b ? <Icicle bab={b} pal={pal} hover={hover} setHover={setHover} tick={tick} /> : null}
          <p className={styles.planeLabel}>the tree · root on top · width ∝ number of leaves below</p>
          {pal && b ? <LbPlot values={history.current} exact={exact} pal={pal} tick={tick} /> : null}
          <p className={styles.planeLabel}>best proven lower bound on the margin, after each split</p>
        </div>
      </div>
      <div className={styles.readout}>
        {b ? (
          <>
            {b.steps} splits, {b.nodes.length} nodes · {counts.verified} proved, {counts.infeasible} empty, {counts.open}{" "}
            open ·{" "}
            {b.verdict === "verified" ? (
              <span className={styles.good}>proved: margin ≥ {fmt(b.globalLb)} on the whole box</span>
            ) : b.verdict === "falsified" && b.cex ? (
              <span className={styles.bad}>
                counterexample at ({fmt(b.cex[0], 3)}, {fmt(b.cex[1], 3)}), margin there {fmt(marginAt(b.cex, k), 3)}
              </span>
            ) : (
              <>margin ≥ {fmt(b.globalLb)} so far</>
            )}
            <span className={styles.dim}> · true minimum {fmt(exact)}</span>
            <br />
            {hovered ? (
              <span>
                node {hovered.id}: {splitText(hovered)} · {hovered.status}
                {isFinite(hovered.lb) ? `, bound ${fmt(hovered.lb)}${hovered.exact ? " (exact)" : ""}` : ""}
              </span>
            ) : (
              <span className={styles.dim}>Point at a node to see which phases it fixes.</span>
            )}
          </>
        ) : null}
      </div>
    </figure>
  );
}

const marginAt = (x: Pt, k: number) => {
  const z = forward(NET, x)[NET.W.length - 1];
  return k === 0 ? z[0] - z[1] : z[1] - z[0];
};

function BoxZoom({ bab, x0, eps, pal, hover, tick }: { bab: BaB; x0: Pt; eps: number; pal: Palette; hover: number | null; tick: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = Math.max(220, Math.min(useWidth(wrapRef), 380));
  const pad = eps * 0.18;
  const view = useMemo(
    () => makeView(size, { x0: x0[0] - eps - pad, x1: x0[0] + eps + pad, y0: x0[1] - eps - pad, y1: x0[1] + eps + pad }),
    [size, x0, eps, pad],
  );
  const image = useMemo(() => renderField(NET, view, pal, 2), [view, pal]);
  // each pixel's pre-activations, computed once per box
  const STEP = 3;
  const pres = useMemo(() => {
    const out: { px: number; py: number; pre: Float64Array[] }[] = [];
    const [ax, ay] = view.P(x0[0] - eps, x0[1] + eps);
    const [bx, by] = view.P(x0[0] + eps, x0[1] - eps);
    for (let py = ay; py < by; py += STEP)
      for (let px = ax; px < bx; px += STEP) out.push({ px, py, pre: forward(NET, view.inv(px + STEP / 2, py + STEP / 2)) });
    return out;
  }, [view, x0, eps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, view.w, view.h);
    ctx.drawImage(image, 0, 0, view.w, view.h);
    // nodes under the hovered one
    const under = new Set<number>();
    if (hover !== null) {
      const stack = [hover];
      while (stack.length) {
        const id = stack.pop()!;
        under.add(id);
        for (const c of bab.nodes[id].children ?? []) if (c >= 0) stack.push(c);
      }
    }
    for (const { px, py, pre } of pres) {
      const leaf = leafAt(bab, pre);
      let col: string | null = null;
      if (leaf.status === "verified") col = withAlpha(pal.accent, 0.3);
      else if (leaf.status === "falsified") col = withAlpha(pal.neg, 0.35);
      else if (leaf.status === "open") col = withAlpha(pal.ink, 0.04);
      if (col) {
        ctx.fillStyle = col;
        ctx.fillRect(px, py, STEP, STEP);
      }
      if (hover !== null && under.has(leaf.id)) {
        ctx.fillStyle = withAlpha(pal.ink, 0.22);
        ctx.fillRect(px, py, STEP, STEP);
      }
    }
    strokeBox(ctx, view, x0, eps, pal.ink, 1.25);
    if (bab.cex) drawCross(ctx, view, bab.cex, pal.neg, 6);
    const [cx, cy] = view.P(x0[0], x0[1]);
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [bab, image, pres, view, pal, hover, tick, x0, eps]);

  return (
    <div ref={wrapRef} className={styles.plane}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="The box, coloured by branch-and-bound leaf" />
    </div>
  );
}

function Icicle({
  bab,
  pal,
  hover,
  setHover,
  tick,
}: {
  bab: BaB;
  pal: Palette;
  hover: number | null;
  setHover: (id: number | null) => void;
  tick: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const w = Math.max(220, useWidth(wrapRef));
  const H = 180;

  // lay out: each node gets a slice of its parent's width in proportion to its leaves
  const layout = useMemo(() => {
    const leaves = new Array<number>(bab.nodes.length).fill(0);
    for (let i = bab.nodes.length - 1; i >= 0; i--) {
      const n = bab.nodes[i];
      const kids = (n.children ?? []).filter((c) => c >= 0);
      leaves[i] = kids.length ? kids.reduce((s, c) => s + leaves[c], 0) : 1;
    }
    const x = new Float64Array(bab.nodes.length);
    const span = new Float64Array(bab.nodes.length);
    span[0] = 1;
    let depth = 0;
    for (const n of bab.nodes) {
      depth = Math.max(depth, n.depth);
      let at = x[n.id];
      for (const c of n.children ?? []) {
        if (c < 0) continue;
        x[c] = at;
        span[c] = (span[n.id] * leaves[c]) / leaves[n.id];
        at += span[c];
      }
    }
    return { x, span, depth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bab, tick]);
  const rowH = Math.min(18, (H - 4) / (layout.depth + 1));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = setupCanvas(canvas, w, H);
    for (const n of bab.nodes) {
      const x = layout.x[n.id] * w;
      const sw = layout.span[n.id] * w;
      const y = n.depth * rowH;
      const fill =
        n.status === "verified"
          ? withAlpha(pal.accent, 0.6)
          : n.status === "falsified"
            ? pal.neg
            : n.status === "infeasible"
              ? withAlpha(pal.faint, 0.25)
              : n.status === "open"
                ? pal.bg
                : withAlpha(pal.ink, 0.1);
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, sw, rowH - 1);
      if (n.status === "open") {
        ctx.strokeStyle = pal.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, sw - 1), rowH - 2);
      }
      if (hover === n.id) {
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, y + 0.75, Math.max(0, sw - 1.5), rowH - 2.5);
      }
      // separate siblings with a hairline of background
      ctx.fillStyle = pal.bg;
      ctx.fillRect(x + sw - 0.5, y, 0.5, rowH);
    }
  }, [bab, layout, w, rowH, pal, hover, tick]);

  const pick = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = (e.clientX - r.left) / w;
    const d = Math.floor((e.clientY - r.top) / rowH);
    for (const n of bab.nodes)
      if (n.depth === d && fx >= layout.x[n.id] && fx < layout.x[n.id] + layout.span[n.id]) return setHover(n.id);
    setHover(null);
  };

  return (
    <div ref={wrapRef} style={{ minWidth: 0 }}>
      <canvas
        ref={canvasRef}
        className={styles.tree}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label="The branch-and-bound tree"
      />
    </div>
  );
}

function LbPlot({ values, exact, pal, tick }: { values: number[]; exact: number; pal: Palette; tick: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const w = Math.max(220, useWidth(wrapRef));
  const H = 92;
  const finite = values.filter((v) => isFinite(v));
  const lo = Math.min(0, exact, ...finite);
  const hi = Math.max(0, exact, ...finite);
  const pad = (hi - lo) * 0.1 || 1;
  const Y = (v: number) => 6 + ((hi + pad - v) / (hi - lo + 2 * pad)) * (H - 12);
  const n = Math.max(2, values.length);
  const X = (i: number) => 4 + (i / (n - 1)) * (w - 8);
  const path = values
    .map((v, i) => (isFinite(v) ? `${X(i).toFixed(1)},${Y(v).toFixed(1)}` : null))
    .filter(Boolean)
    .join(" ");
  void tick;
  return (
    <div ref={wrapRef} style={{ minWidth: 0 }}>
      <svg className={styles.lbPlot} width={w} height={H} role="img" aria-label="Lower bound on the margin over time">
        <line x1={0} x2={w} y1={Y(0)} y2={Y(0)} stroke={pal.border} />
        <text x={w - 4} y={Y(0) - 3} textAnchor="end">
          0
        </text>
        <line x1={0} x2={w} y1={Y(exact)} y2={Y(exact)} stroke={pal.ink} strokeDasharray="1 3" />
        <text x={w - 4} y={Y(exact) - 3} textAnchor="end">
          true min {fmt(exact)}
        </text>
        <polyline points={path} fill="none" stroke={pal.accent} strokeWidth={1.5} />
      </svg>
    </div>
  );
}
