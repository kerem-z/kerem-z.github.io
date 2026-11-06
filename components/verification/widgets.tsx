"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { setupCanvas, useWidth, withAlpha } from "@/components/superposition/widgets";
import { moons } from "./data";
import { regions, type Net, type Pt, type Region } from "./net";
import styles from "./verification.module.css";
import { NET } from "./weights";

export { Scrub, TeX, setupCanvas, useVisible, useWidth, withAlpha } from "@/components/superposition/widgets";

// ---------------------------------------------------------------------------
// Shared state and colours
// ---------------------------------------------------------------------------

/** What a hovered phrase in the prose points at. */
export type Focus =
  | null
  | { kind: "samples" }
  | { kind: "worst" }
  | { kind: "unstable" }
  | { kind: "layer"; k: number }
  | { kind: "method"; m: "ibp" | "crown" | "exact" }
  | { kind: "decision" };

/** A phrase that lights up part of a figure while you point at it. */
export function Term({
  focus,
  setFocus,
  children,
}: {
  focus: Exclude<Focus, null>;
  setFocus: (f: Focus) => void;
  children: ReactNode;
}) {
  return (
    <span
      className={styles.term}
      tabIndex={0}
      onPointerEnter={() => setFocus(focus)}
      onPointerLeave={() => setFocus(null)}
      onFocus={() => setFocus(focus)}
      onBlur={() => setFocus(null)}
    >
      {children}
    </span>
  );
}

export type Palette = {
  ink: string;
  muted: string;
  faint: string;
  border: string;
  accent: string;
  neg: string;
  bg: string;
  fill: string;
};

/** Reads the colour tokens from the page, and again whenever the theme flips. */
export function usePalette(ref: React.RefObject<HTMLElement | null>): Palette | null {
  const [p, setP] = useState<Palette | null>(null);
  useEffect(() => {
    const read = () => {
      const el = ref.current;
      if (!el) return;
      const cs = getComputedStyle(el);
      const v = (name: string) => cs.getPropertyValue(name).trim();
      setP({
        ink: v("--ink"),
        muted: v("--ink-muted"),
        faint: v("--ink-faint"),
        border: v("--border-strong"),
        accent: v("--accent"),
        neg: v("--vf-neg"),
        bg: v("--widget-bg"),
        fill: v("--vf-faint-fill"),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => mo.disconnect();
  }, [ref]);
  return p;
}

/** The colour of class k: teal for the upper moon, rust for the lower. */
export const classColor = (pal: Palette, k: number) => (k === 0 ? pal.accent : pal.neg);
export const className = (k: number) => (k === 0 ? "upper" : "lower");

// The linear regions of the page's network, over a square that contains every
// box the figures allow. Computed once, on first use (a few milliseconds).
export const DOMAIN = { lo: [-4, -4], hi: [4, 4] };
let cached: Region[] | null = null;
export const allRegions = () => (cached ??= regions(NET, DOMAIN));

export const DATA = moons(160, 0.12, 7);

export const fmt = (v: number, d = 2) => {
  if (!isFinite(v)) return v > 0 ? "∞" : "−∞";
  const s = (Math.abs(v) < 0.5 * Math.pow(10, -d) ? 0 : v).toFixed(d);
  return s.startsWith("-") ? "−" + s.slice(1) : s;
};

// ---------------------------------------------------------------------------
// The input plane
// ---------------------------------------------------------------------------

/** The part of the input plane the figures show. Boxes may stick out of it, but never out of DOMAIN. */
export const VIEW = { x0: -2.6, x1: 2.6, y0: -1.9, y1: 1.9 };
export const EPS_MAX = 1;

export type View = {
  w: number;
  h: number;
  /** data → pixels */
  P: (x: number, y: number) => [number, number];
  /** pixels → data */
  inv: (px: number, py: number) => Pt;
  /** pixels per unit */
  s: number;
};

export function makeView(w: number, v = VIEW): View {
  const s = w / (v.x1 - v.x0);
  const h = Math.round((v.y1 - v.y0) * s);
  return {
    w,
    h,
    s,
    P: (x, y) => [(x - v.x0) * s, (v.y1 - y) * s],
    inv: (px, py) => [v.x0 + px / s, v.y1 - py / s],
  };
}

/**
 * The network's decision field as an image: a faint tint for each class, a
 * few contour lines of the margin (every 4 logits), and the decision boundary
 * itself, traced by marching squares.
 */
export function renderField(net: Net, view: View, pal: Palette, step = 3): HTMLCanvasElement {
  const dpr = window.devicePixelRatio || 1;
  const cv = document.createElement("canvas");
  cv.width = Math.round(view.w * dpr);
  cv.height = Math.round(view.h * dpr);
  const ctx = cv.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const nx = Math.ceil(view.w / step) + 1;
  const ny = Math.ceil(view.h / step) + 1;
  const m = new Float64Array(nx * ny);
  const a = new Float64Array(2);
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const [x, y] = view.inv(i * step, j * step);
      a[0] = x;
      a[1] = y;
      m[j * nx + i] = logitGap(net, a);
    }
  // tint: stronger further from the boundary, but never loud
  for (let j = 0; j < ny; j++)
    for (let i = 0; i < nx; i++) {
      const v = m[j * nx + i];
      ctx.fillStyle = withAlpha(v > 0 ? pal.neg : pal.accent, 0.05 + 0.09 * Math.min(1, Math.abs(v) / 16));
      ctx.fillRect(i * step - step / 2, j * step - step / 2, step, step);
    }
  const contour = (level: number) => {
    ctx.beginPath();
    for (let j = 0; j + 1 < ny; j++)
      for (let i = 0; i + 1 < nx; i++) {
        const c = [m[j * nx + i], m[j * nx + i + 1], m[(j + 1) * nx + i + 1], m[(j + 1) * nx + i]].map((v) => v - level);
        const corners: [number, number][] = [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ];
        const hits: [number, number][] = [];
        for (let e = 0; e < 4; e++) {
          const p = c[e];
          const q = c[(e + 1) % 4];
          if ((p > 0) !== (q > 0)) {
            const t = p / (p - q);
            const [ax, ay] = corners[e];
            const [bx, by] = corners[(e + 1) % 4];
            hits.push([(ax + t * (bx - ax)) * step, (ay + t * (by - ay)) * step]);
          }
        }
        // two crossings: one segment; four (a saddle): pair them up in order
        for (let h = 0; h + 1 < hits.length; h += 2) {
          ctx.moveTo(hits[h][0], hits[h][1]);
          ctx.lineTo(hits[h + 1][0], hits[h + 1][1]);
        }
      }
    ctx.stroke();
  };
  ctx.lineWidth = 0.75;
  for (let level = -40; level <= 40; level += 4) {
    if (level === 0) continue;
    ctx.strokeStyle = withAlpha(level > 0 ? pal.neg : pal.accent, 0.16);
    contour(level);
  }
  ctx.strokeStyle = withAlpha(pal.ink, 0.75);
  ctx.lineWidth = 1.25;
  contour(0);
  return cv;
}

/** z₁ − z₀: positive where the network says "lower moon". */
function logitGap(net: Net, x: Float64Array) {
  // an inlined forward pass; this runs for every pixel
  let a: ArrayLike<number> = x;
  for (let k = 0; k < net.W.length; k++) {
    const n = net.sizes[k + 1];
    const m = net.sizes[k];
    const z = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let v = net.b[k][i];
      for (let j = 0; j < m; j++) v += net.W[k][i * m + j] * a[j];
      z[i] = k + 1 < net.W.length ? Math.max(0, v) : v;
    }
    a = z;
  }
  return a[1] - a[0];
}

export function drawData(ctx: CanvasRenderingContext2D, view: View, pal: Palette, alpha = 0.55) {
  for (const d of DATA) {
    const [px, py] = view.P(d.x[0], d.x[1]);
    ctx.fillStyle = withAlpha(classColor(pal, d.y), alpha);
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function strokeBox(
  ctx: CanvasRenderingContext2D,
  view: View,
  x0: Pt,
  eps: number,
  color: string,
  width = 1.25,
  dash: number[] = [],
) {
  const [ax, ay] = view.P(x0[0] - eps, x0[1] + eps);
  const [bx, by] = view.P(x0[0] + eps, x0[1] - eps);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.strokeRect(ax, ay, bx - ax, by - ay);
  ctx.setLineDash([]);
}

export function drawPoint(ctx: CanvasRenderingContext2D, view: View, x0: Pt, pal: Palette) {
  const [px, py] = view.P(x0[0], x0[1]);
  ctx.fillStyle = pal.bg;
  ctx.strokeStyle = pal.ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(px, py, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = pal.ink;
  ctx.beginPath();
  ctx.arc(px, py, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

export function drawCross(ctx: CanvasRenderingContext2D, view: View, p: Pt, color: string, r = 4.5) {
  const [px, py] = view.P(p[0], p[1]);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.75;
  ctx.beginPath();
  ctx.moveTo(px - r, py - r);
  ctx.lineTo(px + r, py + r);
  ctx.moveTo(px + r, py - r);
  ctx.lineTo(px - r, py + r);
  ctx.stroke();
}

const clampPoint = (p: Pt): Pt => [
  Math.min(VIEW.x1, Math.max(VIEW.x0, p[0])),
  Math.min(VIEW.y1, Math.max(VIEW.y0, p[1])),
];

/**
 * The input plane with the network's decisions, the data, and the box around
 * x₀. Drag inside the plane to move x₀, drag a corner of the box to change ε;
 * arrow keys move x₀, + and − change ε. `overlay` draws on top.
 */
export function FieldCanvas({
  x0,
  eps,
  setX0,
  setEps,
  overlay,
  overlayKey,
  pal,
  maxWidth = 560,
  label,
}: {
  x0: Pt;
  eps: number;
  setX0: (p: Pt) => void;
  setEps: (e: number) => void;
  overlay?: (ctx: CanvasRenderingContext2D, view: View, pal: Palette) => void;
  overlayKey?: unknown;
  pal: Palette | null;
  maxWidth?: number;
  label: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = Math.max(240, Math.min(useWidth(boxRef), maxWidth));
  const view = useMemo(() => makeView(width), [width]);
  const image = useMemo(() => (pal && width > 0 ? renderField(NET, view, pal) : null), [pal, view, width]);
  const drag = useRef<{ mode: "move" | "size"; dx: number; dy: number } | null>(null);
  const [hot, setHot] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pal || !image) return;
    const ctx = setupCanvas(canvas, view.w, view.h);
    ctx.drawImage(image, 0, 0, view.w, view.h);
    drawData(ctx, view, pal);
    // the box: a soft fill, then its edge; corners get small handles
    const [ax, ay] = view.P(x0[0] - eps, x0[1] + eps);
    const [bx, by] = view.P(x0[0] + eps, x0[1] - eps);
    ctx.fillStyle = withAlpha(pal.ink, 0.05);
    ctx.fillRect(ax, ay, bx - ax, by - ay);
    overlay?.(ctx, view, pal);
    strokeBox(ctx, view, x0, eps, pal.ink, hot ? 1.75 : 1.25);
    ctx.fillStyle = pal.ink;
    for (const [cx, cy] of [
      [ax, ay],
      [bx, ay],
      [ax, by],
      [bx, by],
    ])
      ctx.fillRect(cx - 2.5, cy - 2.5, 5, 5);
    drawPoint(ctx, view, x0, pal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pal, image, view, x0, eps, hot, overlayKey]);

  const local = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  const nearCorner = (px: number, py: number) => {
    const [cx, cy] = view.P(x0[0], x0[1]);
    const r = eps * view.s;
    return Math.abs(Math.abs(px - cx) - r) < 10 && Math.abs(Math.abs(py - cy) - r) < 10;
  };

  const down = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const [px, py] = local(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    if (nearCorner(px, py)) {
      drag.current = { mode: "size", dx: 0, dy: 0 };
      return;
    }
    const [cx, cy] = view.P(x0[0], x0[1]);
    const inside = Math.abs(px - cx) <= eps * view.s + 6 && Math.abs(py - cy) <= eps * view.s + 6;
    if (inside) drag.current = { mode: "move", dx: px - cx, dy: py - cy };
    else {
      drag.current = { mode: "move", dx: 0, dy: 0 };
      setX0(clampPoint(view.inv(px, py)));
    }
  };
  const move = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const [px, py] = local(e);
    const d = drag.current;
    if (!d) {
      setHot(nearCorner(px, py));
      return;
    }
    if (d.mode === "size") {
      const [cx, cy] = view.P(x0[0], x0[1]);
      const r = Math.max(Math.abs(px - cx), Math.abs(py - cy)) / view.s;
      setEps(Math.round(Math.min(EPS_MAX, Math.max(0.01, r)) * 100) / 100);
    } else {
      setX0(clampPoint(view.inv(px - d.dx, py - d.dy)));
    }
  };
  const up = () => {
    drag.current = null;
  };
  const key = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const d = e.shiftKey ? 0.2 : 0.05;
    const moves: Record<string, Pt> = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, d], ArrowDown: [0, -d] };
    if (moves[e.key]) setX0(clampPoint([x0[0] + moves[e.key][0], x0[1] + moves[e.key][1]]));
    else if (e.key === "+" || e.key === "=") setEps(Math.min(EPS_MAX, +(eps + 0.01).toFixed(2)));
    else if (e.key === "-") setEps(Math.max(0.01, +(eps - 0.01).toFixed(2)));
    else return;
    e.preventDefault();
  };

  return (
    <div ref={boxRef} className={styles.plane}>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${hot ? "" : styles.grab}`}
        style={{ cursor: hot ? "nwse-resize" : undefined }}
        tabIndex={0}
        role="application"
        aria-label={label}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={() => !drag.current && setHot(false)}
        onKeyDown={key}
      />
    </div>
  );
}
