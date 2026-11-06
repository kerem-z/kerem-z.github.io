"use client";

import { useRef } from "react";
import styles from "./chinese-room.module.css";
import { useWidth } from "./ui";

export const YEAR = 365.25 * 86400;

/** Seconds of calendar time for N operations at s seconds each, working h hours a day. */
export function calendarSeconds(N: number, s: number, h: number) {
  return (N * s * 24) / h;
}

export function humanDuration(sec: number) {
  const r = (v: number) => (v >= 100 ? Math.round(v).toLocaleString("en-GB") : v >= 10 ? v.toFixed(0) : v.toFixed(1));
  if (sec < 60) return `${r(sec)} seconds`;
  if (sec < 3600) return `${r(sec / 60)} minutes`;
  if (sec < 86400) return `${r(sec / 3600)} hours`;
  if (sec < YEAR) return `${r(sec / 86400)} days`;
  const y = sec / YEAR;
  if (y < 1e6) return `${r(y)} years`;
  if (y < 1e9) return `${r(y / 1e6)} million years`;
  return `${r(y / 1e9)} billion years`;
}

// row 0 sits above the axis, rows 1 and 2 below it, so neighbours never collide.
const MARKS: { sec: number; label: string; row: 0 | 1 | 2; wide?: boolean }[] = [
  { sec: 1, label: "a second", row: 0, wide: true },
  { sec: 3600, label: "an hour", row: 1, wide: true },
  { sec: YEAR, label: "a year", row: 0 },
  { sec: 80 * YEAR, label: "a long life", row: 1 },
  { sec: 5000 * YEAR, label: "since writing", row: 2 },
  { sec: 13.8e9 * YEAR, label: "age of the universe", row: 0 },
];

const LO = 0; // log10 seconds
const HI = 19;

export function SpeedFigure({ seconds }: { seconds: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const width = Math.max(260, useWidth(ref));
  const pad = 14;
  const x = (sec: number) => pad + ((Math.log10(Math.max(sec, 1)) - LO) / (HI - LO)) * (width - 2 * pad);
  const off = seconds > Math.pow(10, HI);
  const px = x(Math.min(seconds, Math.pow(10, HI)));
  const H = 112;
  const axis = 34;

  return (
    <figure className={styles.figure}>
      <div ref={ref} className={styles.speed}>
        <svg width={width} height={H} role="img" aria-label={`One run takes ${humanDuration(seconds)}`}>
          <line className={styles.axis} x1={pad} y1={axis} x2={width - pad} y2={axis} />
          {Array.from({ length: HI - LO + 1 }, (_, k) => (
            <line key={k} className={styles.minor} x1={x(10 ** k)} y1={axis - 3} x2={x(10 ** k)} y2={axis + 3} />
          ))}
          {MARKS.filter((m) => width >= 460 || !m.wide).map((m) => {
            const mx = x(m.sec);
            const anchor = mx < 60 ? "start" : mx > width - 60 ? "end" : "middle";
            return (
              <g key={m.label}>
                <line className={styles.major} x1={mx} y1={axis - 7} x2={mx} y2={axis + 7} />
                <text className={styles.tickText} x={mx} y={m.row === 0 ? axis - 13 : axis + 8 + 14 * m.row} textAnchor={anchor}>
                  {m.label}
                </text>
              </g>
            );
          })}
          <rect className={styles.span} x={pad} y={axis - 2} width={Math.max(0, px - pad)} height={4} />
          <circle className={styles.marker} cx={px} cy={axis} r={5.5} />
          <text className={styles.markerText} x={px} y={H - 6} textAnchor={px < 80 ? "start" : px > width - 80 ? "end" : "middle"}>
            {off ? "→ " : ""}
            {humanDuration(seconds)}
          </text>
        </svg>
      </div>
    </figure>
  );
}
