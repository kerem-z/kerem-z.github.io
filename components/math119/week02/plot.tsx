"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import katex from "katex";
import styles from "./Week02.module.css";

export function Tex({
  children,
  display = false,
}: {
  children: string;
  display?: boolean;
}) {
  const html = katex.renderToString(children, {
    displayMode: display,
    throwOnError: false,
    strict: "ignore",
  });
  if (display) {
    return (
      <div
        className={styles.display}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <span
      className={styles.inline}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export type Point = { x: number; y: number };

export type Series = {
  id: string;
  label: ReactNode;
  points: Array<Point | null>;
  color?: string;
  width?: number;
  dash?: string;
};

export type Marker = {
  x: number;
  y: number;
  open?: boolean;
  label?: string;
  color?: string;
};

type Rule = { x?: number; y?: number };

type Band = { x: number; y0: number; y1: number };

export function linspace(a: number, b: number, n: number): number[] {
  if (n <= 1) return [a];
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}

export function mapx(
  xs: number[],
  f: (x: number) => number,
): Array<Point | null> {
  return xs.map((x) => {
    const y = f(x);
    return Number.isFinite(y) ? { x, y } : null;
  });
}

export function fmt(n: number, digits = 4): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a !== 0 && (a < 1e-3 || a >= 1e4)) return n.toExponential(2);
  return String(Number(n.toFixed(digits)));
}

export function useRaf(
  running: boolean,
  duration: number,
  onProgress: (u: number) => void,
) {
  const cb = useRef(onProgress);
  cb.current = onProgress;
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      cb.current(((now - t0) % duration) / duration);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, duration]);
}

function ticks(min: number, max: number, count = 5): number[] {
  if (!(max > min)) return [min];
  const rough = (max - min) / count;
  const pow = 10 ** Math.floor(Math.log10(rough));
  const err = rough / pow;
  const step = (err < 1.5 ? 1 : err < 3.5 ? 2 : err < 7.5 ? 5 : 10) * pow;
  const start = Math.ceil((min - step * 1e-8) / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 1e-6 && out.length < 8; v += step) {
    const rounded = Number(v.toPrecision(12));
    if (rounded >= min - step * 0.01 && rounded <= max + step * 0.01) {
      out.push(rounded);
    }
  }
  return out;
}

function tickLabel(v: number): string {
  if (Math.abs(v) < 1e-9) return "0";
  const a = Math.abs(v);
  if (a >= 1000 || a < 0.01) return v.toExponential(0);
  return String(Math.round(v * 1000) / 1000);
}

function toPath(
  pts: Array<Point | null>,
  X: (x: number) => number,
  Y: (y: number) => number,
): string {
  let d = "";
  let pen = false;
  for (const p of pts) {
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) {
      pen = false;
      continue;
    }
    d += `${pen ? "L" : "M"}${X(p.x).toFixed(2)} ${Y(p.y).toFixed(2)}`;
    pen = true;
  }
  return d;
}

function nearestY(pts: Array<Point | null>, x: number, span: number): number | null {
  let best: Point | null = null;
  let bestD = Infinity;
  for (const p of pts) {
    if (!p) continue;
    const d = Math.abs(p.x - x);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  if (!best || bestD > span * 0.05) return null;
  return best.y;
}

export function Plot({
  series,
  band,
  markers,
  rules,
  xDomain,
  yDomain,
  xLabel = "x",
  yLabel = "y",
  height = 270,
  ariaLabel,
}: {
  series: Series[];
  band?: Band[];
  markers?: Marker[];
  rules?: Rule[];
  xDomain: [number, number];
  yDomain: [number, number];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  ariaLabel: string;
}) {
  const clipId = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 680;
  const H = height;
  const pad = { l: 48, r: 14, t: 14, b: 36 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const X = (x: number) =>
    pad.l + ((x - xDomain[0]) / (xDomain[1] - xDomain[0] || 1)) * iw;
  const Y = (y: number) =>
    pad.t + ((yDomain[1] - y) / (yDomain[1] - yDomain[0] || 1)) * ih;
  const xt = ticks(xDomain[0], xDomain[1]);
  const yt = ticks(yDomain[0], yDomain[1]);

  function move(clientX: number, width: number) {
    const px = (clientX / width) * W;
    const x =
      xDomain[0] + ((px - pad.l) / iw) * (xDomain[1] - xDomain[0]);
    if (x < xDomain[0] || x > xDomain[1]) setHover(null);
    else setHover(x);
  }

  const span = xDomain[1] - xDomain[0];

  return (
    <div className={styles.plot}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={ariaLabel}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          move(e.clientX - rect.left, rect.width);
        }}
        onMouseLeave={() => setHover(null)}
      >
        <title>
          {yLabel} against {xLabel}
        </title>
        <defs>
          <clipPath id={clipId}>
            <rect x={pad.l} y={pad.t} width={iw} height={ih} />
          </clipPath>
        </defs>
        {xt.map((v) => (
          <line
            key={`vx${v}`}
            x1={X(v)}
            x2={X(v)}
            y1={pad.t}
            y2={pad.t + ih}
            stroke="var(--border)"
          />
        ))}
        {yt.map((v) => (
          <line
            key={`hy${v}`}
            y1={Y(v)}
            y2={Y(v)}
            x1={pad.l}
            x2={pad.l + iw}
            stroke="var(--border)"
          />
        ))}
        <line
          x1={pad.l}
          x2={pad.l + iw}
          y1={pad.t + ih}
          y2={pad.t + ih}
          stroke="var(--border-strong)"
        />
        <line
          x1={pad.l}
          x2={pad.l}
          y1={pad.t}
          y2={pad.t + ih}
          stroke="var(--border-strong)"
        />
        <g clipPath={`url(#${clipId})`}>
          {band && band.length > 1 ? (
            <path
              d={bandPath(band, X, Y)}
              fill="var(--fill)"
              stroke="none"
            />
          ) : null}
          {rules?.map((r, i) =>
            r.y !== undefined ? (
              <line
                key={`ry${i}`}
                x1={X(xDomain[0])}
                x2={X(xDomain[1])}
                y1={Y(r.y)}
                y2={Y(r.y)}
                stroke="var(--c3)"
                strokeDasharray="4 4"
              />
            ) : r.x !== undefined ? (
              <line
                key={`rx${i}`}
                y1={Y(yDomain[0])}
                y2={Y(yDomain[1])}
                x1={X(r.x)}
                x2={X(r.x)}
                stroke="var(--c3)"
                strokeDasharray="4 4"
              />
            ) : null,
          )}
          {series.map((s) => (
            <path
              key={s.id}
              d={toPath(s.points, X, Y)}
              fill="none"
              stroke={s.color ?? "var(--c1)"}
              strokeWidth={s.width ?? 1.7}
              strokeDasharray={s.dash}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {hover !== null ? (
            <line
              x1={X(hover)}
              x2={X(hover)}
              y1={Y(yDomain[0])}
              y2={Y(yDomain[1])}
              stroke="var(--c3)"
            />
          ) : null}
          {markers?.map((m, i) => (
            <g key={`m${i}`}>
              <circle
                cx={X(m.x)}
                cy={Y(m.y)}
                r={4.5}
                fill={m.open ? "var(--bg)" : (m.color ?? "var(--c1)")}
                stroke={m.color ?? "var(--c1)"}
                strokeWidth={1.7}
              />
              {m.label ? (
                <text
                  x={X(m.x) + 8}
                  y={Y(m.y) - 8}
                  fill="var(--ink-muted)"
                  fontFamily="var(--font-mono)"
                  fontSize="11"
                >
                  {m.label}
                </text>
              ) : null}
            </g>
          ))}
        </g>
        {xt.map((v) => (
          <text
            key={`tx${v}`}
            x={X(v)}
            y={H - 8}
            textAnchor="middle"
            fill="var(--ink-faint)"
            fontFamily="var(--font-mono)"
            fontSize="11"
          >
            {tickLabel(v)}
          </text>
        ))}
        {yt.map((v) => (
          <text
            key={`ty${v}`}
            x={pad.l - 8}
            y={Y(v) + 4}
            textAnchor="end"
            fill="var(--ink-faint)"
            fontFamily="var(--font-mono)"
            fontSize="11"
          >
            {tickLabel(v)}
          </text>
        ))}
      </svg>
      <ul className={styles.legend}>
        {series.map((s) => (
          <li key={s.id}>
            <svg width="18" height="8" aria-hidden>
              <line
                x1="0"
                y1="4"
                x2="18"
                y2="4"
                stroke={s.color ?? "var(--c1)"}
                strokeWidth="1.7"
                strokeDasharray={s.dash}
              />
            </svg>
            {s.label}
          </li>
        ))}
        {band ? (
          <li>
            <svg width="18" height="8" aria-hidden>
              <rect width="18" height="8" fill="var(--fill)" />
            </svg>
            shaded region
          </li>
        ) : null}
      </ul>
      {hover !== null ? (
        <p className={styles.probe}>
          x = {fmt(hover, 3)}
          {series.map((s) => {
            const y = nearestY(s.points, hover, span);
            return y === null ? null : (
              <span key={s.id}>
                {"  "}
                {s.id} = {fmt(y, 3)}
              </span>
            );
          })}
        </p>
      ) : null}
    </div>
  );
}

function bandPath(
  band: Band[],
  X: (x: number) => number,
  Y: (y: number) => number,
): string {
  let d = `M${X(band[0].x).toFixed(2)} ${Y(band[0].y1).toFixed(2)}`;
  for (const p of band) d += `L${X(p.x).toFixed(2)} ${Y(p.y1).toFixed(2)}`;
  for (let i = band.length - 1; i >= 0; i--) {
    d += `L${X(band[i].x).toFixed(2)} ${Y(band[i].y0).toFixed(2)}`;
  }
  return `${d}Z`;
}

export function Play({
  on,
  toggle,
}: {
  on: boolean;
  toggle: () => void;
}) {
  return (
    <button type="button" className={styles.play} aria-pressed={on} onClick={toggle}>
      {on ? "Pause" : "Play"}
    </button>
  );
}
