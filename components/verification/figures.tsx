"use client";

import { useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { rng } from "./data";
import {
  boxAround,
  crownHidden,
  crownMargin,
  exactBounds,
  exactMargin,
  ibp,
  ibpMargin,
  linearLower,
  margin,
  marginSpec,
  predict,
  within,
  type Interval,
  type Pt,
} from "./net";
import styles from "./verification.module.css";
import { NET } from "./weights";
import {
  allRegions,
  className,
  classColor,
  drawCross,
  FieldCanvas,
  fmt,
  Scrub,
  usePalette,
  useWidth,
  withAlpha,
  type Focus,
  type View,
} from "./widgets";

export type BoxProps = {
  x0: Pt;
  eps: number;
  setX0: (p: Pt) => void;
  setEps: (e: number) => void;
  focus: Focus;
};

// The same 200 points in [-1, 1]², scaled to whatever box is current, so the
// sample does not flicker as the box moves.
const SAMPLES: Pt[] = (() => {
  const r = rng(2024);
  return Array.from({ length: 200 }, () => [2 * r() - 1, 2 * r() - 1] as Pt);
})();

const pt = (p: Pt) => `(${fmt(p[0])}, ${fmt(p[1])})`;

// ---------------------------------------------------------------------------
// Figure 1: a point, a box, and the question.
// ---------------------------------------------------------------------------

export function BoxFigure({ x0, eps, setX0, setEps, focus }: BoxProps) {
  const rootRef = useRef<HTMLElement>(null);
  const pal = usePalette(rootRef);
  const k = predict(NET, x0);

  const { samples, sampleMin, misses, exact } = useMemo(() => {
    const samples = SAMPLES.map(([u, v]) => {
      const p: Pt = [x0[0] + eps * u, x0[1] + eps * v];
      return { p, m: margin(NET, p, k) };
    });
    const sampleMin = Math.min(...samples.map((s) => s.m));
    const misses = samples.filter((s) => s.m <= 0).length;
    const exact = exactMargin(NET, within(allRegions(), boxAround(x0, eps)), k);
    return { samples, sampleMin, misses, exact };
  }, [x0, eps, k]);
  const robust = exact.value > 0;

  const overlay = (ctx: CanvasRenderingContext2D, view: View) => {
    if (!pal) return;
    const hiS = focus?.kind === "samples";
    for (const s of samples) {
      const [px, py] = view.P(s.p[0], s.p[1]);
      ctx.fillStyle = s.m <= 0 ? pal.neg : withAlpha(pal.ink, hiS ? 0.75 : 0.35);
      ctx.beginPath();
      ctx.arc(px, py, s.m <= 0 ? 2.2 : hiS ? 1.8 : 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
    const hiW = focus?.kind === "worst";
    drawCross(ctx, view, exact.at, robust ? pal.ink : pal.neg, hiW ? 7 : 4.5);
    if (hiW) {
      const [px, py] = view.P(exact.at[0], exact.at[1]);
      ctx.strokeStyle = robust ? pal.ink : pal.neg;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  return (
    <figure ref={rootRef} className={styles.figure}>
      <div className={styles.split}>
        <div>
          <FieldCanvas
            x0={x0}
            eps={eps}
            setX0={setX0}
            setEps={setEps}
            pal={pal}
            overlay={overlay}
            overlayKey={`${samples.length}|${exact.at}|${focus?.kind}`}
            label="Input plane. Drag to move the point; drag a corner of the box to resize it."
          />
          <p className={styles.planeLabel}>
            drag the point · drag a corner to resize · arrow keys and +/− work too
          </p>
        </div>
        <div className={styles.side}>
          <p className={styles.panelHead}>The claim</p>
          <p>
            the network puts <span className={styles.num}>x₀ = {pt(x0)}</span> in the{" "}
            <span style={{ color: pal ? classColor(pal, k) : undefined }}>{className(k)} moon</span>. For every{" "}
            <span className={styles.num}>x</span> with{" "}
            <span className={styles.num}>
              ‖x − x₀‖<sub>∞</sub> ≤{" "}
              <Scrub value={eps} min={0.01} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={setEps} label="Box radius ε" />
            </span>
            , it still does: the margin <span className={styles.num}>z_{k === 0 ? "up" : "low"} − z_{k === 0 ? "low" : "up"}</span>{" "}
            stays above zero.
          </p>
          <p>
            <span className={styles.dim}>testing · </span>
            {SAMPLES.length} random points in the box. Lowest margin{" "}
            <span className={styles.num}>{fmt(sampleMin)}</span>;{" "}
            {misses === 0 ? (
              "none misclassified."
            ) : (
              <span className={styles.bad}>
                {misses} misclassified.
              </span>
            )}
          </p>
          <p>
            <span className={styles.dim}>exact · </span>
            lowest margin over the whole box <span className={styles.num}>{fmt(exact.value)}</span>, at ×{" "}
            <span className={styles.num}>{pt(exact.at)}</span>.
          </p>
          <p className={styles.verdict}>
            {robust ? (
              <span className={styles.good}>The claim is true for this box.</span>
            ) : misses > 0 ? (
              <span className={styles.bad}>The claim is false, and the samples found out.</span>
            ) : (
              <span className={styles.bad}>The claim is false, and none of the samples noticed.</span>
            )}
          </p>
        </div>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Figure 2: the box pushed through the network, one interval per neuron.
// ---------------------------------------------------------------------------

type Mode = "ibp" | "crown";

/** Outer bounds on every layer, plus the margin as a last "layer" of one. */
function outerBounds(x0: Pt, eps: number, k: number, mode: Mode): Interval[] {
  const box = boxAround(x0, eps);
  const L = NET.W.length;
  if (mode === "ibp") {
    const I = ibp(NET, box);
    const o = I[L - 1];
    const ml = k === 0 ? o.l[0] - o.u[1] : o.l[1] - o.u[0];
    const mu = k === 0 ? o.u[0] - o.l[1] : o.u[1] - o.l[0];
    return [...I, { l: Float64Array.of(ml), u: Float64Array.of(mu) }];
  }
  const { bounds } = crownHidden(NET, box);
  const out = { l: new Float64Array(2), u: new Float64Array(2) };
  for (let i = 0; i < 2; i++) {
    const e = new Float64Array(2);
    e[i] = 1;
    out.l[i] = linearLower(NET, L - 1, e, bounds, box).value;
    e[i] = -1;
    out.u[i] = -linearLower(NET, L - 1, e, bounds, box).value;
  }
  const c = marginSpec(k);
  const ml = linearLower(NET, L - 1, c, bounds, box).value;
  const mu = -linearLower(NET, L - 1, c.map((v) => -v), bounds, box).value;
  return [...bounds, out, { l: Float64Array.of(ml), u: Float64Array.of(mu) }];
}

function exactAll(x0: Pt, eps: number, k: number): Interval[] {
  const inBox = within(allRegions(), boxAround(x0, eps));
  const E = exactBounds(NET, inBox);
  const lo = exactMargin(NET, inBox, k).value;
  const hi = -exactMargin(NET, inBox, 1 - k).value;
  return [...E, { l: Float64Array.of(lo), u: Float64Array.of(hi) }];
}

const COLUMNS = [
  { title: "first layer, z₁", layers: [0] },
  { title: "second layer, z₂", layers: [1] },
  { title: "logits and margin", layers: [2, 3] },
];

const rowName = (layer: number, i: number, k: number) =>
  layer < 2 ? `z${layer === 0 ? "₁" : "₂"}[${i + 1}]` : layer === 2 ? (i === 0 ? "z_up" : "z_low") : k === 0 ? "z_up − z_low" : "z_low − z_up";

export function IntervalFigure({ x0, eps, setEps, focus }: BoxProps) {
  const rootRef = useRef<HTMLElement>(null);
  const pal = usePalette(rootRef);
  const [mode, setMode] = useState<Mode>("ibp");
  const [hover, setHover] = useState<{ layer: number; i: number } | null>(null);
  const k = predict(NET, x0);

  const outer = useMemo(() => outerBounds(x0, eps, k, mode), [x0, eps, k, mode]);
  const exact = useMemo(() => exactAll(x0, eps, k), [x0, eps, k]);

  const ratio = (layers: number[]) => {
    let a = 0;
    let b = 0;
    for (const L of layers.slice(0, 1))
      for (let i = 0; i < outer[L].l.length; i++) {
        a += outer[L].u[i] - outer[L].l[i];
        b += exact[L].u[i] - exact[L].l[i];
      }
    return b > 0 ? a / b : 1;
  };

  const unstable = (L: number, i: number) => L < 2 && outer[L].l[i] < 0 && outer[L].u[i] > 0;
  const reallyUnstable = (L: number, i: number) => L < 2 && exact[L].l[i] < 0 && exact[L].u[i] > 0;
  const count = (L: number) => {
    let a = 0;
    let b = 0;
    for (let i = 0; i < outer[L].l.length; i++) {
      if (unstable(L, i)) a++;
      if (reallyUnstable(L, i)) b++;
    }
    return [a, b];
  };

  let readout: React.ReactNode = (
    <span className={styles.dim}>Point at a row for its numbers.</span>
  );
  if (hover) {
    const { layer: L, i } = hover;
    const name = rowName(L, i, k);
    const what =
      L >= 2
        ? ""
        : unstable(L, i) && !reallyUnstable(L, i)
          ? ` ${mode.toUpperCase()} cannot rule out a sign change, but there is none in this box.`
          : reallyUnstable(L, i)
            ? " This neuron really does switch inside the box."
            : " Its sign is settled on the whole box.";
    readout = (
      <>
        {name}: {mode === "ibp" ? "IBP" : "CROWN"} says [{fmt(outer[L].l[i])}, {fmt(outer[L].u[i])}]; the box actually
        reaches [{fmt(exact[L].l[i])}, {fmt(exact[L].u[i])}].{what}
      </>
    );
  }

  return (
    <figure ref={rootRef} className={styles.figure}>
      <div className={styles.controls}>
        <span>outer bound</span>
        {(["ibp", "crown"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`${styles.btn} ${mode === m ? styles.btnOn : ""}`}
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
          >
            {m === "ibp" ? "intervals (IBP)" : "linear (CROWN)"}
          </button>
        ))}
        <span className={styles.dim}>
          ε = <Scrub value={eps} min={0.01} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={setEps} label="Box radius ε" />
        </span>
      </div>
      <div className={styles.columns}>
        {COLUMNS.map((col, ci) => {
          const [a, b] = ci < 2 ? count(col.layers[0]) : [0, 0];
          return (
            <IntervalColumn
              key={ci}
              title={col.title}
              layers={col.layers}
              outer={outer}
              exact={exact}
              k={k}
              pal={pal}
              hover={hover}
              setHover={setHover}
              highlight={(focus?.kind === "layer" && focus.k === ci) || focus?.kind === "unstable"}
              onlyUnstable={focus?.kind === "unstable"}
              unstable={unstable}
              reallyUnstable={reallyUnstable}
              foot={
                ci < 2 ? (
                  <>
                    total width ×{ratio(col.layers).toFixed(2)} the true one · unstable {a}
                    {a !== b ? <span className={styles.dim}> (really {b})</span> : null}
                  </>
                ) : (
                  <>logits width ×{ratio(col.layers).toFixed(2)} the true one</>
                )
              }
            />
          );
        })}
      </div>
      <p className={styles.readout}>{readout}</p>
    </figure>
  );
}

function IntervalColumn(props: {
  title: string;
  layers: number[];
  outer: Interval[];
  exact: Interval[];
  k: number;
  pal: ReturnType<typeof usePalette>;
  hover: { layer: number; i: number } | null;
  setHover: (h: { layer: number; i: number } | null) => void;
  highlight: boolean;
  onlyUnstable: boolean;
  unstable: (L: number, i: number) => boolean;
  reallyUnstable: (L: number, i: number) => boolean;
  foot: React.ReactNode;
}) {
  const { layers, outer, exact, k, pal, hover, setHover } = props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const w = Math.max(200, useWidth(wrapRef));
  const rows: { L: number; i: number; gap: boolean }[] = [];
  layers.forEach((L, li) => {
    for (let i = 0; i < outer[L].l.length; i++) rows.push({ L, i, gap: li > 0 && i === 0 });
  });
  // one scale per column, always showing zero
  let lo = 0;
  let hi = 0;
  for (const { L, i } of rows) {
    lo = Math.min(lo, outer[L].l[i], exact[L].l[i]);
    hi = Math.max(hi, outer[L].u[i], exact[L].u[i]);
  }
  const pad = (hi - lo) * 0.04 || 1;
  lo -= pad;
  hi += pad;
  const LABEL = 78;
  const RH = 19;
  const plotW = w - LABEL - 4;
  const X = (v: number) => LABEL + ((v - lo) / (hi - lo)) * plotW;
  let y = 4;
  const ys = rows.map((r) => {
    if (r.gap) y += 10;
    const yy = y;
    y += RH;
    return yy;
  });
  const H = y + 4;
  if (!pal) return <div ref={wrapRef} />;
  return (
    <div ref={wrapRef} style={{ minWidth: 0 }}>
      <p className={styles.panelHead} style={{ fontFamily: "var(--font-mono)" }}>
        {props.title}
      </p>
      <svg className={styles.svg} width={w} height={H} role="img" aria-label={`Bounds for the ${props.title}`}>
        <line x1={X(0)} x2={X(0)} y1={0} y2={H} stroke={pal.border} strokeDasharray="2 3" />
        {rows.map(({ L, i }, r) => {
          const yy = ys[r];
          const isHover = hover?.layer === L && hover.i === i;
          const dimmed = props.onlyUnstable && !props.unstable(L, i);
          const isMargin = L === 3;
          const ok = isMargin && outer[L].l[0] > 0;
          const outerCol = isMargin ? (ok ? pal.accent : pal.neg) : pal.muted;
          return (
            <g
              key={r}
              className={styles.row}
              opacity={dimmed ? 0.25 : 1}
              onPointerEnter={() => setHover({ layer: L, i })}
              onPointerLeave={() => setHover(null)}
            >
              <rect x={0} y={yy} width={w} height={RH} fill={isHover ? withAlpha(pal.ink, 0.05) : "transparent"} />
              <text x={0} y={yy + 13} style={{ fill: isHover ? pal.ink : undefined }}>
                {rowName(L, i, k)}
              </text>
              {props.unstable(L, i) ? (
                <circle
                  cx={LABEL - 8}
                  cy={yy + RH / 2}
                  r={2.6}
                  fill={props.reallyUnstable(L, i) ? pal.neg : "none"}
                  stroke={pal.neg}
                  strokeWidth={1}
                />
              ) : null}
              <rect
                x={X(outer[L].l[i])}
                y={yy + 4}
                width={Math.max(1, X(outer[L].u[i]) - X(outer[L].l[i]))}
                height={RH - 8}
                fill={withAlpha(outerCol, props.highlight ? 0.22 : 0.14)}
                stroke={withAlpha(outerCol, 0.6)}
                strokeWidth={0.75}
              />
              <rect
                x={X(exact[L].l[i])}
                y={yy + RH / 2 - 1.75}
                width={Math.max(1.5, X(exact[L].u[i]) - X(exact[L].l[i]))}
                height={3.5}
                fill={pal.ink}
              />
            </g>
          );
        })}
      </svg>
      <p className={styles.planeLabel}>{props.foot}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Figure 3: one ReLU and the lines that may stand in for it.
// ---------------------------------------------------------------------------

const RX = [-3, 3];
const RY = [-3.1, 3.2];

export function ReluFigure({ x0, eps }: { x0: Pt; eps: number }) {
  const rootRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pal = usePalette(rootRef);
  const w = Math.max(240, Math.min(useWidth(wrapRef), 460));
  const h = Math.round(w * 0.82);
  const [l, setL] = useState(-1.6);
  const [u, setU] = useState(2.2);
  const [alpha, setAlpha] = useState(1);
  const drag = useRef<"l" | "u" | "a" | null>(null);

  const RAIL = h - 18;
  const X = (x: number) => 14 + ((x - RX[0]) / (RX[1] - RX[0])) * (w - 28);
  const Y = (y: number) => 10 + ((RY[1] - y) / (RY[1] - RY[0])) * (RAIL - 30);
  const fromX = (px: number) => RX[0] + ((px - 14) / (w - 28)) * (RX[1] - RX[0]);
  const fromY = (py: number) => RY[1] - ((py - 10) / (RAIL - 30)) * (RY[1] - RY[0]);

  const best = u + l > 0 ? 1 : u + l < 0 ? 0 : alpha;
  const areaTri = (-l * u) / 2;
  const areaMine = ((u - l) * (u - alpha * (u + l))) / 2;

  const box = boxAround(x0, eps);
  const k = predict(NET, x0);
  const global = useMemo(
    () => ({
      zero: crownMargin(NET, box, k, "zero"),
      one: crownMargin(NET, box, k, "one"),
      adaptive: crownMargin(NET, box, k, "adaptive"),
      ibp: ibpMargin(NET, box, k),
      exact: exactMargin(NET, within(allRegions(), box), k).value,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [x0, eps, k],
  );

  const down = (which: "l" | "u" | "a") => (e: ReactPointerEvent<SVGGElement>) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    drag.current = which;
  };
  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!drag.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    if (drag.current === "l") setL(Math.round(Math.min(-0.1, Math.max(RX[0] + 0.05, fromX(px))) * 20) / 20);
    if (drag.current === "u") setU(Math.round(Math.max(0.1, Math.min(RX[1] - 0.05, fromX(px))) * 20) / 20);
    if (drag.current === "a") setAlpha(Math.round(Math.min(1, Math.max(0, fromY(py) / l)) * 50) / 50);
  };
  const up = () => {
    drag.current = null;
  };
  const key = (which: "l" | "u" | "a") => (e: KeyboardEvent<SVGGElement>) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    if (which === "l") setL((v) => Math.min(-0.1, Math.max(RX[0] + 0.05, +(v + d * 0.05).toFixed(2))));
    if (which === "u") setU((v) => Math.max(0.1, Math.min(RX[1] - 0.05, +(v + d * 0.05).toFixed(2))));
    if (which === "a") setAlpha((v) => Math.min(1, Math.max(0, +(v - d * 0.05).toFixed(2))));
  };

  if (!pal)
    return (
      <figure ref={rootRef} className={styles.figure}>
        <div ref={wrapRef} style={{ height: h }} />
      </figure>
    );

  const tri = [
    [l, 0],
    [0, 0],
    [u, u],
  ];
  const mine = [
    [l, alpha * l],
    [u, alpha * u],
    [u, u],
    [l, 0],
  ];
  const poly = (ps: number[][]) => ps.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ");

  return (
    <figure ref={rootRef} className={styles.figure}>
      <div className={styles.split}>
        <div ref={wrapRef} style={{ minWidth: 0 }}>
          <svg
            className={styles.reluSvg}
            width={w}
            height={h}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            role="img"
            aria-label="The ReLU function between l and u, its triangle relaxation, and a chosen linear relaxation"
          >
            {/* axes */}
            <line x1={X(RX[0])} x2={X(RX[1])} y1={Y(0)} y2={Y(0)} stroke={withAlpha(pal.faint, 0.5)} />
            <line x1={X(0)} x2={X(0)} y1={Y(RY[0])} y2={Y(RY[1])} stroke={withAlpha(pal.faint, 0.5)} />
            {/* the triangle: the convex hull of the graph over [l, u] */}
            <polygon points={poly(tri)} fill={withAlpha(pal.ink, 0.08)} stroke="none" />
            {/* the region the chosen pair of lines allows */}
            <polygon points={poly(mine)} fill={withAlpha(pal.accent, 0.14)} stroke={pal.accent} strokeWidth={1} strokeLinejoin="round" />
            {/* the graph itself */}
            <polyline points={poly([[RX[0], 0], [0, 0], [RX[1], RX[1]]])} fill="none" stroke={pal.ink} strokeWidth={2} />
            {/* l and u, dropped to the rail */}
            {[l, u].map((v, i) => (
              <line key={i} x1={X(v)} x2={X(v)} y1={Y(Math.max(0, v))} y2={RAIL} stroke={withAlpha(pal.faint, 0.6)} strokeDasharray="2 3" />
            ))}
            <line x1={X(RX[0])} x2={X(RX[1])} y1={RAIL} y2={RAIL} stroke={pal.border} />
            <text x={X(u) + 6} y={Y(u) + 4}>
              chord
            </text>
            <text x={X(l) - 4} y={Y(alpha * l) + 14} textAnchor="start">
              y = {alpha.toFixed(2)}·x
            </text>
            {/* handles */}
            <g
              className={styles.handle}
              tabIndex={0}
              role="slider"
              aria-label="Lower bound l"
              aria-valuenow={l}
              onPointerDown={down("l")}
              onKeyDown={key("l")}
            >
              <circle cx={X(l)} cy={RAIL} r={11} fill="transparent" />
              <circle cx={X(l)} cy={RAIL} r={5} fill={pal.bg} stroke={pal.ink} strokeWidth={1.5} />
              <text x={X(l)} y={RAIL + 16} textAnchor="middle">
                l = {l.toFixed(2)}
              </text>
            </g>
            <g
              className={styles.handle}
              tabIndex={0}
              role="slider"
              aria-label="Upper bound u"
              aria-valuenow={u}
              onPointerDown={down("u")}
              onKeyDown={key("u")}
            >
              <circle cx={X(u)} cy={RAIL} r={11} fill="transparent" />
              <circle cx={X(u)} cy={RAIL} r={5} fill={pal.bg} stroke={pal.ink} strokeWidth={1.5} />
              <text x={X(u)} y={RAIL + 16} textAnchor="middle">
                u = {u.toFixed(2)}
              </text>
            </g>
            <g
              className={styles.handleV}
              tabIndex={0}
              role="slider"
              aria-label="Slope of the lower line"
              aria-valuenow={alpha}
              onPointerDown={down("a")}
              onKeyDown={key("a")}
            >
              <circle cx={X(l)} cy={Y(alpha * l)} r={11} fill="transparent" />
              <circle cx={X(l)} cy={Y(alpha * l)} r={5} fill={pal.accent} stroke={pal.bg} strokeWidth={1.5} />
            </g>
          </svg>
          <p className={styles.planeLabel}>drag l and u along the rail · drag the teal handle to tilt the lower line</p>
        </div>
        <div className={styles.side}>
          <p className={styles.panelHead}>One neuron, z ∈ [l, u]</p>
          <p>
            <span className={styles.dim}>triangle (convex hull) · </span>area{" "}
            <span className={styles.num}>{areaTri.toFixed(2)}</span>
          </p>
          <p>
            <span className={styles.dim}>chord + y ≥ {alpha.toFixed(2)}·z · </span>area{" "}
            <span className={styles.num}>{areaMine.toFixed(2)}</span>
          </p>
          <p>
            since u {u + l > 0 ? ">" : u + l < 0 ? "<" : "="} −l, the smaller area is at slope{" "}
            {u + l === 0 ? "0 or 1 (a tie)" : best}.{" "}
            <button type="button" className={styles.btn} onClick={() => setAlpha(best)}>
              use it
            </button>
          </p>
          <p className={styles.verdict} style={{ color: "var(--ink-muted)" }}>
            On the whole network, box of Figure 1 (ε = {eps.toFixed(2)}), lower bounds on the margin:
          </p>
          <table className={styles.table}>
            <tbody>
              <tr>
                <td>every slope 0</td>
                <td className={global.zero > 0 ? styles.good : styles.bad}>{fmt(global.zero)}</td>
              </tr>
              <tr>
                <td>every slope 1</td>
                <td className={global.one > 0 ? styles.good : styles.bad}>{fmt(global.one)}</td>
              </tr>
              <tr>
                <td>by area, per neuron</td>
                <td className={global.adaptive > 0 ? styles.good : styles.bad}>{fmt(global.adaptive)}</td>
              </tr>
              <tr className={styles.dim}>
                <td>intervals (IBP)</td>
                <td>{fmt(global.ibp)}</td>
              </tr>
              <tr className={styles.dim}>
                <td>true minimum</td>
                <td>{fmt(global.exact)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </figure>
  );
}
