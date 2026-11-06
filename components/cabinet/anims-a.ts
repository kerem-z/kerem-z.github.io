// The first half of the cabinet: thirteen small animations. Each is an
// `Anim` (see frame.tsx); state lives in the object returned by `init`.
import type { Anim, Entry, Pal } from "./frame";

const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const TAU = Math.PI * 2;
const MONO = "10px ui-monospace, SFMono-Regular, Menlo, monospace";

function clear(ctx: CanvasRenderingContext2D, pal: Pal, w: number, h: number, alpha = 1) {
  ctx.fillStyle = rgba(pal.bgRGB, alpha);
  ctx.fillRect(0, 0, w, h);
}

function label(ctx: CanvasRenderingContext2D, pal: Pal, text: string, x: number, y: number) {
  ctx.font = MONO;
  ctx.fillStyle = pal.faint;
  ctx.fillText(text, x, y);
}

/** An offscreen canvas of gw × gh pixels for ImageData work, drawn scaled. */
function raster(gw: number, gh: number) {
  const c = document.createElement("canvas");
  c.width = gw;
  c.height = gh;
  const ctx = c.getContext("2d")!;
  return { c, ctx, img: ctx.createImageData(gw, gh) };
}

/** Smooth 3-D value noise in roughly [−1, 1]. */
function makeNoise(rand: () => number) {
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    perm[i] = i;
    vals[i] = rand() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const fade = (t: number) => t * t * (3 - 2 * t);
  const v = (x: number, y: number, z: number) => vals[perm[(perm[(perm[x & 255] + y) & 255] + z) & 255]];
  return (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(l(v(xi, yi, zi), v(xi + 1, yi, zi), xf), l(v(xi, yi + 1, zi), v(xi + 1, yi + 1, zi), xf), yf),
      l(l(v(xi, yi, zi + 1), v(xi + 1, yi, zi + 1), xf), l(v(xi, yi + 1, zi + 1), v(xi + 1, yi + 1, zi + 1), xf), yf),
      zf,
    );
  };
}

// ---------------------------------------------------------------------------

const phyllotaxis: Anim<{ born: number }> = {
  init: () => ({ born: 0 }),
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h);
    const R = Math.min(w, h) * 0.46;
    const N = 900;
    const c = R / Math.sqrt(N);
    const cycle = 22;
    const local = t % cycle;
    s.born = Math.min(N, Math.floor(local * 70));
    const fadeOut = local > cycle - 2 ? (cycle - local) / 2 : 1;
    const golden = Math.PI * (3 - Math.sqrt(5)); // 137.507…°
    const spin = t * 0.04;
    for (let n = 0; n < s.born; n++) {
      const r = c * Math.sqrt(n);
      const th = n * golden + spin;
      const x = w / 2 + r * Math.cos(th);
      const y = h / 2 + r * Math.sin(th);
      const age = Math.min(1, (s.born - n) / 40);
      const col = n % 21 === 0 ? pal.warmRGB : n % 13 === 0 ? pal.accentRGB : pal.inkRGB;
      ctx.fillStyle = rgba(col, (n % 13 === 0 || n % 21 === 0 ? 0.95 : 0.55) * age * fadeOut);
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + 2.2 * Math.sqrt(n / N), 0, TAU);
      ctx.fill();
    }
    label(ctx, pal, `n = ${s.born} · θ = n × 137.508°`, 10, h - 10);
  },
  still: 15,
};

// ---------------------------------------------------------------------------

type Lorenz = { p: number[][]; trail: number[][][] };
const lorenzD = (v: number[]) => [10 * (v[1] - v[0]), v[0] * (28 - v[2]) - v[1], v[0] * v[1] - (8 / 3) * v[2]];
function rk4(v: number[], h: number, f: (v: number[]) => number[]) {
  const k1 = f(v);
  const k2 = f(v.map((x, i) => x + (h / 2) * k1[i]));
  const k3 = f(v.map((x, i) => x + (h / 2) * k2[i]));
  const k4 = f(v.map((x, i) => x + h * k3[i]));
  return v.map((x, i) => x + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

const lorenz: Anim<Lorenz> = {
  init: () => ({ p: [[1, 1, 20], [1 + 1e-5, 1, 20]], trail: [[], []] }),
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h);
    for (let k = 0; k < 6; k++) {
      s.p = s.p.map((v) => rk4(v, 0.004, lorenzD));
      s.p.forEach((v, i) => {
        s.trail[i].push(v);
        if (s.trail[i].length > 2400) s.trail[i].shift();
      });
    }
    const phi = t * 0.15;
    const sc = Math.min(w, h) / 62;
    const P = (v: number[]) => {
      const x = v[0] * Math.cos(phi) - v[1] * Math.sin(phi);
      return [w / 2 + x * sc, h / 2 + 4 * sc - (v[2] - 25) * sc * 0.95];
    };
    const cols = [pal.inkRGB, pal.accentRGB];
    s.trail.forEach((tr, i) => {
      ctx.lineWidth = 0.9;
      // in chunks, older chunks fainter
      const CH = 40;
      for (let j0 = 1; j0 < tr.length; j0 += CH) {
        const a = j0 / tr.length;
        ctx.strokeStyle = rgba(cols[i], 0.06 + 0.7 * a * a);
        ctx.beginPath();
        const [x0, y0] = P(tr[j0 - 1]);
        ctx.moveTo(x0, y0);
        for (let j = j0; j < Math.min(tr.length, j0 + CH); j++) {
          const [x, y] = P(tr[j]);
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      const [hx, hy] = P(s.p[i]);
      ctx.fillStyle = rgba(cols[i], 1);
      ctx.beginPath();
      ctx.arc(hx, hy, 2.5, 0, TAU);
      ctx.fill();
    });
    const d = Math.hypot(s.p[0][0] - s.p[1][0], s.p[0][1] - s.p[1][1], s.p[0][2] - s.p[1][2]);
    label(ctx, pal, `two starts 10⁻⁵ apart · now ${d < 0.01 ? d.toExponential(1) : d.toFixed(1)} apart`, 10, h - 10);
  },
  still: 30,
};

// ---------------------------------------------------------------------------

const CLIFFORD = [
  [-1.4, 1.6, 1.0, 0.7],
  [1.7, 1.7, 0.6, 1.2],
  [-1.7, 1.3, -0.1, -1.2],
  [-1.8, -2.0, -0.5, -0.9],
];
type Cliff = { dens: Float32Array; x: number; y: number; k: number; t0: number; r: ReturnType<typeof raster> | null; gw: number; gh: number; n: number };

const clifford: Anim<Cliff> = {
  init: (w, h) => {
    // half resolution; the image is scaled up smoothly
    const gw = Math.round(w / 2);
    const gh = Math.round(h / 2);
    return { dens: new Float32Array(gw * gh), x: 0.1, y: 0.1, k: 0, t0: 0, r: null, gw, gh, n: 0 };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    if (!s.r) s.r = raster(s.gw, s.gh);
    if (t - s.t0 > 12) {
      s.k = (s.k + 1) % CLIFFORD.length;
      s.t0 = t;
      s.dens.fill(0);
    }
    const [a, b, c, d] = CLIFFORD[s.k];
    const sc = Math.min(s.gw, s.gh) / 4.6;
    for (let i = 0; i < 12000; i++) {
      const nx = Math.sin(a * s.y) + c * Math.cos(a * s.x);
      const ny = Math.sin(b * s.x) + d * Math.cos(b * s.y);
      s.x = nx;
      s.y = ny;
      const px = Math.floor(s.gw / 2 + nx * sc);
      const py = Math.floor(s.gh / 2 + ny * sc);
      if (px >= 0 && py >= 0 && px < s.gw && py < s.gh) s.dens[py * s.gw + px]++;
    }
    // redraw the image every third frame only
    if (s.n++ % 3 !== 0) return;
    let mx = 1;
    for (let i = 0; i < s.dens.length; i++) if (s.dens[i] > mx) mx = s.dens[i];
    const lm = Math.log(1 + mx);
    const data = s.r.img.data;
    const [br, bg, bb] = pal.bgRGB;
    const [ir, ig, ib] = pal.inkRGB;
    const [ar, ag, ab] = pal.accentRGB;
    for (let i = 0; i < s.dens.length; i++) {
      const v = Math.log(1 + s.dens[i]) / lm;
      const u = Math.pow(v, 0.8);
      // bg → accent → ink
      const m1 = Math.min(1, u * 1.6);
      const m2 = Math.max(0, u * 1.6 - 0.6);
      data[4 * i] = br + (ar - br) * m1 + (ir - ar) * m2;
      data[4 * i + 1] = bg + (ag - bg) * m1 + (ig - ag) * m2;
      data[4 * i + 2] = bb + (ab - bb) * m1 + (ib - ab) * m2;
      data[4 * i + 3] = 255;
    }
    s.r.ctx.putImageData(s.r.img, 0, 0);
    ctx.drawImage(s.r.c, 0, 0, w, h);
    label(ctx, pal, `a ${a}  b ${b}  c ${c}  d ${d}`, 10, h - 10);
  },
  still: 6,
};

// ---------------------------------------------------------------------------

type Flow = { noise: (x: number, y: number, z: number) => number; ps: { x: number; y: number; life: number }[]; rand: () => number };

const flow: Anim<Flow> = {
  init: (w, h, rand) => ({
    noise: makeNoise(rand),
    rand,
    ps: Array.from({ length: 700 }, () => ({ x: rand() * w, y: rand() * h, life: rand() * 200 })),
  }),
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h, 0.035);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.35);
    ctx.beginPath();
    const z = t * 0.06;
    for (const p of s.ps) {
      const a = s.noise(p.x * 0.004, p.y * 0.004, z) * TAU * 1.5;
      const nx = p.x + Math.cos(a) * 1.1;
      const ny = p.y + Math.sin(a) * 1.1;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(nx, ny);
      p.x = nx;
      p.y = ny;
      if (--p.life < 0 || nx < 0 || ny < 0 || nx > w || ny > h) {
        p.x = s.rand() * w;
        p.y = s.rand() * h;
        p.life = 100 + s.rand() * 200;
      }
    }
    ctx.stroke();
  },
  still: 12,
};

// ---------------------------------------------------------------------------

type Truchet = { cols: number; rows: number; size: number; ori: Uint8Array; turn: Float32Array; next: number; rand: () => number };

const truchet: Anim<Truchet> = {
  init: (w, h, rand) => {
    const size = Math.max(28, Math.round(Math.min(w, h) / 9));
    const cols = Math.ceil(w / size);
    const rows = Math.ceil(h / size);
    return {
      cols,
      rows,
      size,
      ori: Uint8Array.from({ length: cols * rows }, () => (rand() < 0.5 ? 1 : 0)),
      turn: new Float32Array(cols * rows),
      next: 0,
      rand,
    };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h);
    if (t > s.next) {
      for (let k = 0; k < 3; k++) {
        const i = Math.floor(s.rand() * s.ori.length);
        if (s.turn[i] === 0) s.turn[i] = 1e-6;
      }
      s.next = t + 0.12;
    }
    const z = s.size;
    for (let j = 0; j < s.rows; j++) {
      for (let i = 0; i < s.cols; i++) {
        const k = j * s.cols + i;
        let rot = 0;
        if (s.turn[k] > 0) {
          s.turn[k] += dt / 0.7;
          if (s.turn[k] >= 1) {
            s.turn[k] = 0;
            s.ori[k] ^= 1;
          } else {
            const e = s.turn[k];
            rot = (e * e * (3 - 2 * e) * Math.PI) / 2;
          }
        }
        ctx.save();
        ctx.translate(i * z + z / 2, j * z + z / 2);
        ctx.rotate(rot + (s.ori[k] ? Math.PI / 2 : 0));
        ctx.strokeStyle = s.turn[k] > 0 ? pal.accent : rgba(pal.inkRGB, 0.8);
        ctx.lineWidth = s.turn[k] > 0 ? 2 : 1.25;
        ctx.beginPath();
        ctx.arc(-z / 2, -z / 2, z / 2, 0, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(z / 2, z / 2, z / 2, Math.PI, (3 * Math.PI) / 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  },
  still: 3,
};

// ---------------------------------------------------------------------------

const GS_PRESETS = [
  { f: 0.0545, k: 0.062, name: "coral" },
  { f: 0.0367, k: 0.0649, name: "mitosis" },
  { f: 0.029, k: 0.057, name: "maze" },
];
type GS = { gw: number; gh: number; A: Float32Array; B: Float32Array; A2: Float32Array; B2: Float32Array; r: ReturnType<typeof raster> | null; k: number; t0: number; rand: () => number };

function seedGS(s: GS) {
  s.A.fill(1);
  s.B.fill(0);
  for (let n = 0; n < 14; n++) {
    const cx = Math.floor(s.rand() * (s.gw - 10)) + 5;
    const cy = Math.floor(s.rand() * (s.gh - 10)) + 5;
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) s.B[(cy + y) * s.gw + cx + x] = 1;
  }
}

const grayScott: Anim<GS> = {
  init: (w, h, rand) => {
    const gw = 144;
    const gh = Math.round((144 * h) / w);
    const s: GS = {
      gw,
      gh,
      A: new Float32Array(gw * gh),
      B: new Float32Array(gw * gh),
      A2: new Float32Array(gw * gh),
      B2: new Float32Array(gw * gh),
      r: null,
      k: 0,
      t0: 0,
      rand,
    };
    seedGS(s);
    return s;
  },
  frame(ctx, s, t, dt, w, h, pal) {
    if (!s.r) s.r = raster(s.gw, s.gh);
    if (t - s.t0 > 35) {
      s.k = (s.k + 1) % GS_PRESETS.length;
      s.t0 = t;
      seedGS(s);
    }
    const { f, k } = GS_PRESETS[s.k];
    const { gw, gh } = s;
    for (let it = 0; it < 12; it++) {
      const { A, B, A2, B2 } = s;
      for (let y = 0; y < gh; y++) {
        const ym = ((y - 1 + gh) % gh) * gw, y0 = y * gw, yp = ((y + 1) % gh) * gw;
        for (let x = 0; x < gw; x++) {
          const xm = (x - 1 + gw) % gw, xp = (x + 1) % gw;
          const i = y0 + x;
          const lapA =
            0.2 * (A[y0 + xm] + A[y0 + xp] + A[ym + x] + A[yp + x]) +
            0.05 * (A[ym + xm] + A[ym + xp] + A[yp + xm] + A[yp + xp]) -
            A[i];
          const lapB =
            0.2 * (B[y0 + xm] + B[y0 + xp] + B[ym + x] + B[yp + x]) +
            0.05 * (B[ym + xm] + B[ym + xp] + B[yp + xm] + B[yp + xp]) -
            B[i];
          const abb = A[i] * B[i] * B[i];
          A2[i] = A[i] + (1.0 * lapA - abb + f * (1 - A[i]));
          B2[i] = B[i] + (0.5 * lapB + abb - (k + f) * B[i]);
        }
      }
      [s.A, s.A2] = [s.A2, s.A];
      [s.B, s.B2] = [s.B2, s.B];
    }
    const data = s.r.img.data;
    const [br, bg, bb] = pal.bgRGB;
    const [ir, ig, ib] = pal.accentRGB;
    for (let i = 0; i < gw * gh; i++) {
      const v = Math.max(0, Math.min(1, (s.A[i] - s.B[i] - 0.1) * 1.4));
      const u = 1 - v;
      data[4 * i] = br + (ir - br) * u;
      data[4 * i + 1] = bg + (ig - bg) * u;
      data[4 * i + 2] = bb + (ib - bb) * u;
      data[4 * i + 3] = 255;
    }
    s.r.ctx.putImageData(s.r.img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.r.c, 0, 0, w, h);
    label(ctx, pal, `F = ${f}  k = ${k}  (${GS_PRESETS[s.k].name})`, 10, h - 10);
  },
  still: 20,
};

// ---------------------------------------------------------------------------

type Life = { cols: number; rows: number; size: number; cur: Uint8Array; nxt: Uint8Array; ghost: Float32Array; next: number; gen: number; hist: number[]; rand: () => number };

function seedLife(s: Life) {
  for (let i = 0; i < s.cur.length; i++) s.cur[i] = s.rand() < 0.28 ? 1 : 0;
  s.gen = 0;
  s.hist = [];
}

const life: Anim<Life> = {
  init: (w, h, rand) => {
    const size = Math.max(5, Math.round(w / 90));
    const cols = Math.floor(w / size);
    const rows = Math.floor(h / size);
    const s: Life = { cols, rows, size, cur: new Uint8Array(cols * rows), nxt: new Uint8Array(cols * rows), ghost: new Float32Array(cols * rows), next: 0, gen: 0, hist: [], rand };
    seedLife(s);
    return s;
  },
  frame(ctx, s, t, dt, w, h, pal) {
    if (t > s.next) {
      s.next = t + 0.09;
      const { cols, rows, cur, nxt } = s;
      let pop = 0;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          let n = 0;
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) if (dx || dy) n += cur[((y + dy + rows) % rows) * cols + ((x + dx + cols) % cols)];
          const i = y * cols + x;
          nxt[i] = n === 3 || (n === 2 && cur[i]) ? 1 : 0;
          if (cur[i] && !nxt[i]) s.ghost[i] = 1;
          pop += nxt[i];
        }
      }
      [s.cur, s.nxt] = [s.nxt, s.cur];
      s.gen++;
      s.hist.push(pop);
      // settled into still lifes and blinkers: start over
      const H = s.hist;
      if (s.gen > 900 || (H.length > 40 && Math.abs(H[H.length - 1] - H[H.length - 31]) < 3 && Math.abs(H[H.length - 2] - H[H.length - 32]) < 3 && s.gen > 300)) seedLife(s);
    }
    clear(ctx, pal, w, h);
    const z = s.size;
    for (let i = 0; i < s.cur.length; i++) {
      const x = (i % s.cols) * z;
      const y = Math.floor(i / s.cols) * z;
      if (s.cur[i]) {
        ctx.fillStyle = rgba(pal.inkRGB, 0.85);
        ctx.fillRect(x + 0.5, y + 0.5, z - 1, z - 1);
      } else if (s.ghost[i] > 0.02) {
        ctx.fillStyle = rgba(pal.accentRGB, 0.35 * s.ghost[i]);
        ctx.fillRect(x + 0.5, y + 0.5, z - 1, z - 1);
        s.ghost[i] *= Math.pow(0.15, dt);
      }
    }
    label(ctx, pal, `generation ${s.gen}`, 10, h - 10);
  },
  still: 8,
};

// ---------------------------------------------------------------------------

type Epi = { coef: { f: number; re: number; im: number; amp: number }[]; trace: [number, number][]; lastLoop: number };
const EPI_K = [3, 7, 15, 31, 63];

function starPath(M: number): [number, number][] {
  // a five-pointed star, traced edge by edge (corners need many terms)
  const pts: [number, number][] = [];
  const corners = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 1 : 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
  });
  for (let i = 0; i < M; i++) {
    const u = (i / M) * 10;
    const k = Math.floor(u);
    const f = u - k;
    const a = corners[k];
    const b = corners[(k + 1) % 10];
    pts.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return pts;
}

const epicycles: Anim<Epi> = {
  init: () => {
    const M = 256;
    const pts = starPath(M);
    const coef = [];
    for (let f = -M / 2; f < M / 2; f++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < M; n++) {
        const th = (-TAU * f * n) / M;
        re += pts[n][0] * Math.cos(th) - pts[n][1] * Math.sin(th);
        im += pts[n][0] * Math.sin(th) + pts[n][1] * Math.cos(th);
      }
      coef.push({ f, re: re / M, im: im / M, amp: Math.hypot(re, im) / M });
    }
    coef.sort((a, b) => b.amp - a.amp);
    return { coef, trace: [], lastLoop: -1 };
  },
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h);
    const period = 7;
    const loop = Math.floor(t / period);
    const K = EPI_K[loop % EPI_K.length];
    if (loop !== s.lastLoop) {
      s.trace = [];
      s.lastLoop = loop;
    }
    const u = (t % period) / period;
    const sc = Math.min(w, h) * 0.4;
    let x = w / 2;
    let y = h / 2 + sc * 0.06;
    ctx.lineWidth = 0.75;
    for (let j = 0; j < K; j++) {
      const c = s.coef[j];
      const th = TAU * c.f * u;
      const dx = (c.re * Math.cos(th) - c.im * Math.sin(th)) * sc;
      const dy = (c.re * Math.sin(th) + c.im * Math.cos(th)) * sc;
      if (c.amp * sc > 0.6) {
        ctx.strokeStyle = rgba(pal.inkRGB, 0.16);
        ctx.beginPath();
        ctx.arc(x, y, c.amp * sc, 0, TAU);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(pal.inkRGB, 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + dx, y + dy);
      ctx.stroke();
      x += dx;
      y += dy;
    }
    s.trace.push([x, y]);
    ctx.strokeStyle = pal.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    s.trace.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)));
    ctx.stroke();
    ctx.fillStyle = pal.warm;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, TAU);
    ctx.fill();
    label(ctx, pal, `${K} circles, largest first`, 10, h - 10);
  },
  still: 6.9,
};

// ---------------------------------------------------------------------------

type DP = { st: number[][]; trails: [number, number][][] };
const G = 9.81;
const dpD = (v: number[]) => {
  const [a1, a2, w1, w2] = v;
  const d = a1 - a2;
  const den = 3 - Math.cos(2 * d); // m1 = m2 = 1, l1 = l2 = 1
  const dw1 = (-G * 3 * Math.sin(a1) - G * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den;
  const dw2 = (2 * Math.sin(d) * (w1 * w1 * 2 + G * 2 * Math.cos(a1) + w2 * w2 * Math.cos(d))) / den;
  return [w1, w2, dw1, dw2];
};

const pendulum: Anim<DP> = {
  init: () => ({
    st: [0, 1, 2].map((i) => [2.4 + i * 1e-3, 2.6, 0, 0]),
    trails: [[], [], []],
  }),
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h);
    for (let k = 0; k < 8; k++) s.st = s.st.map((v) => rk4(v, 0.0025, dpD));
    const L = Math.min(w, h) * 0.22;
    const ox = w / 2;
    const oy = h * 0.42;
    const cols = [pal.inkRGB, pal.accentRGB, pal.warmRGB];
    s.st.forEach((v, i) => {
      const x1 = ox + L * Math.sin(v[0]);
      const y1 = oy + L * Math.cos(v[0]);
      const x2 = x1 + L * Math.sin(v[1]);
      const y2 = y1 + L * Math.cos(v[1]);
      const tr = s.trails[i];
      tr.push([x2, y2]);
      if (tr.length > 260) tr.shift();
      ctx.lineWidth = 1;
      for (let j = 1; j < tr.length; j++) {
        ctx.strokeStyle = rgba(cols[i], (j / tr.length) * 0.6);
        ctx.beginPath();
        ctx.moveTo(tr[j - 1][0], tr[j - 1][1]);
        ctx.lineTo(tr[j][0], tr[j][1]);
        ctx.stroke();
      }
      ctx.strokeStyle = rgba(cols[i], 0.85);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.fillStyle = rgba(cols[i], 1);
      ctx.beginPath();
      ctx.arc(x2, y2, 3.5, 0, TAU);
      ctx.fill();
    });
    ctx.fillStyle = pal.ink;
    ctx.beginPath();
    ctx.arc(ox, oy, 2, 0, TAU);
    ctx.fill();
    label(ctx, pal, "three starts, 0.001 rad apart", 10, h - 10);
    // start again every 40 seconds
    if (t % 40 < dt) {
      s.st = [0, 1, 2].map((i) => [2.4 + i * 1e-3, 2.6, 0, 0]);
      s.trails = [[], [], []];
    }
  },
  still: 14,
};

// ---------------------------------------------------------------------------

type Harm = { p: number[]; last: [number, number] | null; t0: number; rand: () => number };

function harmParams(rand: () => number) {
  const ratios = [
    [2, 3],
    [3, 4],
    [1, 2],
    [3, 5],
    [2, 5],
  ];
  const [a, b] = ratios[Math.floor(rand() * ratios.length)];
  const det = () => (rand() - 0.5) * 0.02;
  return [a + det(), b + det(), a + det(), b + det(), rand() * TAU, rand() * TAU, rand() * TAU, rand() * TAU, 0.025 + rand() * 0.02];
}

const harmonograph: Anim<Harm> = {
  init: (w, h, rand) => ({ p: harmParams(rand), last: null, t0: 0, rand }),
  frame(ctx, s, t, dt, w, h, pal) {
    const span = 26;
    if (t - s.t0 > span) {
      s.t0 = t;
      s.p = harmParams(s.rand);
      s.last = null;
    }
    const local = t - s.t0;
    if (local > span - 1.5) {
      clear(ctx, pal, w, h, 0.12);
      return;
    }
    if (local < dt * 1.5) clear(ctx, pal, w, h);
    const [f1, f2, f3, f4, p1, p2, p3, p4, d] = s.p;
    const R = Math.min(w, h) * 0.22;
    ctx.lineWidth = 0.7;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.6);
    ctx.beginPath();
    for (let k = 0; k < 40; k++) {
      const u = (local - dt + (dt * k) / 40) * 9;
      const e = Math.exp(-d * u);
      const x = w / 2 + R * e * (Math.sin(f1 * u + p1) + Math.sin(f2 * u + p2));
      const y = h / 2 + R * e * (Math.sin(f3 * u + p3) + Math.sin(f4 * u + p4));
      if (s.last) ctx.moveTo(s.last[0], s.last[1]);
      ctx.lineTo(x, y);
      s.last = [x, y];
    }
    ctx.stroke();
  },
  still: 20,
};

// ---------------------------------------------------------------------------

const CHLADNI_MODES = [
  [1, 4],
  [2, 5],
  [3, 7],
  [1, 6],
  [4, 7],
  [2, 9],
];
type Chladni = { ps: Float32Array; k: number; t0: number; rand: () => number };

const chladni: Anim<Chladni> = {
  init: (w, h, rand) => ({ ps: Float32Array.from({ length: 2 * 4000 }, () => rand()), k: 0, t0: 0, rand }),
  frame(ctx, s, t, dt, w, h, pal) {
    if (t - s.t0 > 9) {
      s.t0 = t;
      s.k = (s.k + 1) % CHLADNI_MODES.length;
    }
    const [n, m] = CHLADNI_MODES[s.k];
    clear(ctx, pal, w, h);
    const S = Math.min(w, h) * 0.86;
    const ox = (w - S) / 2;
    const oy = (h - S) / 2;
    ctx.strokeStyle = rgba(pal.inkRGB, 0.2);
    ctx.strokeRect(ox, oy, S, S);
    ctx.fillStyle = rgba(pal.inkRGB, 0.75);
    const P = Math.PI;
    for (let i = 0; i < s.ps.length; i += 2) {
      const x = s.ps[i];
      const y = s.ps[i + 1];
      const f = Math.cos(n * P * x) * Math.cos(m * P * y) - Math.cos(m * P * x) * Math.cos(n * P * y);
      // the plate shakes sand where it moves most; grains settle on the still lines
      const amp = 0.012 * Math.abs(f);
      s.ps[i] = Math.min(1, Math.max(0, x + (s.rand() - 0.5) * amp));
      s.ps[i + 1] = Math.min(1, Math.max(0, y + (s.rand() - 0.5) * amp));
      ctx.fillRect(ox + s.ps[i] * S, oy + s.ps[i + 1] * S, 1.2, 1.2);
    }
    label(ctx, pal, `n = ${n}, m = ${m}`, 10, h - 10);
  },
  still: 8,
};

// ---------------------------------------------------------------------------

type Waves = { r: ReturnType<typeof raster> | null; gw: number; gh: number };

const interference: Anim<Waves> = {
  init: (w, h) => ({ r: null, gw: Math.round(w / 3), gh: Math.round(h / 3) }),
  frame(ctx, s, t, dt, w, h, pal) {
    if (!s.r) s.r = raster(s.gw, s.gh);
    const { gw, gh } = s;
    const sep = (0.18 + 0.1 * Math.sin(t * 0.25)) * gw;
    const s1 = [gw / 2 - sep / 2, gh * 0.5];
    const s2 = [gw / 2 + sep / 2, gh * 0.5];
    const k = 0.55;
    const om = 3.2;
    const data = s.r.img.data;
    const [br, bg, bb] = pal.bgRGB;
    const [ar, ag, ab] = pal.accentRGB;
    const [ir, ig, ib] = pal.inkRGB;
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const r1 = Math.hypot(x - s1[0], y - s1[1]) + 1;
        const r2 = Math.hypot(x - s2[0], y - s2[1]) + 1;
        const v = (Math.sin(k * r1 - om * t) / Math.sqrt(r1) + Math.sin(k * r2 - om * t) / Math.sqrt(r2)) * 2.2;
        const c = Math.max(-1, Math.min(1, v));
        const i = 4 * (y * gw + x);
        if (c >= 0) {
          data[i] = br + (ar - br) * c;
          data[i + 1] = bg + (ag - bg) * c;
          data[i + 2] = bb + (ab - bb) * c;
        } else {
          data[i] = br + (ir - br) * -c * 0.5;
          data[i + 1] = bg + (ig - bg) * -c * 0.5;
          data[i + 2] = bb + (ib - bb) * -c * 0.5;
        }
        data[i + 3] = 255;
      }
    }
    s.r.ctx.putImageData(s.r.img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(s.r.c, 0, 0, w, h);
    ctx.fillStyle = pal.warm;
    for (const [x, y] of [s1, s2]) {
      ctx.beginPath();
      ctx.arc((x * w) / gw, (y * h) / gh, 3, 0, TAU);
      ctx.fill();
    }
  },
  still: 3,
};

// ---------------------------------------------------------------------------

type Boid = { x: number; y: number; vx: number; vy: number };

const boids: Anim<{ b: Boid[] }> = {
  init: (w, h, rand) => ({
    b: Array.from({ length: 140 }, () => {
      const a = rand() * TAU;
      return { x: rand() * w, y: rand() * h, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 };
    }),
  }),
  frame(ctx, s, t, dt, w, h, pal) {
    clear(ctx, pal, w, h, 0.25);
    const R = 38;
    const Rs = 14;
    for (const p of s.b) {
      let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
      for (const q of s.b) {
        if (q === p) continue;
        let dx = q.x - p.x;
        let dy = q.y - p.y;
        if (dx > w / 2) dx -= w;
        if (dx < -w / 2) dx += w;
        if (dy > h / 2) dy -= h;
        if (dy < -h / 2) dy += h;
        const d = Math.hypot(dx, dy);
        if (d < R) {
          cx += dx;
          cy += dy;
          ax += q.vx;
          ay += q.vy;
          n++;
          if (d < Rs) {
            sx -= dx / (d * d + 1e-3);
            sy -= dy / (d * d + 1e-3);
          }
        }
      }
      if (n) {
        p.vx += (cx / n) * 0.9 * dt + (ax / n - p.vx) * 1.2 * dt + sx * 900 * dt;
        p.vy += (cy / n) * 0.9 * dt + (ay / n - p.vy) * 1.2 * dt + sy * 900 * dt;
      }
      const sp = Math.hypot(p.vx, p.vy);
      const target = Math.min(90, Math.max(45, sp));
      p.vx *= target / (sp || 1);
      p.vy *= target / (sp || 1);
    }
    for (const p of s.b) {
      p.x = (p.x + p.vx * dt + w) % w;
      p.y = (p.y + p.vy * dt + h) % h;
      const a = Math.atan2(p.vy, p.vx);
      ctx.fillStyle = rgba(pal.inkRGB, 0.8);
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(a) * 6, p.y + Math.sin(a) * 6);
      ctx.lineTo(p.x + Math.cos(a + 2.5) * 3.5, p.y + Math.sin(a + 2.5) * 3.5);
      ctx.lineTo(p.x + Math.cos(a - 2.5) * 3.5, p.y + Math.sin(a - 2.5) * 3.5);
      ctx.closePath();
      ctx.fill();
    }
  },
  still: 10,
};

// ---------------------------------------------------------------------------

export const ENTRIES_A: Entry[] = [
  {
    id: "phyllotaxis",
    title: "Sunflower",
    tag: "geometry",
    blurb:
      "Point n sits at radius proportional to √n, turned n times the golden angle. No two points ever line up, so the disc fills evenly; the eye picks out spirals, and every 13th and 21st point is marked to show two families of them.",
    formula: "r_n = c\\sqrt{n}, \\qquad \\theta_n = n \\cdot \\pi(3 - \\sqrt 5)",
    anim: phyllotaxis,
    aspect: 0.8,
    seed: 3,
  },
  {
    id: "lorenz",
    title: "Lorenz, twice",
    tag: "chaos",
    blurb:
      "Two solutions of Lorenz's 1963 system, started 0.00001 apart and integrated with RK4. For a while they draw one curve; then the gap grows until they are on different wings of the butterfly.",
    formula: "\\dot x = 10(y-x),\\;\\; \\dot y = x(28 - z) - y,\\;\\; \\dot z = xy - \\tfrac83 z",
    anim: lorenz,
    seed: 4,
  },
  {
    id: "clifford",
    title: "Clifford attractor",
    tag: "chaos",
    blurb:
      "One point, iterated 12,000 times a frame by a two-line map; the picture is how often it lands on each pixel, on a log scale. Every twelve seconds the four constants change.",
    formula: "x' = \\sin(a y) + c\\cos(a x), \\quad y' = \\sin(b x) + d\\cos(b y)",
    anim: clifford,
    seed: 5,
  },
  {
    id: "flow",
    title: "Flow field",
    tag: "signal",
    blurb:
      "Seven hundred particles follow an angle read from smooth 3-D noise, the third coordinate being time. Old strokes fade, so the picture is a few seconds of their history.",
    anim: flow,
    aspect: 0.6,
    seed: 6,
    wide: true,
  },
  {
    id: "truchet",
    title: "Truchet tiles",
    tag: "tiling",
    blurb:
      "One tile, two quarter-circles, placed in one of two orientations. Any arrangement joins up into closed loops and long paths; a few tiles turn at a time, rewiring them.",
    anim: truchet,
    seed: 7,
  },
  {
    id: "grayscott",
    title: "Gray–Scott",
    tag: "life",
    blurb:
      "Two chemicals on a grid: A is fed in, B eats A to make more B, and both diffuse, B half as fast. Feed rate F and kill rate k decide whether you get coral, dividing spots, or mazes.",
    formula: "\\partial_t A = D_A \\nabla^2 A - AB^2 + F(1-A), \\quad \\partial_t B = D_B \\nabla^2 B + AB^2 - (k+F)B",
    anim: grayScott,
    seed: 8,
  },
  {
    id: "life",
    title: "Life",
    tag: "life",
    blurb:
      "Conway's rules on a torus: a cell is born with exactly three live neighbours and survives with two or three. Cells that just died leave a fading trace. When the board settles, it is reseeded.",
    anim: life,
    seed: 9,
  },
  {
    id: "epicycles",
    title: "A star from circles",
    tag: "signal",
    blurb:
      "A five-pointed star, sampled at 256 points and written as a sum of rotating circles by the discrete Fourier transform. Each pass uses more circles, largest first; the sharp corners are what need the small ones.",
    formula: "z(t) \\approx \\sum_{j=1}^{K} c_{f_j}\\, e^{2\\pi i f_j t}",
    anim: epicycles,
    seed: 10,
  },
  {
    id: "pendulum",
    title: "Three double pendulums",
    tag: "chaos",
    blurb:
      "Equal masses, equal arms, no friction, integrated with RK4. The three start a thousandth of a radian apart and stay together for a few swings before they part.",
    anim: pendulum,
    seed: 11,
  },
  {
    id: "harmonograph",
    title: "Harmonograph",
    tag: "physics",
    blurb:
      "Two damped pendulums, one per axis, each the sum of two sines with nearly whole-number frequency ratios. The small detuning makes the figure slowly turn as it shrinks.",
    formula: "x(t) = e^{-dt}\\big(\\sin(f_1 t + p_1) + \\sin(f_2 t + p_2)\\big)",
    anim: harmonograph,
    seed: 12,
  },
  {
    id: "chladni",
    title: "Chladni sand",
    tag: "physics",
    blurb:
      "Sand on a vibrating square plate gets kicked where the plate moves and comes to rest where it does not. Here each grain jitters in proportion to the standing wave's amplitude, and gathers on its nodal lines.",
    formula: "u(x,y) = \\cos(n\\pi x)\\cos(m\\pi y) - \\cos(m\\pi x)\\cos(n\\pi y)",
    anim: chladni,
    aspect: 0.8,
    seed: 13,
  },
  {
    id: "interference",
    title: "Two sources",
    tag: "physics",
    blurb:
      "Two point sources send out circular waves that fall off as 1/√r. Where crests meet crests the colour deepens; along the hyperbolas where crest meets trough the water stays flat. The sources drift apart and back.",
    anim: interference,
    seed: 14,
  },
  {
    id: "boids",
    title: "Boids",
    tag: "life",
    blurb:
      "Reynolds' three rules for each bird, using only neighbours within a small radius: steer toward their centre, match their heading, and keep out of their way. Flocks form, split, and merge.",
    anim: boids,
    aspect: 0.6,
    seed: 15,
    wide: true,
  },
];
