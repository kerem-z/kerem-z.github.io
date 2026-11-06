"use client";

// Small pieces shared by the Chinese-room and symbol-grounding posts. They
// follow the superposition post's conventions but carry their own styles, so
// the two posts do not depend on that post's stylesheet.

import katex from "katex";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import type { Glyph as GlyphData } from "./script";
import styles from "./ui.module.css";

/** Inline or display math, rendered with KaTeX. */
export function TeX({ children, block = false }: { children: string; block?: boolean }) {
  const html = katex.renderToString(children, { displayMode: block, throwOnError: false });
  return block ? (
    <div className={styles.texBlock} dangerouslySetInnerHTML={{ __html: html }} />
  ) : (
    <span dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** A number in the prose you drag sideways (or step with the arrow keys). `log` scrubs the exponent. */
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
  const start = useRef<{ x: number; u: number } | null>(null);
  const [active, setActive] = useState(false);
  const to = useCallback((v: number) => (log ? Math.log10(v) : v), [log]);
  const lo = to(min);
  const hi = to(max);

  const set = (u: number) => {
    const snapped = Math.round(Math.min(hi, Math.max(lo, u)) / step) * step;
    const v = Number((log ? Math.pow(10, snapped) : snapped).toPrecision(6));
    if (v !== value) onChange(v);
  };

  const down = (e: PointerEvent<HTMLSpanElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, u: to(value) };
    setActive(true);
  };
  const move = (e: PointerEvent<HTMLSpanElement>) => {
    if (!start.current) return;
    set(start.current.u + ((e.clientX - start.current.x) / 180) * (hi - lo));
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

/** A phrase that lights up part of a figure while you point at or focus it. */
export function Term<F>({
  focus,
  setFocus,
  children,
}: {
  focus: F;
  setFocus: (f: F | null) => void;
  children: React.ReactNode;
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

/** A button that sits in a sentence. */
export function InlineButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className={styles.inlineBtn} onClick={onClick}>
      {children}
    </button>
  );
}

/** One glyph of the invented script, drawn in the current text colour. */
export function Glyph({ g, size = 22, title }: { g: GlyphData; size?: number; title?: string }) {
  return (
    <svg
      className={styles.glyph}
      width={size}
      height={size}
      viewBox="-0.6 -0.6 3.2 3.2"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {g.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
      ))}
    </svg>
  );
}

/** Whether the reader asked for less motion. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return reduced;
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
