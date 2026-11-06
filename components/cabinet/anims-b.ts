// Cabinet exhibits, batch B: thirteen small non-interactive animations.
// Runtime imports are kept to none (only types from ./frame) so the module
// can be loaded outside the browser for smoke tests.

import type { Anim, Entry, Pal } from "./frame";

type RGB = [number, number, number];
type Ctx = CanvasRenderingContext2D;

const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const MONO = "10px ui-monospace, SFMono-Regular, Menlo, monospace";
const TAU = Math.PI * 2;
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (x: number) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};
const mix = (a: RGB, b: RGB, t: number): RGB => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

function clear(ctx: Ctx, w: number, h: number, pal: Pal) {
  ctx.globalAlpha = 1;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, w, h);
}

function label(ctx: Ctx, pal: Pal, text: string, x: number, y: number, align: CanvasTextAlign = "left") {
  ctx.font = MONO;
  ctx.fillStyle = pal.faint;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, x, y);
}

function gauss(rand: () => number) {
  const u = Math.max(1e-12, rand());
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * rand());
}

/** An offscreen pixel buffer, drawn scaled onto the visible canvas. */
type Buf = { c: CanvasImageSource; g: Ctx; img: ImageData; w: number; h: number };
function makeBuf(bw: number, bh: number): Buf {
  let c: OffscreenCanvas | HTMLCanvasElement;
  if (typeof OffscreenCanvas !== "undefined") c = new OffscreenCanvas(bw, bh);
  else {
    const e = document.createElement("canvas");
    e.width = bw;
    e.height = bh;
    c = e;
  }
  const g = c.getContext("2d") as unknown as Ctx;
  return { c, g, img: g.createImageData(bw, bh), w: bw, h: bh };
}

// ---------------------------------------------------------------------------
// 1. L-system plant
// ---------------------------------------------------------------------------

const LRULES: { axiom: string; rules: Record<string, string>; ang: number }[] = [
  { axiom: "X", rules: { X: "F+[[X]-X]-F[-FX]+X", F: "FF" }, ang: 25 },
  { axiom: "X", rules: { X: "F[+X]F[-X]+X", F: "FF" }, ang: 20 },
  { axiom: "F", rules: { F: "F[+F]F[-F][F]" }, ang: 20 },
  { axiom: "X", rules: { X: "F[+X][-X]FX", F: "FF" }, ang: 25.7 },
  { axiom: "F", rules: { F: "FF-[-F+F+F]+[+F-F-F]" }, ang: 22.5 },
];

type LS = {
  rand: () => number;
  str: string;
  jit: Float32Array;
  tip: Uint8Array;
  ang: number;
  nF: number;
  scale: number;
  ox: number;
  oy: number;
  t0: number;
  buckets: number[][];
};

const countF = (s: string) => {
  let n = 0;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 70) n++;
  return n;
};

/** Walk the string with the turtle; calls seg() for each F, in order. */
function turtle(
  s: LS,
  bend: (depth: number) => number,
  seg: (k: number, x0: number, y0: number, x1: number, y1: number, depth: number) => boolean,
) {
  const stack: number[] = [];
  let x = 0;
  let y = 0;
  let a = -Math.PI / 2;
  let depth = 0;
  let k = 0;
  const str = s.str;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    if (ch === 70) {
      a += bend(depth);
      const nx = x + Math.cos(a);
      const ny = y + Math.sin(a);
      if (!seg(k, x, y, nx, ny, depth)) return;
      k++;
      x = nx;
      y = ny;
    } else if (ch === 43) a += s.ang * (1 + s.jit[i]);
    else if (ch === 45) a -= s.ang * (1 + s.jit[i]);
    else if (ch === 91) {
      stack.push(x, y, a, depth);
      depth++;
    } else if (ch === 93) {
      depth = stack.pop()!;
      a = stack.pop()!;
      y = stack.pop()!;
      x = stack.pop()!;
    }
  }
}

function plantGrow(s: LS, w: number, h: number) {
  const rand = s.rand;
  const rule = LRULES[Math.floor(rand() * LRULES.length)];
  let str = rule.axiom;
  for (let it = 0; it < 8; it++) {
    let next = "";
    for (const ch of str) next += rule.rules[ch] ?? ch;
    if (countF(next) > 3000) break;
    str = next;
    if (countF(str) > 500) break;
  }
  s.str = str;
  s.ang = ((rule.ang + (rand() - 0.5) * 4) * Math.PI) / 180;
  s.jit = new Float32Array(str.length);
  for (let i = 0; i < str.length; i++) s.jit[i] = (rand() - 0.5) * 0.3;
  s.nF = countF(str);
  // a segment is a tip when the next drawing symbol is a closing bracket or the end
  s.tip = new Uint8Array(s.nF);
  let k = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] !== "F") continue;
    let j = i + 1;
    while (j < str.length && str[j] !== "F" && str[j] !== "[" && str[j] !== "]") j++;
    if (j >= str.length || str[j] === "]") s.tip[k] = 1;
    k++;
  }
  let minX = 0;
  let maxX = 0;
  let minY = 0;
  let maxY = 0;
  turtle(s, () => 0, (_k, _x0, _y0, x1, y1) => {
    if (x1 < minX) minX = x1;
    if (x1 > maxX) maxX = x1;
    if (y1 < minY) minY = y1;
    if (y1 > maxY) maxY = y1;
    return true;
  });
  s.scale = Math.min((w * 0.86) / Math.max(1e-6, maxX - minX), (h * 0.84) / Math.max(1e-6, maxY - minY));
  s.ox = w / 2 - ((minX + maxX) / 2) * s.scale;
  s.oy = h * 0.95 - maxY * s.scale;
}

const L_GROW = 9;
const L_HOLD = 3.5;
const L_FADE = 1.2;

const lsystem: Anim<LS> = {
  init(w, h, rand) {
    const s: LS = {
      rand,
      str: "",
      jit: new Float32Array(0),
      tip: new Uint8Array(0),
      ang: 0,
      nF: 0,
      scale: 1,
      ox: 0,
      oy: 0,
      t0: 0,
      buckets: Array.from({ length: 7 }, () => []),
    };
    plantGrow(s, w, h);
    return s;
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    let u = t - s.t0;
    if (u > L_GROW + L_HOLD + L_FADE) {
      s.t0 = t;
      u = 0;
      plantGrow(s, w, h);
    }
    clear(ctx, w, h, pal);
    const shown = smooth(u / L_GROW) * s.nF;
    const whole = Math.floor(shown);
    const frac = shown - whole;
    const b1 = 0.0035 * Math.sin(0.7 * t);
    const b2 = 0.0018 * Math.sin(1.31 * t + 1.1);
    const bend = (d: number) => b1 + b2 * (1 + 0.15 * d);
    for (const b of s.buckets) b.length = 0;
    const tips: number[] = [];
    let headX = 0;
    let headY = 0;
    const sc = s.scale;
    turtle(s, bend, (k, x0, y0, x1, y1, d) => {
      if (k > whole || (k === whole && frac === 0)) return false;
      const f = k === whole ? frac : 1;
      const X0 = s.ox + x0 * sc;
      const Y0 = s.oy + y0 * sc;
      const X1 = s.ox + lerp(x0, x1, f) * sc;
      const Y1 = s.oy + lerp(y0, y1, f) * sc;
      s.buckets[Math.min(6, d)].push(X0, Y0, X1, Y1);
      if (f === 1 && s.tip[k] && d >= 2) tips.push(X1, Y1);
      headX = X1;
      headY = Y1;
      return true;
    });
    const fade = u > L_GROW + L_HOLD ? 1 - (u - L_GROW - L_HOLD) / L_FADE : 1;
    ctx.globalAlpha = clamp(fade, 0, 1);
    ctx.lineCap = "round";
    for (let d = 0; d < 7; d++) {
      const b = s.buckets[d];
      if (!b.length) continue;
      ctx.lineWidth = Math.max(0.6, 1.5 - d * 0.16);
      ctx.strokeStyle = rgba(pal.inkRGB, Math.max(0.4, 0.85 - d * 0.07));
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 4) {
        ctx.moveTo(b[i], b[i + 1]);
        ctx.lineTo(b[i + 2], b[i + 3]);
      }
      ctx.stroke();
    }
    ctx.fillStyle = rgba(pal.accentRGB, 0.55);
    ctx.beginPath();
    for (let i = 0; i < tips.length; i += 2) {
      ctx.moveTo(tips[i] + 1.3, tips[i + 1]);
      ctx.arc(tips[i], tips[i + 1], 1.3, 0, TAU);
    }
    ctx.fill();
    if (whole < s.nF) {
      ctx.fillStyle = pal.warm;
      ctx.beginPath();
      ctx.arc(headX, headY, 1.8, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  still: 12,
};

// ---------------------------------------------------------------------------
// 2. Hilbert curve
// ---------------------------------------------------------------------------

function hilbertD2XY(n: number, d: number): [number, number] {
  let x = 0;
  let y = 0;
  let t = d;
  for (let s = 1; s < n; s *= 2) {
    const rx = 1 & (t >> 1);
    const ry = 1 & (t ^ rx);
    if (ry === 0) {
      if (rx === 1) {
        x = s - 1 - x;
        y = s - 1 - y;
      }
      const tmp = x;
      x = y;
      y = tmp;
    }
    x += s * rx;
    y += s * ry;
    t >>= 2;
  }
  return [x, y];
}

type HPhase = { kind: "draw" | "trace" | "morph" | "hold" | "fade"; k: number; dur: number };
type HS = { pts: Float32Array[]; par: Float32Array[]; phases: HPhase[]; cycle: number };
const H_MAX = 6;

/** Points of order k (normalised to [0,1]) and, for each, the centre of its parent cell. */
export function hilbertPoints(k: number): { pts: Float32Array; par: Float32Array } {
  const n = 1 << k;
  const N = n * n;
  const pts = new Float32Array(N * 2);
  const par = new Float32Array(N * 2);
  for (let d = 0; d < N; d++) {
    const [x, y] = hilbertD2XY(n, d);
    pts[2 * d] = (x + 0.5) / n;
    pts[2 * d + 1] = (y + 0.5) / n;
    par[2 * d] = ((x >> 1) + 0.5) / (n / 2);
    par[2 * d + 1] = ((y >> 1) + 0.5) / (n / 2);
  }
  return { pts, par };
}

const hilbert: Anim<HS> = {
  init() {
    const pts: Float32Array[] = [];
    const par: Float32Array[] = [];
    for (let k = 0; k <= H_MAX; k++) {
      if (k === 0) {
        pts.push(new Float32Array([0.5, 0.5]));
        par.push(new Float32Array([0.5, 0.5]));
        continue;
      }
      const r = hilbertPoints(k);
      pts.push(r.pts);
      par.push(r.par);
    }
    const phases: HPhase[] = [
      { kind: "draw", k: 1, dur: 1.4 },
      { kind: "trace", k: 1, dur: 1.2 },
    ];
    for (let k = 2; k <= H_MAX; k++) {
      phases.push({ kind: "morph", k, dur: 1.5 });
      phases.push({ kind: "trace", k, dur: 1.2 + 0.35 * k });
    }
    phases.push({ kind: "hold", k: H_MAX, dur: 2.5 });
    phases.push({ kind: "fade", k: H_MAX, dur: 1 });
    return { pts, par, phases, cycle: phases.reduce((a, p) => a + p.dur, 0) };
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    clear(ctx, w, h, pal);
    let u = t % s.cycle;
    let ph = s.phases[0];
    for (const p of s.phases) {
      ph = p;
      if (u < p.dur) break;
      u -= p.dur;
    }
    const p = clamp(u / ph.dur, 0, 1);
    const side = Math.min(w, h) * 0.84;
    const x0 = (w - side) / 2;
    const y0 = (h - side) / 2;
    const k = ph.k;
    const P = s.pts[k];
    const Q = s.par[k];
    const N = P.length / 2;
    const m = ph.kind === "morph" ? smooth(p) : 1;
    const X = (i: number) => x0 + lerp(Q[2 * i], P[2 * i], m) * side;
    const Y = (i: number) => y0 + (1 - lerp(Q[2 * i + 1], P[2 * i + 1], m)) * side;
    const path = (upto: number) => {
      const whole = Math.min(N - 1, Math.floor(upto));
      ctx.beginPath();
      ctx.moveTo(X(0), Y(0));
      for (let i = 1; i <= whole; i++) ctx.lineTo(X(i), Y(i));
      if (whole < N - 1) {
        const f = upto - whole;
        ctx.lineTo(lerp(X(whole), X(whole + 1), f), lerp(Y(whole), Y(whole + 1), f));
      }
      ctx.stroke();
    };
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(0.75, 1.6 - k * 0.15);
    const fade = ph.kind === "fade" ? 1 - p : 1;
    ctx.globalAlpha = fade;
    // faint grid of the current order's cells
    ctx.strokeStyle = rgba(pal.inkRGB, 0.06);
    ctx.strokeRect(x0, y0, side, side);
    if (ph.kind === "draw") {
      ctx.strokeStyle = rgba(pal.inkRGB, 0.8);
      path(p * (N - 1));
    } else if (ph.kind === "trace") {
      ctx.strokeStyle = rgba(pal.inkRGB, 0.55);
      path(N - 1);
      ctx.strokeStyle = pal.accent;
      path(smooth(p) * (N - 1));
    } else {
      ctx.strokeStyle = rgba(pal.inkRGB, ph.kind === "morph" ? 0.7 : 0.75);
      path(N - 1);
    }
    ctx.globalAlpha = 1;
    label(ctx, pal, `order ${k} · ${N} cells`, 8, h - 8);
  },
  still: 22,
};

// ---------------------------------------------------------------------------
// 3. Diffusion-limited aggregation
// ---------------------------------------------------------------------------

type DS = {
  rand: () => number;
  cs: number;
  gw: number;
  gh: number;
  occ: Uint8Array;
  buf: Buf;
  wx: Int32Array;
  wy: Int32Array;
  cx: number;
  cy: number;
  rc: number;
  rLimit: number;
  count: number;
  doneAt: number;
  dirty: boolean;
};
const D_WALKERS = 300;
const D_STEPS = 24000;
const D_STICK = 3;

function dlaReset(s: DS) {
  s.occ.fill(0);
  s.buf.img.data.fill(0);
  s.rc = 1;
  s.count = 0;
  s.doneAt = -1;
  s.dirty = true;
  const i = s.cy * s.gw + s.cx;
  s.occ[i] = 1;
  for (let j = 0; j < D_WALKERS; j++) dlaLaunch(s, j);
}

function dlaLaunch(s: DS, j: number) {
  const a = s.rand() * TAU;
  const r = s.rc + 5;
  s.wx[j] = Math.round(s.cx + r * Math.cos(a));
  s.wy[j] = Math.round(s.cy + r * Math.sin(a));
}

function dlaPaint(s: DS, i: number, pal: Pal) {
  const c = mix(pal.inkRGB, pal.accentRGB, smooth(s.rc / s.rLimit));
  const d = s.buf.img.data;
  d[4 * i] = c[0];
  d[4 * i + 1] = c[1];
  d[4 * i + 2] = c[2];
  d[4 * i + 3] = 235;
}

const dla: Anim<DS> = {
  init(w, h, rand, pal) {
    const cs = Math.max(2, Math.round(Math.min(w, h) / 170));
    const gw = Math.ceil(w / cs);
    const gh = Math.ceil(h / cs);
    const s: DS = {
      rand,
      cs,
      gw,
      gh,
      occ: new Uint8Array(gw * gh),
      buf: makeBuf(gw, gh),
      wx: new Int32Array(D_WALKERS),
      wy: new Int32Array(D_WALKERS),
      cx: Math.floor(gw / 2),
      cy: Math.floor(gh / 2),
      rc: 1,
      rLimit: Math.min(gw, gh) * 0.46,
      count: 0,
      doneAt: -1,
      dirty: true,
    };
    dlaReset(s);
    dlaPaint(s, s.cy * gw + s.cx, pal);
    return s;
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    const { gw, gh, occ, wx, wy, cx, cy, rand } = s;
    if (s.doneAt >= 0 && t - s.doneAt > 3.5) {
      dlaReset(s);
      dlaPaint(s, cy * gw + cx, pal);
    }
    if (s.doneAt < 0) {
      let stuck = 0;
      let j = 0;
      const kill = s.rc * 1.4 + 14;
      const kill2 = kill * kill;
      for (let step = 0; step < D_STEPS && stuck < D_STICK; step++) {
        j = j + 1 === D_WALKERS ? 0 : j + 1;
        const dir = (rand() * 4) | 0;
        const x = wx[j] + (dir === 0 ? 1 : dir === 1 ? -1 : 0);
        const y = wy[j] + (dir === 2 ? 1 : dir === 3 ? -1 : 0);
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > kill2 || x < 1 || y < 1 || x >= gw - 1 || y >= gh - 1) {
          dlaLaunch(s, j);
          continue;
        }
        const i = y * gw + x;
        if (occ[i]) continue; // blocked by the cluster: stay put this step
        wx[j] = x;
        wy[j] = y;
        if (occ[i - 1] || occ[i + 1] || occ[i - gw] || occ[i + gw]) {
          occ[i] = 1;
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r + 1 > s.rc) s.rc = r + 1;
          dlaPaint(s, i, pal);
          s.count++;
          stuck++;
          s.dirty = true;
          dlaLaunch(s, j);
          if (s.rc >= s.rLimit) {
            s.doneAt = t;
            break;
          }
        }
      }
    }
    clear(ctx, w, h, pal);
    if (s.dirty) {
      s.buf.g.putImageData(s.buf.img, 0, 0);
      s.dirty = false;
    }
    const fade = s.doneAt >= 0 ? 1 - smooth((t - s.doneAt - 2.5) / 1) : 1;
    ctx.globalAlpha = fade;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(s.buf.c, 0, 0, gw * s.cs, gh * s.cs);
    ctx.imageSmoothingEnabled = true;
    if (s.doneAt < 0) {
      ctx.fillStyle = rgba(pal.inkRGB, 0.28);
      for (let j = 0; j < 80; j++) ctx.fillRect(wx[j] * s.cs, wy[j] * s.cs, s.cs * 0.8, s.cs * 0.8);
    }
    ctx.globalAlpha = 1;
    label(ctx, pal, `${s.count} particles`, 8, h - 8);
  },
  still: 14,
};

// ---------------------------------------------------------------------------
// 4. Penrose P3 tiling by Robinson-triangle deflation
// ---------------------------------------------------------------------------

/** Each triangle: [colour, ax, ay, bx, by, cx, cy] packed in a Float64Array. */
type PS = { gens: Float64Array[]; hold: number; trans: number; cycle: number };
const PHI = (1 + Math.sqrt(5)) / 2;

export function penroseSubdivide(tri: Float64Array): Float64Array {
  const out: number[] = [];
  for (let i = 0; i < tri.length; i += 7) {
    const [c, ax, ay, bx, by, cx, cy] = [tri[i], tri[i + 1], tri[i + 2], tri[i + 3], tri[i + 4], tri[i + 5], tri[i + 6]];
    if (c === 0) {
      const px = ax + (bx - ax) / PHI;
      const py = ay + (by - ay) / PHI;
      out.push(0, cx, cy, px, py, bx, by, 1, px, py, cx, cy, ax, ay);
    } else {
      const qx = bx + (ax - bx) / PHI;
      const qy = by + (ay - by) / PHI;
      const rx = bx + (cx - bx) / PHI;
      const ry = by + (cy - by) / PHI;
      out.push(1, rx, ry, cx, cy, ax, ay, 1, qx, qy, rx, ry, bx, by, 0, rx, ry, qx, qy, ax, ay);
    }
  }
  return new Float64Array(out);
}

const penrose: Anim<PS> = {
  init(w, h) {
    const R = Math.hypot(w, h) / 2 + 4;
    const wheel: number[] = [];
    for (let i = 0; i < 10; i++) {
      let bx = R * Math.cos(((2 * i - 1) * Math.PI) / 10);
      let by = R * Math.sin(((2 * i - 1) * Math.PI) / 10);
      let cx = R * Math.cos(((2 * i + 1) * Math.PI) / 10);
      let cy = R * Math.sin(((2 * i + 1) * Math.PI) / 10);
      if (i % 2 === 0) {
        [bx, cx] = [cx, bx];
        [by, cy] = [cy, by];
      }
      wheel.push(0, 0, 0, bx, by, cx, cy);
    }
    const gens: Float64Array[] = [new Float64Array(wheel)];
    while (R / Math.pow(PHI, gens.length) > 13 && gens.length < 8) gens.push(penroseSubdivide(gens[gens.length - 1]));
    const hold = 2.2;
    const trans = 1.3;
    return { gens, hold, trans, cycle: gens.length * (hold + trans) + 2.5 };
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    clear(ctx, w, h, pal);
    const G = s.gens.length;
    const u = t % s.cycle;
    const step = s.hold + s.trans;
    let g = Math.floor(u / step);
    let p = 0;
    let next = -1;
    if (g >= G) {
      g = G - 1; // extra hold at the finest generation
    } else {
      const v = u - g * step;
      if (v > s.hold) {
        p = smooth((v - s.hold) / s.trans);
        next = g + 1 < G ? g + 1 : 0;
        if (g + 1 >= G) next = -1; // last generation: plain hold, wrap afterwards
      }
    }
    // the wrap: in the final 1.2 s of the cycle, fade generation 0 back in
    let wrapP = 0;
    if (u > s.cycle - 1.2) wrapP = smooth((u - (s.cycle - 1.2)) / 1.2);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(t * 0.008);
    const fills = [rgba(pal.inkRGB, pal.dark ? 0.07 : 0.05), rgba(pal.accentRGB, pal.dark ? 0.16 : 0.13)];
    const draw = (tri: Float64Array, alpha: number, lw: number) => {
      if (alpha <= 0.001) return;
      ctx.globalAlpha = alpha;
      for (let col = 0; col < 2; col++) {
        ctx.fillStyle = fills[col];
        ctx.beginPath();
        for (let i = 0; i < tri.length; i += 7) {
          if (tri[i] !== col) continue;
          ctx.moveTo(tri[i + 1], tri[i + 2]);
          ctx.lineTo(tri[i + 3], tri[i + 4]);
          ctx.lineTo(tri[i + 5], tri[i + 6]);
          ctx.closePath();
        }
        ctx.fill();
      }
      ctx.strokeStyle = rgba(pal.inkRGB, 0.55);
      ctx.lineWidth = lw;
      ctx.lineJoin = "round";
      ctx.beginPath();
      for (let i = 0; i < tri.length; i += 7) {
        // the two legs C–A–B; the base B–C is the rhomb's diagonal, not an edge
        ctx.moveTo(tri[i + 5], tri[i + 6]);
        ctx.lineTo(tri[i + 1], tri[i + 2]);
        ctx.lineTo(tri[i + 3], tri[i + 4]);
      }
      ctx.stroke();
    };
    const lw = (k: number) => Math.max(0.75, 1.5 - k * 0.15);
    const base = 1 - wrapP;
    draw(s.gens[g], (next >= 0 ? 1 - p : 1) * base, lw(g));
    if (next >= 0) draw(s.gens[next], p * base, lw(next));
    if (wrapP > 0) draw(s.gens[0], wrapP, lw(0));
    ctx.restore();
    ctx.globalAlpha = 1;
    const shownG = next >= 0 && p > 0.5 ? next : g;
    label(ctx, pal, `generation ${shownG} · ${s.gens[shownG].length / 7} triangles`, 8, h - 8);
  },
  still: 12,
};

// ---------------------------------------------------------------------------
// 5. Ridge lines
// ---------------------------------------------------------------------------

function valueNoise(rand: () => number) {
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const val = new Float32Array(256);
  for (let i = 0; i < 256; i++) val[i] = rand();
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const X = xi & 255;
    const Y = yi & 255;
    const a = val[perm[perm[X] + Y]];
    const b = val[perm[perm[X + 1] + Y]];
    const c = val[perm[perm[X] + Y + 1]];
    const d = val[perm[perm[X + 1] + Y + 1]];
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
}

type RS = { noise: (x: number, y: number) => number; lines: number; pts: number; ys: Float32Array; accentLine: number };

const ridges: Anim<RS> = {
  init(w, h, rand) {
    const spacing = Math.max(5, h / 50);
    const amp = spacing * 5.5;
    const lines = Math.max(8, Math.floor((h * 0.92 - amp) / spacing));
    const pts = Math.max(60, Math.min(160, Math.round(Math.min(w * 0.84, h * 1.6) / 4)));
    return { noise: valueNoise(rand), lines, pts, ys: new Float32Array(pts + 1), accentLine: Math.floor(lines * (0.55 + rand() * 0.2)) };
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    clear(ctx, w, h, pal);
    const spacing = Math.max(5, h / 50);
    const amp = spacing * 5.5;
    const pw = Math.min(w * 0.84, h * 1.6);
    const x0 = (w - pw) / 2;
    const top = amp + h * 0.03;
    const n = s.noise;
    const P = s.pts;
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    for (let i = 0; i < s.lines; i++) {
      const base = top + i * spacing;
      const ny = i * 0.45 + t * 0.12;
      for (let j = 0; j <= P; j++) {
        const u = j / P;
        const env = Math.exp(-((u - 0.5) * (u - 0.5)) / (2 * 0.13 * 0.13));
        const nx = u * 7 + t * 0.05;
        const f = n(nx, ny) + 0.5 * n(nx * 2.1, ny * 1.7 + 11) + 0.25 * n(nx * 4.3, ny * 2.9 + 23);
        const v = f / 1.75;
        s.ys[j] = base - amp * (env * v * v * v * 1.6 + 0.04 * v);
      }
      ctx.beginPath();
      ctx.moveTo(x0, s.ys[0]);
      for (let j = 1; j <= P; j++) ctx.lineTo(x0 + (pw * j) / P, s.ys[j]);
      ctx.lineTo(x0 + pw, h);
      ctx.lineTo(x0, h);
      ctx.closePath();
      ctx.fillStyle = pal.bg;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x0, s.ys[0]);
      for (let j = 1; j <= P; j++) ctx.lineTo(x0 + (pw * j) / P, s.ys[j]);
      ctx.strokeStyle = i === s.accentLine ? pal.accent : rgba(pal.inkRGB, 0.85);
      ctx.stroke();
    }
  },
  still: 6,
};

// ---------------------------------------------------------------------------
// 6. Galton board
// ---------------------------------------------------------------------------

type Ball = { path: Uint8Array; t: number; bin: number; slot: number };
type GS = {
  rand: () => number;
  balls: Ball[];
  reserved: Int32Array;
  landed: Int32Array;
  total: number;
  spawnAcc: number;
  full: boolean;
  doneAt: number;
};
const G_ROWS = 12;
const G_ROW_T = 0.12;
const G_FALL_T = 0.25;
const G_COLS = 3;

function galtonGeom(w: number, h: number) {
  const dx = Math.min((w * 0.8) / (G_ROWS + 1), (h * 0.5) / G_ROWS * 1.3);
  const top = h * 0.1;
  const dy = (h * 0.48) / G_ROWS;
  const binTop = top + G_ROWS * dy;
  const binBottom = h - 18;
  const ballD = dx / G_COLS;
  const cap = Math.floor((binBottom - binTop) / ballD) * G_COLS;
  return { cx: w / 2, dx, top, dy, binTop, binBottom, ballD, r: ballD * 0.42, cap };
}

const binom = (n: number, k: number) => {
  let c = 1;
  for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i;
  return c;
};

const galton: Anim<GS> = {
  init(_w, _h, rand) {
    return {
      rand,
      balls: [],
      reserved: new Int32Array(G_ROWS + 1),
      landed: new Int32Array(G_ROWS + 1),
      total: 0,
      spawnAcc: 0,
      full: false,
      doneAt: -1,
    };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    const g = galtonGeom(w, h);
    const flight = G_ROW_T * (G_ROWS + 1) + G_FALL_T;
    if (s.doneAt >= 0 && t - s.doneAt > 3.5) {
      s.balls = [];
      s.reserved.fill(0);
      s.landed.fill(0);
      s.total = 0;
      s.full = false;
      s.doneAt = -1;
    }
    if (!s.full) {
      s.spawnAcc += dt * 9;
      while (s.spawnAcc >= 1) {
        s.spawnAcc -= 1;
        const path = new Uint8Array(G_ROWS);
        let bin = 0;
        for (let j = 0; j < G_ROWS; j++) {
          path[j] = s.rand() < 0.5 ? 1 : 0;
          bin += path[j];
        }
        if (s.reserved[bin] >= g.cap) {
          s.full = true;
          break;
        }
        s.balls.push({ path, t: 0, bin, slot: s.reserved[bin]++ });
      }
    }
    for (const b of s.balls) b.t += dt;
    const keep: Ball[] = [];
    for (const b of s.balls) {
      if (b.t >= flight) {
        s.landed[b.bin]++;
        s.total++;
      } else keep.push(b);
    }
    s.balls = keep;
    if (s.full && s.balls.length === 0 && s.doneAt < 0) s.doneAt = t;

    clear(ctx, w, h, pal);
    const fade = s.doneAt >= 0 ? 1 - smooth((t - s.doneAt - 2.5) / 1) : 1;
    ctx.globalAlpha = fade;
    const pegX = (j: number, i: number) => g.cx + (i - j / 2) * g.dx;
    const pegY = (j: number) => g.top + j * g.dy;
    // pegs
    ctx.fillStyle = rgba(pal.inkRGB, 0.4);
    ctx.beginPath();
    for (let j = 0; j < G_ROWS; j++)
      for (let i = 0; i <= j; i++) {
        ctx.moveTo(pegX(j, i) + 1.4, pegY(j));
        ctx.arc(pegX(j, i), pegY(j), 1.4, 0, TAU);
      }
    ctx.fill();
    // bins
    ctx.strokeStyle = rgba(pal.inkRGB, 0.18);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    for (let k = 0; k <= G_ROWS + 1; k++) {
      const x = g.cx + (k - 0.5 - G_ROWS / 2) * g.dx;
      ctx.moveTo(x, g.binTop + g.dy * 0.4);
      ctx.lineTo(x, g.binBottom);
    }
    ctx.moveTo(g.cx - ((G_ROWS + 1) / 2) * g.dx, g.binBottom);
    ctx.lineTo(g.cx + ((G_ROWS + 1) / 2) * g.dx, g.binBottom);
    ctx.stroke();
    const slotXY = (bin: number, slot: number): [number, number] => {
      const row = Math.floor(slot / G_COLS);
      const col = slot % G_COLS;
      return [g.cx + (bin - G_ROWS / 2) * g.dx + (col - (G_COLS - 1) / 2) * g.ballD, g.binBottom - g.ballD / 2 - row * g.ballD];
    };
    // settled balls
    ctx.fillStyle = rgba(pal.inkRGB, 0.7);
    ctx.beginPath();
    for (let k = 0; k <= G_ROWS; k++)
      for (let c = 0; c < s.landed[k]; c++) {
        const [x, y] = slotXY(k, c);
        ctx.moveTo(x + g.r, y);
        ctx.arc(x, y, g.r, 0, TAU);
      }
    ctx.fill();
    // balls in flight
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    for (const b of s.balls) {
      const seg = b.t / G_ROW_T;
      let x: number;
      let y: number;
      if (seg < 1) {
        x = g.cx;
        y = lerp(g.top - g.dy * 1.5, g.top, seg * seg) - g.r - 1.4;
      } else if (seg < G_ROWS + 1) {
        const j = Math.floor(seg) - 1;
        const f = seg - Math.floor(seg);
        let i = 0;
        for (let q = 0; q < j; q++) i += b.path[q];
        const i2 = i + b.path[j];
        x = lerp(pegX(j, i), pegX(j + 1, i2), f);
        y = lerp(pegY(j), pegY(j + 1), f) - Math.sin(Math.PI * f) * g.dy * 0.45 - g.r - 1.4;
      } else {
        const f = clamp((b.t - G_ROW_T * (G_ROWS + 1)) / G_FALL_T, 0, 1);
        const [sx, sy] = slotXY(b.bin, b.slot);
        x = lerp(g.cx + (b.bin - G_ROWS / 2) * g.dx, sx, f);
        y = lerp(g.binTop - g.r - 1.4, sy, f * f);
      }
      ctx.moveTo(x + g.r, y);
      ctx.arc(x, y, g.r, 0, TAU);
    }
    ctx.fill();
    // expected counts: normal approximation, mean n/2, variance n/4
    if (s.total > 0) {
      const sigma = Math.sqrt(G_ROWS) / 2;
      const unit = g.ballD / G_COLS; // pixels per ball
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      for (let q = 0; q <= 120; q++) {
        const kx = -0.5 + ((G_ROWS + 1) * q) / 120;
        const z = (kx - G_ROWS / 2) / sigma;
        const e = (s.total * Math.exp(-0.5 * z * z)) / (sigma * Math.sqrt(TAU));
        const X = g.cx + (kx - G_ROWS / 2) * g.dx;
        const Y = g.binBottom - e * unit;
        if (q === 0) ctx.moveTo(X, Y);
        else ctx.lineTo(X, Y);
      }
      ctx.stroke();
      // exact binomial expectation as small ticks
      ctx.strokeStyle = rgba(pal.warmRGB, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let k = 0; k <= G_ROWS; k++) {
        const e = (s.total * binom(G_ROWS, k)) / Math.pow(2, G_ROWS);
        const X = g.cx + (k - G_ROWS / 2) * g.dx;
        const Y = g.binBottom - e * unit;
        ctx.moveTo(X - g.dx * 0.18, Y);
        ctx.lineTo(X + g.dx * 0.18, Y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    label(ctx, pal, `n = ${s.total}`, 8, h - 4);
  },
  still: 14,
};

// ---------------------------------------------------------------------------
// 7. Buffon's needle
// ---------------------------------------------------------------------------

type BS = { rand: () => number; ring: Float32Array; head: number; size: number; n: number; hits: number; acc: number };
const B_CAP = 700;

function buffonGeom(w: number, h: number) {
  const m = 5;
  const y0 = 12;
  const t = (h - y0 - 26) / m;
  return { m, y0, t, L: 0.8 * t };
}

const buffon: Anim<BS> = {
  init(_w, _h, rand) {
    return { rand, ring: new Float32Array(B_CAP * 5), head: 0, size: 0, n: 0, hits: 0, acc: 0 };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    const g = buffonGeom(w, h);
    const rate = Math.min(80, 6 + t * 3);
    s.acc += dt * rate;
    while (s.acc >= 1) {
      s.acc -= 1;
      const cx = g.L / 2 + 4 + s.rand() * (w - g.L - 8);
      const cy = g.y0 + s.rand() * g.m * g.t; // uniform over whole periods
      const th = s.rand() * Math.PI;
      const ex = (g.L / 2) * Math.cos(th);
      const ey = (g.L / 2) * Math.sin(th);
      const cross = Math.floor((cy - ey - g.y0) / g.t) !== Math.floor((cy + ey - g.y0) / g.t) ? 1 : 0;
      const o = s.head * 5;
      s.ring[o] = cx - ex;
      s.ring[o + 1] = cy - ey;
      s.ring[o + 2] = cx + ex;
      s.ring[o + 3] = cy + ey;
      s.ring[o + 4] = cross;
      s.head = (s.head + 1) % B_CAP;
      s.size = Math.min(B_CAP, s.size + 1);
      s.n++;
      s.hits += cross;
    }
    clear(ctx, w, h, pal);
    ctx.strokeStyle = rgba(pal.inkRGB, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k <= g.m; k++) {
      const y = g.y0 + k * g.t;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    // older needles fainter: two age bands × crossing or not
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    for (let band = 0; band < 2; band++) {
      for (let cross = 0; cross < 2; cross++) {
        const old = band === 0;
        ctx.strokeStyle = cross ? rgba(pal.accentRGB, old ? 0.35 : 0.9) : rgba(pal.inkRGB, old ? 0.14 : 0.45);
        ctx.beginPath();
        for (let a = 0; a < s.size; a++) {
          const age = a; // 0 = newest
          if ((age >= 250) !== old) continue;
          const idx = (s.head - 1 - a + B_CAP * 2) % B_CAP;
          const o = idx * 5;
          if (s.ring[o + 4] !== cross) continue;
          ctx.moveTo(s.ring[o], s.ring[o + 1]);
          ctx.lineTo(s.ring[o + 2], s.ring[o + 3]);
        }
        ctx.stroke();
      }
    }
    const est = s.hits > 0 ? (2 * g.L * s.n) / (g.t * s.hits) : NaN;
    label(ctx, pal, `n = ${s.n}   crossings = ${s.hits}   π ≈ ${Number.isFinite(est) ? est.toFixed(4) : "…"}`, 8, h - 8);
  },
  still: 20,
};

// ---------------------------------------------------------------------------
// 8. Mandelbrot set
// ---------------------------------------------------------------------------

type MLoc = { cx: number; cy: number; span: number; it: number; name: string };
const M_LOCS: MLoc[] = [
  { cx: -0.6, cy: 0, span: 3.4, it: 160, name: "whole set" },
  { cx: -0.7453, cy: 0.1127, span: 0.013, it: 500, name: "seahorse valley" },
  { cx: 0.2855, cy: 0.0117, span: 0.016, it: 500, name: "elephant valley" },
  { cx: -0.0886, cy: 0.6544, span: 0.024, it: 450, name: "triple spiral" },
  { cx: -1.7685, cy: 0.0011, span: 0.03, it: 400, name: "minibrot on the needle" },
];
const M_BUDGET = 70000;

type MS = { buf: Buf; loc: number; px: number; lo: number; doneAt: number; scale: number };

/** Smoothed escape count, or -1 inside. */
export function mandelNu(cr: number, ci: number, it: number): number {
  let zr = 0;
  let zi = 0;
  let n = 0;
  let r2 = 0;
  while (n < it) {
    const t = zr * zr - zi * zi + cr;
    zi = 2 * zr * zi + ci;
    zr = t;
    n++;
    r2 = zr * zr + zi * zi;
    if (r2 > 65536) break;
  }
  if (n >= it && r2 <= 65536) return -1;
  return n + 1 - Math.log(Math.log(r2) * 0.5) / Math.LN2;
}

function mandelStart(s: MS, loc: number) {
  s.loc = loc;
  s.px = 0;
  s.doneAt = -1;
  const L = M_LOCS[loc];
  const { w: bw, h: bh } = s.buf;
  // smallest escape count over a coarse sample, used to stretch the palette
  let lo = Infinity;
  for (let j = 0; j < 12; j++)
    for (let i = 0; i < 16; i++) {
      const v = mandelNu(L.cx + ((i + 0.5) / 16 - 0.5) * L.span, L.cy - ((j + 0.5) / 12 - 0.5) * L.span * (bh / bw), L.it);
      if (v >= 0 && v < lo) lo = v;
    }
  s.lo = Number.isFinite(lo) ? Math.max(0, lo - 1) : 0;
}

const mandelbrot: Anim<MS> = {
  init(w, h) {
    const scale = 2;
    const s: MS = { buf: makeBuf(Math.ceil(w / scale), Math.ceil(h / scale)), loc: 0, px: 0, lo: 0, doneAt: -1, scale };
    mandelStart(s, 0);
    return s;
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    if (s.doneAt >= 0 && t - s.doneAt > 5) mandelStart(s, (s.loc + 1) % M_LOCS.length);
    const { w: bw, h: bh, img } = s.buf;
    const L = M_LOCS[s.loc];
    const d = img.data;
    if (s.doneAt < 0) {
      let spent = 0;
      const lmin = Math.log(s.lo + 1);
      const lrange = Math.log(L.it + 1) - lmin;
      const spanY = L.span * (bh / bw);
      const total = bw * bh;
      // a pixel cursor, so one frame never overruns the budget by more than one pixel
      while (s.px < total && spent < M_BUDGET) {
        const row = Math.floor(s.px / bw);
        const i = s.px - row * bw;
        const ci = L.cy + (0.5 - (row + 0.5) / bh) * spanY;
        const cr = L.cx + ((i + 0.5) / bw - 0.5) * L.span;
        const nu = mandelNu(cr, ci, L.it);
        let c: RGB;
        if (nu < 0) {
          c = pal.inkRGB;
          spent += L.it;
        } else {
          spent += nu + 4;
          const q = clamp((Math.log(nu + 1) - lmin) / lrange, 0, 1);
          const qq = Math.pow(q, 0.85);
          c = qq < 0.6 ? mix(pal.bgRGB, pal.accentRGB, smooth(qq / 0.6)) : mix(pal.accentRGB, pal.inkRGB, (qq - 0.6) / 0.4);
        }
        const o = 4 * s.px;
        d[o] = c[0];
        d[o + 1] = c[1];
        d[o + 2] = c[2];
        d[o + 3] = 255;
        s.px++;
      }
      s.buf.g.putImageData(img, 0, 0);
      if (s.px >= total) s.doneAt = t;
    }
    clear(ctx, w, h, pal);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.buf.c, 0, 0, bw * s.scale, bh * s.scale);
    if (s.doneAt < 0) {
      ctx.strokeStyle = rgba(pal.accentRGB, 0.8);
      ctx.lineWidth = 1;
      ctx.beginPath();
      const y = Math.floor(s.px / bw) * s.scale + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const im = L.cy >= 0 ? `+ ${L.cy}` : `− ${-L.cy}`;
    const text = `${L.name} · ${L.cx} ${im}i`;
    ctx.font = MONO;
    const tw = ctx.measureText(text).width;
    ctx.fillStyle = rgba(pal.bgRGB, 0.75);
    ctx.fillRect(4, h - 20, (Number.isFinite(tw) ? tw : 0) + 8, 15);
    label(ctx, pal, text, 8, h - 9);
  },
  still: 6,
};

// ---------------------------------------------------------------------------
// 9. Tesseract
// ---------------------------------------------------------------------------

type TS = { edges: [number, number, number][]; P: Float32Array; F: Float32Array };

const tesseract: Anim<TS> = {
  init() {
    const edges: [number, number, number][] = [];
    for (let i = 0; i < 16; i++)
      for (let b = 0; b < 4; b++) {
        const j = i ^ (1 << b);
        if (i < j) edges.push([i, j, b]);
      }
    return { edges, P: new Float32Array(32), F: new Float32Array(16) };
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    clear(ctx, w, h, pal);
    const a = t * 0.42;
    const b = t * 0.27;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const cb = Math.cos(b);
    const sb = Math.sin(b);
    // fixed camera tilt so the 3-D shadow is not seen edge-on
    const tx = 0.42;
    const ty = 0.55;
    const ctx_ = Math.cos(tx);
    const stx = Math.sin(tx);
    const cty = Math.cos(ty);
    const sty = Math.sin(ty);
    const D4 = 3;
    const D3 = 3.4;
    const scale = Math.min(w, h) * 1.05;
    let fmin = Infinity;
    let fmax = -Infinity;
    for (let i = 0; i < 16; i++) {
      const x = i & 1 ? 1 : -1;
      const y = i & 2 ? 1 : -1;
      const z = i & 4 ? 1 : -1;
      const ww = i & 8 ? 1 : -1;
      // rotate in the xw- and yz-planes
      const x1 = x * ca - ww * sa;
      const w1 = x * sa + ww * ca;
      const y1 = y * cb - z * sb;
      const z1 = y * sb + z * cb;
      // 4-D → 3-D perspective
      const k4 = 1 / (D4 - w1);
      let X = x1 * k4;
      let Y = y1 * k4;
      let Z = z1 * k4;
      // camera tilt (about x, then y)
      const Y2 = Y * ctx_ - Z * stx;
      const Z2 = Y * stx + Z * ctx_;
      Y = Y2;
      Z = Z2;
      const X2 = X * cty + Z * sty;
      Z = -X * sty + Z * cty;
      X = X2;
      // 3-D → 2-D perspective
      const k3 = 1 / (D3 - Z);
      s.P[2 * i] = w / 2 + X * k3 * scale;
      s.P[2 * i + 1] = h / 2 + Y * k3 * scale;
      const f = Z + w1 * 0.35; // nearness: larger is closer
      s.F[i] = f;
      if (f < fmin) fmin = f;
      if (f > fmax) fmax = f;
    }
    const norm = (f: number) => (f - fmin) / Math.max(1e-6, fmax - fmin);
    const order = s.edges.map((e, k) => [s.F[e[0]] + s.F[e[1]], k]).sort((p, q) => p[0] - q[0]);
    ctx.lineCap = "round";
    for (const [, k] of order) {
      const [i, j, axis] = s.edges[k];
      const f = (norm(s.F[i]) + norm(s.F[j])) / 2;
      ctx.lineWidth = 0.75 + 0.75 * f;
      ctx.strokeStyle = axis === 3 ? rgba(pal.accentRGB, 0.3 + 0.65 * f) : rgba(pal.inkRGB, 0.18 + 0.7 * f);
      ctx.beginPath();
      ctx.moveTo(s.P[2 * i], s.P[2 * i + 1]);
      ctx.lineTo(s.P[2 * j], s.P[2 * j + 1]);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const f = norm(s.F[i]);
      ctx.fillStyle = rgba(pal.inkRGB, 0.3 + 0.6 * f);
      ctx.beginPath();
      ctx.arc(s.P[2 * i], s.P[2 * i + 1], 1.2 + 1.3 * f, 0, TAU);
      ctx.fill();
    }
    label(ctx, pal, "rotating in xw and yz", 8, h - 8);
  },
  still: 3,
};

// ---------------------------------------------------------------------------
// 10. Kuramoto oscillators
// ---------------------------------------------------------------------------

type KS = { th: Float64Array; om: Float64Array; hist: Float32Array; khist: Float32Array; hi: number; hn: number; acc: number; r: number; psi: number };
const K_N = 60;
const K_SIGMA = 0.5;
const K_MAX = 2.4;
const K_CYCLE = 32;
const K_HIST = 320;
const K_SAMPLE = 1 / 12;

const kOf = (t: number) => {
  const p = t % K_CYCLE;
  if (p < 20) return K_MAX * smooth((p - 2) / 16);
  if (p < 24) return K_MAX;
  return K_MAX * (1 - smooth((p - 24) / 1.5));
};

const kuramoto: Anim<KS> = {
  init(_w, _h, rand) {
    const th = new Float64Array(K_N);
    const om = new Float64Array(K_N);
    for (let i = 0; i < K_N; i++) {
      th[i] = rand() * TAU;
      om[i] = K_SIGMA * gauss(rand);
    }
    return { th, om, hist: new Float32Array(K_HIST), khist: new Float32Array(K_HIST), hi: 0, hn: 0, acc: 0, r: 0, psi: 0 };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    const K = kOf(t);
    const sub = 3;
    const hdt = dt / sub;
    for (let q = 0; q < sub; q++) {
      let sx = 0;
      let sy = 0;
      for (let i = 0; i < K_N; i++) {
        sx += Math.cos(s.th[i]);
        sy += Math.sin(s.th[i]);
      }
      s.r = Math.hypot(sx, sy) / K_N;
      s.psi = Math.atan2(sy, sx);
      // mean field form: K/N Σ sin(θj − θi) = K r sin(ψ − θi); 0.6 is a common drift
      for (let i = 0; i < K_N; i++) s.th[i] += hdt * (0.6 + s.om[i] + K * s.r * Math.sin(s.psi - s.th[i]));
    }
    s.acc += dt;
    while (s.acc >= K_SAMPLE) {
      s.acc -= K_SAMPLE;
      s.hist[s.hi] = s.r;
      s.khist[s.hi] = K / K_MAX;
      s.hi = (s.hi + 1) % K_HIST;
      s.hn = Math.min(K_HIST, s.hn + 1);
    }
    clear(ctx, w, h, pal);
    const R = Math.min(h * 0.38, w * 0.3);
    const cx = w * 0.36;
    const cy = h * 0.5;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.15);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, TAU);
    ctx.stroke();
    ctx.fillStyle = rgba(pal.inkRGB, 0.8);
    ctx.beginPath();
    for (let i = 0; i < K_N; i++) {
      const x = cx + R * Math.cos(s.th[i]);
      const y = cy - R * Math.sin(s.th[i]);
      ctx.moveTo(x + 2.3, y);
      ctx.arc(x, y, 2.3, 0, TAU);
    }
    ctx.fill();
    // order parameter
    const ex = cx + R * s.r * Math.cos(s.psi);
    const ey = cy - R * s.r * Math.sin(s.psi);
    ctx.strokeStyle = pal.accent;
    ctx.fillStyle = pal.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey, 2.6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = rgba(pal.inkRGB, 0.4);
    ctx.beginPath();
    ctx.arc(cx, cy, 1.5, 0, TAU);
    ctx.fill();
    // r(t) trace
    const bx = w * 0.7;
    const bw = w * 0.26;
    const by = h * 0.58;
    const bh = h * 0.24;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.15);
    ctx.lineWidth = 0.75;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx, by + bh);
    ctx.lineTo(bx + bw, by + bh);
    ctx.stroke();
    const trace = (arr: Float32Array) => {
      ctx.beginPath();
      for (let k = 0; k < s.hn; k++) {
        const idx = (s.hi - s.hn + k + K_HIST) % K_HIST;
        const x = bx + (bw * k) / (K_HIST - 1);
        const y = by + bh * (1 - arr[idx]);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    };
    ctx.strokeStyle = rgba(pal.inkRGB, 0.3);
    ctx.lineWidth = 0.75;
    trace(s.khist);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.25;
    trace(s.hist);
    label(ctx, pal, "r(t)", bx, by - 6);
    label(ctx, pal, `K = ${K.toFixed(2)}   r = ${s.r.toFixed(2)}`, 8, h - 8);
  },
  still: 20,
};

// ---------------------------------------------------------------------------
// 11. Random walks
// ---------------------------------------------------------------------------

type WS = { rand: () => number; xs: Float32Array[]; ys: Float32Array[]; n: number; cx: number[]; cy: number[]; tw: number; acc: number; D: number; T: number };
const W_COUNT = 7;
const W_SAMPLE = 1 / 30;
const W_T = 22;

function walksReset(s: WS) {
  s.n = 1;
  s.tw = 0;
  s.acc = 0;
  for (let k = 0; k < W_COUNT; k++) {
    s.cx[k] = 0;
    s.cy[k] = 0;
    s.xs[k][0] = 0;
    s.ys[k][0] = 0;
  }
}

const walks: Anim<WS> = {
  init(w, h, rand) {
    const cap = Math.ceil(W_T / W_SAMPLE) + 4;
    const Rm = Math.min(w, h) * 0.4;
    const s: WS = {
      rand,
      xs: Array.from({ length: W_COUNT }, () => new Float32Array(cap)),
      ys: Array.from({ length: W_COUNT }, () => new Float32Array(cap)),
      n: 1,
      cx: new Array(W_COUNT).fill(0),
      cy: new Array(W_COUNT).fill(0),
      tw: 0,
      acc: 0,
      D: (Rm * Rm) / (4 * W_T), // rms radius reaches Rm at time T
      T: W_T,
    };
    walksReset(s);
    return s;
  },
  frame(ctx, s, _t, dt, w, h, pal) {
    if (s.tw > s.T + 1.5) walksReset(s);
    const running = s.tw < s.T;
    s.tw += dt;
    if (running) {
      const sd = Math.sqrt(2 * s.D * dt); // per coordinate variance 2D dt
      for (let k = 0; k < W_COUNT; k++) {
        s.cx[k] += sd * gauss(s.rand);
        s.cy[k] += sd * gauss(s.rand);
      }
      s.acc += dt;
      while (s.acc >= W_SAMPLE && s.n < s.xs[0].length) {
        s.acc -= W_SAMPLE;
        for (let k = 0; k < W_COUNT; k++) {
          s.xs[k][s.n] = s.cx[k];
          s.ys[k][s.n] = s.cy[k];
        }
        s.n++;
      }
    }
    clear(ctx, w, h, pal);
    const ox = w / 2;
    const oy = h / 2;
    const fade = s.tw > s.T + 0.5 ? 1 - smooth(s.tw - s.T - 0.5) : 1;
    ctx.globalAlpha = fade;
    // √t envelope
    const tt = Math.min(s.tw, s.T);
    const rr = Math.sqrt(4 * s.D * tt);
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = rgba(pal.accentRGB, 0.75);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, rr, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    // trails, in chunks of rising opacity
    const CH = 24;
    ctx.lineJoin = "round";
    ctx.lineWidth = 1;
    for (let k = 0; k < W_COUNT; k++) {
      const col = k === 0 ? pal.warmRGB : pal.inkRGB;
      const xs = s.xs[k];
      const ys = s.ys[k];
      for (let a = 0; a < s.n - 1; a += CH) {
        const b = Math.min(s.n - 1, a + CH);
        const age = (s.n - 1 - b) * W_SAMPLE;
        ctx.strokeStyle = rgba(col, 0.08 + 0.72 * Math.exp(-age / 4));
        ctx.beginPath();
        ctx.moveTo(ox + xs[a], oy + ys[a]);
        for (let i = a + 1; i <= b; i++) ctx.lineTo(ox + xs[i], oy + ys[i]);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(col, 0.8);
      ctx.beginPath();
      ctx.moveTo(ox + xs[s.n - 1], oy + ys[s.n - 1]);
      ctx.lineTo(ox + s.cx[k], oy + s.cy[k]);
      ctx.stroke();
      ctx.fillStyle = k === 0 ? pal.warm : pal.ink;
      ctx.beginPath();
      ctx.arc(ox + s.cx[k], oy + s.cy[k], 2, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = rgba(pal.inkRGB, 0.5);
    ctx.beginPath();
    ctx.arc(ox, oy, 1.5, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
    label(ctx, pal, `t = ${tt.toFixed(1)}   radius √(4Dt)`, 8, h - 8);
  },
  still: 10,
};

// ---------------------------------------------------------------------------
// 12. Sorting
// ---------------------------------------------------------------------------

type Step = { cmp?: [number, number]; swap?: [number, number]; pivot?: number; lo: number; hi: number };

function* quicksort(a: number[], fixed: Uint8Array): Generator<Step, void, unknown> {
  const stack: number[] = [0, a.length - 1];
  while (stack.length) {
    const hi = stack.pop()!;
    const lo = stack.pop()!;
    if (lo > hi) continue;
    if (lo === hi) {
      fixed[lo] = 1;
      continue;
    }
    const pv = a[hi];
    let i = lo;
    for (let j = lo; j < hi; j++) {
      yield { cmp: [j, hi], pivot: hi, lo, hi };
      if (a[j] < pv) {
        if (i !== j) {
          [a[i], a[j]] = [a[j], a[i]];
          yield { swap: [i, j], pivot: hi, lo, hi };
        }
        i++;
      }
    }
    if (i !== hi) {
      [a[i], a[hi]] = [a[hi], a[i]];
      yield { swap: [i, hi], pivot: i, lo, hi };
    }
    fixed[i] = 1;
    stack.push(i + 1, hi, lo, i - 1);
  }
}

type SS = {
  rand: () => number;
  a: number[];
  fixed: Uint8Array;
  gen: Generator<Step, void, unknown>;
  step: Step | null;
  acc: number;
  cmps: number;
  swaps: number;
  doneAt: number;
};

function sortShuffle(s: SS) {
  const a = s.a;
  for (let i = 0; i < a.length; i++) a[i] = i + 1;
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(s.rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  s.fixed.fill(0);
  s.gen = quicksort(a, s.fixed);
  s.step = null;
  s.cmps = 0;
  s.swaps = 0;
  s.doneAt = -1;
}

const sorting: Anim<SS> = {
  init(w, _h, rand) {
    const n = clamp(Math.floor(w / 9), 24, 64);
    const fixed = new Uint8Array(n);
    const a = new Array<number>(n).fill(0);
    const s: SS = { rand, a, fixed, gen: quicksort(a, fixed), step: null, acc: 0, cmps: 0, swaps: 0, doneAt: -1 };
    sortShuffle(s);
    return s;
  },
  frame(ctx, s, t, dt, w, h, pal) {
    if (s.doneAt >= 0 && t - s.doneAt > 3) sortShuffle(s);
    if (s.doneAt < 0) {
      s.acc += dt * 32;
      while (s.acc >= 1) {
        s.acc -= 1;
        const r = s.gen.next();
        if (r.done) {
          s.step = null;
          s.fixed.fill(1);
          s.doneAt = t;
          break;
        }
        s.step = r.value;
        if (r.value.cmp) s.cmps++;
        if (r.value.swap) s.swaps++;
      }
    }
    clear(ctx, w, h, pal);
    const n = s.a.length;
    const mx = 12;
    const bw = (w - 2 * mx) / n;
    const base = h - 24;
    const top = 14;
    const st = s.step;
    const sweep = s.doneAt >= 0 ? (t - s.doneAt) / 1.2 : -1;
    for (let i = 0; i < n; i++) {
      const bh = ((base - top) * s.a[i]) / n;
      let col: string;
      if (st && st.cmp && (st.cmp[0] === i || st.cmp[1] === i) && i !== st.pivot) col = pal.accent;
      else if (st && st.swap && (st.swap[0] === i || st.swap[1] === i)) col = pal.accent;
      else if (st && st.pivot === i) col = pal.warm;
      else if (sweep >= 0 && i / n < sweep && sweep < 1.6) col = rgba(pal.accentRGB, 0.6);
      else if (s.fixed[i]) col = rgba(pal.inkRGB, 0.75);
      else col = rgba(pal.inkRGB, 0.3);
      ctx.fillStyle = col;
      ctx.fillRect(mx + i * bw + bw * 0.15, base - bh, bw * 0.7, bh);
    }
    if (st) {
      ctx.strokeStyle = rgba(pal.inkRGB, 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mx + st.lo * bw + bw * 0.15, base + 4);
      ctx.lineTo(mx + (st.hi + 1) * bw - bw * 0.15, base + 4);
      ctx.stroke();
    }
    label(ctx, pal, `quicksort · n = ${n} · ${s.cmps} comparisons · ${s.swaps} swaps`, 8, h - 6);
  },
  still: 6,
};

// ---------------------------------------------------------------------------
// 13. Spirograph
// ---------------------------------------------------------------------------

const SPIRO: [number, number, number][] = [
  [5, 3, 4],
  [7, 2, 2.6],
  [8, 5, 3],
  [9, 4, 5.5],
  [11, 6, 4],
];
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

type SpS = { idx: number; t0: number; pts: number[]; th: number };
const SP_STEP = 0.02;

function spiroInfo(idx: number) {
  const [R, r, d] = SPIRO[idx];
  const turns = r / gcd(R, r);
  const dur = clamp(4 * turns, 8, 20);
  return { R, r, d, turns, dur, total: turns * TAU };
}

const spirograph: Anim<SpS> = {
  init(_w, _h, rand) {
    return { idx: Math.floor(rand() * SPIRO.length), t0: 0, pts: [], th: 0 };
  },
  frame(ctx, s, t, _dt, w, h, pal) {
    let info = spiroInfo(s.idx);
    if (t - s.t0 > info.dur + 3) {
      s.idx = (s.idx + 1) % SPIRO.length;
      s.t0 = t;
      s.pts = [];
      s.th = 0;
      info = spiroInfo(s.idx);
    }
    const { R, r, d, dur, total } = info;
    const u = t - s.t0;
    const target = clamp(u / dur, 0, 1) * total;
    const k = (R - r) / r;
    const pen = (th: number): [number, number] => [(R - r) * Math.cos(th) + d * Math.cos(k * th), (R - r) * Math.sin(th) - d * Math.sin(k * th)];
    // append points up to the target angle (bounded per frame)
    let guard = 0;
    while (s.th <= target && guard++ < 4000) {
      const [x, y] = pen(s.th);
      s.pts.push(x, y);
      s.th += SP_STEP;
    }
    clear(ctx, w, h, pal);
    const sc = (Math.min(w, h) * 0.45) / Math.max(R, R - r + d);
    const ox = w / 2;
    const oy = h / 2;
    const fade = u > dur + 2 ? 1 - smooth(u - dur - 2) : 1;
    ctx.globalAlpha = fade;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.14);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ox, oy, R * sc, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = rgba(pal.inkRGB, 0.8);
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let i = 0; i < s.pts.length; i += 2) {
      const x = ox + s.pts[i] * sc;
      const y = oy - s.pts[i + 1] * sc;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    const th = Math.min(target, total);
    const [px, py] = pen(th);
    if (s.pts.length) ctx.lineTo(ox + px * sc, oy - py * sc);
    ctx.stroke();
    if (u <= dur + 0.3) {
      const rx = ox + (R - r) * Math.cos(th) * sc;
      const ry = oy - (R - r) * Math.sin(th) * sc;
      ctx.strokeStyle = rgba(pal.inkRGB, 0.35);
      ctx.beginPath();
      ctx.arc(rx, ry, r * sc, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(ox + px * sc, oy - py * sc);
      ctx.stroke();
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(ox + px * sc, oy - py * sc, 2.2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = rgba(pal.inkRGB, 0.5);
      ctx.beginPath();
      ctx.arc(rx, ry, 1.3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    label(ctx, pal, `R = ${R}  r = ${r}  d = ${d}`, 8, h - 8);
  },
  still: 30,
};

// ---------------------------------------------------------------------------

export const ENTRIES_B: Entry[] = [
  {
    id: "lsystem",
    title: "L-system plant",
    tag: "life",
    blurb:
      "A short string is rewritten in parallel a few times by fixed rules, then read by a turtle: F draws a segment, + and − turn by a fixed angle, and brackets save and restore the turtle's position. The plant is drawn in the order the turtle reads the string, with a small bend added at every segment so it sways. Each regrowth picks one of a few rule sets and jitters the angles.",
    formula: "X \\to F{+}[[X]{-}X]{-}F[{-}FX]{+}X,\\quad F \\to FF",
    anim: lsystem,
    seed: 201,
  },
  {
    id: "hilbert",
    title: "Hilbert curve",
    tag: "geometry",
    blurb:
      "The order-k Hilbert curve visits every cell of a 2ᵏ × 2ᵏ grid once, stepping only between neighbouring cells. Passing to order k + 1 replaces each cell by four, visited by a rotated or reflected copy of the basic U, so each point splits into four. The curves converge uniformly to a continuous map from [0, 1] onto the square.",
    formula: "4^k \\text{ cells},\\quad \\text{step length } 2^{-k}",
    anim: hilbert,
    seed: 202,
  },
  {
    id: "dla",
    title: "Diffusion-limited aggregation",
    tag: "physics",
    blurb:
      "Walkers are released on a circle just outside the cluster and step at random on a grid; one that lands next to the cluster sticks there. Tips catch walkers far more often than the deep gaps between branches, so the cluster grows thin and branching, with fractal dimension near 1.71 in simulations. Colour runs from ink to teal with the time of arrival.",
    formula: "M(r) \\propto r^{D},\\quad D \\approx 1.71",
    anim: dla,
    seed: 203,
  },
  {
    id: "penrose",
    title: "Penrose tiling",
    tag: "tiling",
    blurb:
      "Two kinds of Robinson triangle, each split into two or three smaller triangles of the same two kinds, scaled down by the golden ratio. Starting from a wheel of ten, each generation deflates the last; pairs of triangles sharing a base make the thin and thick rhombs of Penrose's P3 tiling, which is never periodic.",
    formula: "\\text{side} \\mapsto \\text{side}/\\varphi,\\quad \\varphi = \\tfrac{1+\\sqrt5}{2}",
    anim: penrose,
    seed: 204,
  },
  {
    id: "ridges",
    title: "Ridge lines",
    tag: "signal",
    blurb:
      "Each line is a slice through slowly drifting smooth noise, raised most near the middle by a Gaussian envelope, and the lines are stacked from back to front. Every line is filled with the background beneath before it is stroked, so nearer ridges hide the ones behind. The arrangement echoes the cover of Unknown Pleasures, which plotted successive pulses of the pulsar CP 1919.",
    formula: "y_i(x) = y_i^0 - A\\,e^{-(x-\\frac12)^2/2s^2}\\,f(x,\\ i + vt)",
    anim: ridges,
    aspect: 0.42,
    wide: true,
    seed: 205,
  },
  {
    id: "galton",
    title: "Galton board",
    tag: "number",
    blurb:
      "Each ball meets twelve rows of pegs and goes left or right with probability ½ at each, so its bin is the number of rightward bounces, a Binomial(12, ½) count. The small warm ticks mark the exact expected heights; the teal curve is the normal approximation with mean 6 and variance 3, scaled to the number of balls so far.",
    formula: "P(k) = \\binom{12}{k}2^{-12} \\approx \\tfrac{1}{\\sqrt{6\\pi}}\\,e^{-(k-6)^2/6}",
    anim: galton,
    seed: 206,
  },
  {
    id: "buffon",
    title: "Buffon's needle",
    tag: "number",
    blurb:
      "Needles of length L are dropped at uniformly random positions and angles onto a floor ruled with lines t apart, with L ≤ t. A needle crosses a line with probability 2L/(πt), so the fraction of crossings (teal) estimates π. The estimate converges slowly: its error shrinks like 1/√n.",
    formula: "P(\\text{cross}) = \\frac{2L}{\\pi t} \\quad\\Rightarrow\\quad \\pi \\approx \\frac{2Ln}{t\\,h}",
    anim: buffon,
    seed: 207,
  },
  {
    id: "mandelbrot",
    title: "Mandelbrot set",
    tag: "number",
    blurb:
      "A point c is in the Mandelbrot set when the orbit of 0 under z ↦ z² + c stays bounded; points whose orbit has not escaped after a few hundred steps are drawn as inside. Outside points are shaded by a smoothed count of the steps taken to escape a large disc. The image is computed a band of rows at a time, then the view moves on, to Seahorse Valley and other classic regions.",
    formula: "z_{n+1} = z_n^2 + c,\\ z_0 = 0;\\qquad \\nu = n + 1 - \\log_2 \\log |z_n|",
    anim: mandelbrot,
    seed: 208,
  },
  {
    id: "tesseract",
    title: "Tesseract",
    tag: "geometry",
    blurb:
      "The sixteen vertices (±1, ±1, ±1, ±1) and thirty-two edges of the 4-cube, turning at once in the xw- and yz-planes. Points are projected in perspective from four dimensions to three, then to the screen; nearer edges are drawn stronger, and edges parallel to the w-axis are teal.",
    formula: "(x, y, z, w) \\mapsto \\frac{(x, y, z)}{d - w}",
    anim: tesseract,
    seed: 209,
  },
  {
    id: "kuramoto",
    title: "Kuramoto oscillators",
    tag: "chaos",
    blurb:
      "Sixty phase oscillators with normally distributed natural frequencies, each pulled toward the others with strength K. As K rises past a critical value the phases lock into a common rhythm; the teal arrow is the order parameter r e^{iψ}, the mean of the unit phasors, and the trace shows r (teal) against K (grey). Then K drops to zero and they drift apart.",
    formula: "\\dot\\theta_i = \\omega_i + \\frac{K}{N}\\sum_j \\sin(\\theta_j-\\theta_i),\\quad re^{i\\psi} = \\frac1N\\sum_j e^{i\\theta_j}",
    anim: kuramoto,
    seed: 210,
  },
  {
    id: "walks",
    title: "Brownian paths",
    tag: "physics",
    blurb:
      "Seven independent Brownian paths start at the centre; each step adds a Gaussian increment whose variance is proportional to the time step. The spread grows like √t, not t: the dashed teal circle has radius √(4Dt), the root-mean-square distance from the start in two dimensions.",
    formula: "\\mathbb{E}\\,|X_t|^2 = 4Dt",
    anim: walks,
    seed: 211,
  },
  {
    id: "sorting",
    title: "Quicksort",
    tag: "number",
    blurb:
      "Quicksort with the last element of each range as pivot (warm): every other element of the range is compared with it (teal), smaller ones are swapped to the left, and the pivot lands in its final place before the two sides are sorted the same way. On a random permutation it makes about 2n ln n comparisons on average.",
    formula: "\\mathbb{E}[C_n] \\sim 2n\\ln n",
    anim: sorting,
    seed: 212,
  },
  {
    id: "spirograph",
    title: "Spirograph",
    tag: "geometry",
    blurb:
      "A circle of radius r rolls without slipping inside a fixed circle of radius R, and a pen at distance d from its centre traces a hypotrochoid. With integer radii the curve closes once the rolling circle's centre has gone round r / gcd(R, r) times.",
    formula: "x = (R-r)\\cos\\theta + d\\cos\\tfrac{R-r}{r}\\theta,\\quad y = (R-r)\\sin\\theta - d\\sin\\tfrac{R-r}{r}\\theta",
    anim: spirograph,
    seed: 213,
  },
];
