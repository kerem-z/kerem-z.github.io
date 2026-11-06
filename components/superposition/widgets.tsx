"use client";

import katex from "katex";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import styles from "./superposition.module.css";

/** Inline or display math, rendered once with KaTeX. */
export function TeX({ children, block = false }: { children: string; block?: boolean }) {
  const html = katex.renderToString(children, { displayMode: block, throwOnError: false });
  return block ? (
    <div className={styles.texBlock} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/**
 * A number in the prose that you drag sideways to change (after Bret Victor's
 * Tangle). Arrow keys work too. `log` scrubs the exponent rather than the value.
 */
export function Scrub({
  value,
  min,
  max,
  step,
  log = false,
  format,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  log?: boolean;
  format: (v: number) => string;
  onChange: (v: number) => void;
  label: string;
}) {
  const start = useRef<{ x: number; v: number } | null>(null);
  const [active, setActive] = useState(false);
  const to = (v: number) => (log ? Math.log10(v) : v);
  const from = (u: number) => (log ? Math.pow(10, u) : u);
  const lo = to(min);
  const hi = to(max);

  const set = useCallback(
    (u: number) => {
      const clamped = Math.min(hi, Math.max(lo, u));
      const snapped = Math.round(clamped / step) * step;
      const v = from(snapped);
      if (v !== value) onChange(Number(v.toPrecision(6)));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hi, lo, step, value, onChange, log],
  );

  const down = (e: ReactPointerEvent<HTMLSpanElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, v: to(value) };
    setActive(true);
  };
  const move = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (!start.current) return;
    // 160px of travel covers the whole range
    set(start.current.v + ((e.clientX - start.current.x) / 160) * (hi - lo));
  };
  const up = () => {
    start.current = null;
    setActive(false);
  };
  const key = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") set(to(value) + step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") set(to(value) - step);
    else return;
    e.preventDefault();
  };

  return (
    <span
      className={`${styles.scrub} ${active ? styles.scrubActive : ""}`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={format(value)}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
    >
      {format(value)}
    </span>
  );
}

export type Focus =
  | null
  | { kind: "feature"; i: number }
  | { kind: "pair"; i: number; j: number }
  | { kind: "interference" }
  | { kind: "bias" }
  | { kind: "dims" };

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
  ignored: string;
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
        neg: v("--sp-neg"),
        bg: v("--widget-bg"),
        ignored: v("--sp-ignored"),
      });
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
    return () => mo.disconnect();
  }, [ref]);
  return p;
}

/** Width of an element, tracked. */
export function useWidth(ref: React.RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

/** Whether an element is on screen. */
export function useVisible(ref: React.RefObject<HTMLElement | null>) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setVis(entry.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return vis;
}

/** A canvas sized for the device's pixel ratio; returns its 2-D context. */
export function setupCanvas(canvas: HTMLCanvasElement, w: number, h: number) {
  const dpr = window.devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return ctx;
}

export function withAlpha(color: string, a: number) {
  // Tokens are hex (#rgb or #rrggbb) or rgb()/rgba(); canvas accepts color-mix
  // inconsistently, so do it by hand.
  const c = color.trim();
  if (c.startsWith("#")) {
    const hex = c.length === 4 ? c.slice(1).split("").map((d) => d + d).join("") : c.slice(1, 7);
    const n = parseInt(hex, 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const [r, g, b] = m[1].split(",").map((s) => parseFloat(s));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return c;
}
