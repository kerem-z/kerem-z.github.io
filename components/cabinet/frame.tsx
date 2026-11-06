"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./cabinet.module.css";

/** Colour tokens read from the page; canvases redraw when the theme flips. */
export type Pal = {
  bg: string;
  ink: string;
  muted: string;
  faint: string;
  accent: string;
  warm: string;
  /** "r,g,b" strings, for rgba() and ImageData */
  bgRGB: [number, number, number];
  inkRGB: [number, number, number];
  accentRGB: [number, number, number];
  warmRGB: [number, number, number];
  dark: boolean;
};

/**
 * One animation. `init` builds its state for a canvas of w × h CSS pixels;
 * `frame` draws one frame at time t (seconds since start), dt seconds after
 * the last. Animations clear (or fade) the canvas themselves, so trails are
 * possible. `still` is the time at which to draw a single frame for readers who
 * asked for reduced motion (default 6 s; the frame loop is run up to it).
 */
export type Anim<S> = {
  init: (w: number, h: number, rand: () => number, pal: Pal) => S;
  frame: (ctx: CanvasRenderingContext2D, s: S, t: number, dt: number, w: number, h: number, pal: Pal) => void;
  still?: number;
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function parse(color: string): [number, number, number] {
  const c = color.trim();
  if (c.startsWith("#")) {
    const hex = c.length === 4 ? c.slice(1).split("").map((d) => d + d).join("") : c.slice(1, 7);
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = c.match(/[\d.]+/g);
  return m ? [Number(m[0]), Number(m[1]), Number(m[2])] : [0, 0, 0];
}

function readPal(el: HTMLElement): Pal {
  const cs = getComputedStyle(el);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  const bg = v("--widget-bg");
  const ink = v("--ink");
  const accent = v("--accent");
  const warm = v("--cab-warm");
  return {
    bg,
    ink,
    muted: v("--ink-muted"),
    faint: v("--ink-faint"),
    accent,
    warm,
    bgRGB: parse(bg),
    inkRGB: parse(ink),
    accentRGB: parse(accent),
    warmRGB: parse(warm),
    dark: document.documentElement.getAttribute("data-theme") === "dark",
  };
}

/**
 * A canvas that runs one animation while it is on screen. Restarts from
 * scratch when resized or when the theme changes.
 */
export function Canvas<S>({ anim, aspect = 0.75, seed = 1, label }: { anim: Anim<S>; aspect?: number; seed?: number; label: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [w, setW] = useState(0);
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)));
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    const mo = new MutationObserver(() => setTheme((t) => t + 1));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  const h = Math.round(w * aspect);
  const state = useRef<{ s: S; t: number; key: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box || w === 0) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const key = `${w}|${theme}`;
    const pal = readPal(box);
    const ctx = canvas.getContext("2d")!;
    if (state.current?.key !== key) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(0, 0, w, h);
      state.current = { s: anim.init(w, h, rng(seed), pal), t: 0, key };
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // run the clock forward in fixed steps and show where it lands
      const st = state.current!;
      const target = anim.still ?? 6;
      while (st.t < target) {
        st.t += 1 / 30;
        anim.frame(ctx, st.s, st.t, 1 / 30, w, h, pal);
      }
      return;
    }
    if (!visible) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const st = state.current!;
      st.t += dt;
      anim.frame(ctx, st.s, st.t, dt, w, h, pal);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [anim, w, h, visible, theme, seed]);

  return (
    <div ref={boxRef} className={styles.canvasBox}>
      <canvas ref={canvasRef} role="img" aria-label={label} className={styles.canvas} />
    </div>
  );
}

export type Tag = "geometry" | "chaos" | "physics" | "life" | "number" | "tiling" | "signal";

/** One exhibit in the cabinet. */
export type Entry = {
  id: string;
  title: string;
  tag: Tag;
  /** two or three sentences: what is drawn and the rule that drives it */
  blurb: string;
  /** optional KaTeX source for the rule */
  formula?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  anim: Anim<any>;
  aspect?: number;
  seed?: number;
  /** a wide exhibit spans both columns */
  wide?: boolean;
};
