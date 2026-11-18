"use client";

import { useMemo, useState } from "react";
import styles from "./Week02.module.css";
import {
  fmt,
  linspace,
  mapx,
  Play,
  Plot,
  Tex,
  useRaf,
  type Point,
} from "./plot";

function yExtent(points: Array<Point | null>, padRatio = 0.12): [number, number] {
  const ys = points.flatMap((p) => (p && Number.isFinite(p.y) ? [p.y] : []));
  if (ys.length === 0) return [-1, 1];
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  if (lo === hi) {
    lo -= 1;
    hi += 1;
  }
  const pad = (hi - lo) * padRatio;
  return [lo - pad, hi + pad];
}

export function OscillationFigure() {
  const [half, setHalf] = useState(0.55);
  const [showWave, setShowWave] = useState(true);
  const [showEnv, setShowEnv] = useState(true);
  const [play, setPlay] = useState(false);

  useRaf(play, 8000, (u) => {
    const zoom = Math.sin(Math.PI * u);
    setHalf(1.15 - (1.15 - 0.08) * zoom);
  });

  const wave = useMemo(() => cubeOsc(half), [half]);
  const upper = useMemo(() => envelope(half, 1), [half]);
  const lower = useMemo(() => envelope(half, -1), [half]);
  const edge = Math.max(
    Math.abs((2 - half) ** 3 - 8),
    Math.abs((2 + half) ** 3 - 8),
  );
  const yMax = edge * 1.08;

  const series = [
    showEnv
      ? {
          id: "upper",
          label: <Tex>{String.raw`|x^3-8|`}</Tex>,
          points: upper,
          color: "var(--c3)",
          dash: "5 4",
        }
      : null,
    showEnv
      ? {
          id: "lower",
          label: <Tex>{String.raw`-|x^3-8|`}</Tex>,
          points: lower,
          color: "var(--c3)",
          dash: "5 4",
        }
      : null,
    showWave
      ? {
          id: "f",
          label: <Tex>{String.raw`(x^3-8)\sin\frac{1}{x^3-8}`}</Tex>,
          points: wave,
          color: "var(--c1)",
        }
      : null,
  ].filter((s) => s !== null);

  return (
    <figure>
      <Plot
        ariaLabel="Oscillating product trapped between envelopes that shrink to zero at x equals 2"
        series={series}
        xDomain={[2 - half, 2 + half]}
        yDomain={[-yMax, yMax]}
        yLabel="y"
        rules={[{ x: 2 }]}
      />
      <div className={styles.controls}>
        <label>
          Zoom
          <input
            type="range"
            min={0.08}
            max={1.15}
            step={0.01}
            value={half}
            aria-label="Half-width of the window around 2"
            onChange={(e) => {
              setPlay(false);
              setHalf(Number(e.target.value));
            }}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={showWave}
            onChange={(e) => setShowWave(e.target.checked)}
          />
          Oscillation
        </label>
        <label>
          <input
            type="checkbox"
            checked={showEnv}
            onChange={(e) => setShowEnv(e.target.checked)}
          />
          Squeeze bounds
        </label>
        <Play on={play} toggle={() => setPlay((v) => !v)} />
      </div>
      <ul className={styles.readout}>
        <li>
          <span>Half-width</span>
          <strong>{fmt(half, 2)}</strong>
        </li>
        <li>
          <span>Envelope at the edge</span>
          <strong>{fmt(edge, 3)}</strong>
        </li>
        <li>
          <span>Vertical scale</span>
          <strong>±{fmt(yMax, 3)}</strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>
        Every wave stays between the dashed curves. Zoom in: the vertical scale
        collapses to 0, which is the squeeze.
      </figcaption>
    </figure>
  );
}

function cubeOsc(half: number): Array<Point | null> {
  const parts: Array<Point | null> = [];
  for (const sign of [-1, 1]) {
    const denOuter = (2 + sign * half) ** 3 - 8;
    if (Math.abs(denOuter) < 1e-9) continue;
    const phi0 = 1 / denOuter;
    const phi1 = Math.sign(phi0) * 700;
    const cycles = Math.abs(phi1 - phi0) / (2 * Math.PI);
    const n = Math.min(2600, Math.max(280, Math.ceil(cycles * 26)));
    for (let i = 0; i < n; i++) {
      const phi = phi0 + ((phi1 - phi0) * i) / (n - 1);
      const den = 1 / phi;
      parts.push({
        x: Math.cbrt(den + 8),
        y: den * Math.sin(phi),
      });
    }
    parts.push(null);
  }
  return parts;
}

function envelope(half: number, sign: number): Point[] {
  return linspace(2 - half, 2 + half, 180).flatMap((x) => {
    if (Math.abs(x - 2) < 1e-4) return [];
    return [{ x, y: sign * Math.abs(x ** 3 - 8) }];
  });
}

export function DominantFigure() {
  const xs = linspace(1, 24, 240);
  const f = (x: number) =>
    (4 * x ** 3 + 4 * x ** 2 + 1) / Math.sqrt(3 * x ** 6 + x ** 4 - 12);
  const limit = 4 / Math.sqrt(3);
  const pts = mapx(xs, f);
  return (
    <figure>
      <Plot
        ariaLabel="The rational expression settling toward 4 over square root of 3"
        series={[
          {
            id: "f",
            label: "quotient",
            points: pts,
          },
          {
            id: "L",
            label: <Tex>{String.raw`4/\sqrt{3}`}</Tex>,
            points: xs.map((x) => ({ x, y: limit })),
            color: "var(--c3)",
            dash: "5 4",
          },
        ]}
        xDomain={[1, 24]}
        yDomain={yExtent([...pts, { x: 1, y: limit }])}
      />
      <figcaption className={styles.caption}>
        After <Tex>{String.raw`\sqrt{x^6}=x^3`}</Tex> is cancelled for{" "}
        <Tex>{String.raw`x>0`}</Tex>, the remaining expression settles at{" "}
        <Tex>{String.raw`4/\sqrt{3}`}</Tex>.
      </figcaption>
    </figure>
  );
}

export function SignFigure() {
  const [x, setX] = useState(-12);
  const xs = linspace(-36, -2.05, 280);
  const root = (t: number) => Math.sqrt(t * t + 2 * t);
  const c = (t: number) => 1 / (root(t) - t);
  const d = (t: number) => 1 / (root(t) + t);
  const cPts = mapx(xs, c);
  const dPts = mapx(xs, d);
  const rx = root(x);

  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="The expression with a minus sign in the denominator tends to 0"
          series={[
            { id: "c", label: <Tex>{String.raw`1/(\sqrt{x^2+2x}-x)`}</Tex>, points: cPts },
          ]}
          xDomain={[-36, -2]}
          yDomain={[-0.05, 0.7]}
          rules={[{ y: 0 }]}
        />
        <Plot
          ariaLabel="The expression with a plus sign in the denominator tends to -1"
          series={[
            { id: "d", label: <Tex>{String.raw`1/(\sqrt{x^2+2x}+x)`}</Tex>, points: dPts },
          ]}
          xDomain={[-36, -2]}
          yDomain={[-1.25, -0.3]}
          rules={[{ y: -1 }]}
        />
      </div>
      <div className={styles.controls}>
        <label>
          x
          <input
            type="range"
            min={-36}
            max={-2.2}
            step={0.1}
            value={x}
            aria-label="Sample point approaching negative infinity"
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>
      </div>
      <ul className={styles.readout}>
        <li>
          <span>x</span>
          <strong>{fmt(x, 2)}</strong>
        </li>
        <li>
          <span>√(x²+2x)</span>
          <strong>{fmt(rx, 3)}</strong>
        </li>
        <li>
          <span>|x| = −x</span>
          <strong>{fmt(-x, 3)}</strong>
        </li>
        <li>
          <span>Q1c</span>
          <strong>{fmt(c(x), 4)}</strong>
        </li>
        <li>
          <span>Q1d</span>
          <strong>{fmt(d(x), 4)}</strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>
        For <Tex>{String.raw`x<0`}</Tex>, the square root tracks <Tex>{String.raw`|x|=-x`}</Tex>.
        In Q1c that term is added to <Tex>{String.raw`-x`}</Tex>, so the denominator grows.
        In Q1d it is added to <Tex>x</Tex>, so the denominator cancels down to a constant.
      </figcaption>
    </figure>
  );
}

export function SineBoundFigure() {
  const xs = linspace(0.35, 40, 900);
  const f = (x: number) => Math.sin(x) / (3 * x);
  const env = (x: number) => 1 / (3 * x);
  return (
    <figure>
      <Plot
        ariaLabel="sin x over 3x trapped between plus and minus 1 over 3x"
        series={[
          {
            id: "upper",
            label: <Tex>{String.raw`1/(3x)`}</Tex>,
            points: mapx(xs, env),
            color: "var(--c3)",
            dash: "4 4",
          },
          {
            id: "lower",
            label: <Tex>{String.raw`-1/(3x)`}</Tex>,
            points: mapx(xs, (x) => -env(x)),
            color: "var(--c3)",
            dash: "4 4",
          },
          { id: "f", label: <Tex>{String.raw`\sin x/(3x)`}</Tex>, points: mapx(xs, f) },
        ]}
        xDomain={[0.35, 40]}
        yDomain={[-1, 1]}
        rules={[{ y: 0 }]}
      />
      <figcaption className={styles.caption}>
        <Tex>{String.raw`|\sin x|\le 1`}</Tex> puts the quotient between two curves that both
        tend to 0.
      </figcaption>
    </figure>
  );
}

export function CompositionFigure() {
  const xs = linspace(-40, -1, 240);
  const inner = (x: number) =>
    (Math.PI * x * x + 5 * x + 1) / (x * x + 1) - Math.PI / 6;
  const target = (5 * Math.PI) / 6;
  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="Inner expression approaching 5 pi over 6"
          series={[
            { id: "u", label: "inside the sine", points: mapx(xs, inner) },
            {
              id: "L",
              label: <Tex>{String.raw`5\pi/6`}</Tex>,
              points: xs.map((x) => ({ x, y: target })),
              color: "var(--c3)",
              dash: "5 4",
            },
          ]}
          xDomain={[-40, -1]}
          yDomain={[2.4, 2.75]}
          yLabel="u(x)"
        />
        <Plot
          ariaLabel="Sine of the inner expression approaching 1/2"
          series={[
            {
              id: "s",
              label: "sine of the inside",
              points: mapx(xs, (x) => Math.sin(inner(x))),
            },
            {
              id: "half",
              label: <Tex>{String.raw`1/2`}</Tex>,
              points: xs.map((x) => ({ x, y: 0.5 })),
              color: "var(--c3)",
              dash: "5 4",
            },
          ]}
          xDomain={[-40, -1]}
          yDomain={[0.35, 0.65]}
          yLabel="sin u(x)"
        />
      </div>
      <figcaption className={styles.caption}>
        The inside settles at <Tex>{String.raw`5\pi/6`}</Tex>. Sine is continuous there, so
        it passes through the limit and the value is <Tex>{String.raw`1/2`}</Tex>.
      </figcaption>
    </figure>
  );
}

export function RationalizeFigure() {
  const [x, setX] = useState(8);
  const xs = linspace(1.05, 30, 200);
  const diff = (t: number) =>
    Math.sqrt(t * t + t) - Math.sqrt(t * t - t);
  const rational = (t: number) =>
    2 / (Math.sqrt(1 + 1 / t) + Math.sqrt(1 - 1 / t));
  return (
    <figure>
      <Plot
        ariaLabel="Difference of square roots and its rationalized form, both tending to 1"
        series={[
          { id: "diff", label: "original difference", points: mapx(xs, diff) },
          {
            id: "rat",
            label: "after rationalizing",
            points: mapx(xs, rational),
            color: "var(--c2)",
            dash: "6 4",
          },
          {
            id: "one",
            label: <Tex>1</Tex>,
            points: xs.map((t) => ({ x: t, y: 1 })),
            color: "var(--c3)",
            dash: "3 4",
          },
        ]}
        xDomain={[1, 30]}
        yDomain={[0.7, 1.5]}
      />
      <div className={styles.controls}>
        <label>
          x
          <input
            type="range"
            min={1.2}
            max={30}
            step={0.1}
            value={x}
            aria-label="Point on the rationalized difference"
            onChange={(e) => setX(Number(e.target.value))}
          />
        </label>
      </div>
      <ul className={styles.readout}>
        <li>
          <span>√(x²+x)</span>
          <strong>{fmt(Math.sqrt(x * x + x), 3)}</strong>
        </li>
        <li>
          <span>√(x²−x)</span>
          <strong>{fmt(Math.sqrt(x * x - x), 3)}</strong>
        </li>
        <li>
          <span>difference</span>
          <strong>{fmt(diff(x), 4)}</strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>
        Each square root grows like <Tex>x</Tex>. Their difference is the solid curve,
        and it agrees with the rationalized expression. Both tend to 1.
      </figcaption>
    </figure>
  );
}

export function QuotientFigure() {
  const xs = linspace(0.6, 26, 800);
  const f = (x: number) => (x * x * (2 + Math.sin(x) ** 2)) / (3 * x + 1);
  const lo = (x: number) => (2 * x * x) / (3 * x + 1);
  const hi = (x: number) => (3 * x * x) / (3 * x + 1);
  return (
    <figure>
      <Plot
        ariaLabel="Oscillating quotient trapped between two curves that tend to infinity"
        series={[
          {
            id: "hi",
            label: <Tex>{String.raw`3x^2/(3x+1)`}</Tex>,
            points: mapx(xs, hi),
            color: "var(--c3)",
            dash: "4 4",
          },
          {
            id: "lo",
            label: <Tex>{String.raw`2x^2/(3x+1)`}</Tex>,
            points: mapx(xs, lo),
            color: "var(--c2)",
            dash: "5 4",
          },
          { id: "f", label: "quotient", points: mapx(xs, f) },
        ]}
        xDomain={[0.6, 26]}
        yDomain={[0, 28]}
      />
      <figcaption className={styles.caption}>
        <Tex>{String.raw`\sin^2 x`}</Tex> keeps swinging between 0 and 1. The quotient stays
        between two curves that both climb to <Tex>{String.raw`+\infty`}</Tex>.
      </figcaption>
    </figure>
  );
}

export function FloorFigure() {
  const [x, setX] = useState(-0.35);
  const [play, setPlay] = useState(false);
  useRaf(play, 6000, (u) => {
    setX(-0.92 + 0.9 * u);
  });
  const xs = linspace(-0.98, -0.01, 200);
  const h = (t: number) => t / (t * t + 1);
  const hx = h(x);

  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="h of x approaching 0 through negative values"
          series={[
            {
              id: "h",
              label: <Tex>{String.raw`h(x)=x/(x^2+1)`}</Tex>,
              points: mapx(xs, h),
            },
          ]}
          markers={[{ x, y: hx, label: "h(x)" }]}
          band={xs.map((t) => ({ x: t, y0: -1, y1: 0 }))}
          xDomain={[-1, 0]}
          yDomain={[-1.25, 0.2]}
          rules={[{ y: 0 }, { y: -1 }]}
          yLabel="h(x)"
        />
        <Plot
          ariaLabel="Floor of h of x equal to -1 on the left of 0"
          series={[
            {
              id: "floor",
              label: <Tex>{String.raw`\lfloor h(x)\rfloor`}</Tex>,
              points: xs.map((t) => ({ x: t, y: -1 })),
              color: "var(--c2)",
            },
          ]}
          markers={[{ x, y: -1, color: "var(--c2)" }]}
          xDomain={[-1, 0]}
          yDomain={[-2, 1]}
          rules={[{ y: 0 }]}
          yLabel="floor"
        />
      </div>
      <div className={styles.controls}>
        <label>
          x → 0⁻
          <input
            type="range"
            min={-0.95}
            max={-0.01}
            step={0.001}
            value={x}
            aria-label="Approach 0 from the left"
            onChange={(e) => {
              setPlay(false);
              setX(Number(e.target.value));
            }}
          />
        </label>
        <Play on={play} toggle={() => setPlay((v) => !v)} />
      </div>
      <ul className={styles.readout}>
        <li>
          <span>x</span>
          <strong>{fmt(x, 3)}</strong>
        </li>
        <li>
          <span>h(x)</span>
          <strong>{fmt(hx, 4)}</strong>
        </li>
        <li>
          <span>⌊h(x)⌋</span>
          <strong>−1</strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>
        On <Tex>{String.raw`(-1,0)`}</Tex>, <Tex>{String.raw`h(x)`}</Tex> stays inside the shaded
        strip <Tex>{String.raw`(-1,0)`}</Tex>, so its floor is the constant <Tex>-1</Tex>.
      </figcaption>
    </figure>
  );
}

export function PiecewiseFigure() {
  const [a, setA] = useState(3);
  const [b, setB] = useState(0);
  const [filled, setFilled] = useState(false);
  const mid = useMemo(() => middlePiece(), []);
  const left = useMemo(() => leftPiece(a), [a]);
  const right = rightPiece(a, b);
  const ys = [...left, ...mid, ...right].map((p) => p.y);
  const lo = Math.min(2, a + b, ...ys);
  const hi = Math.max(4, a + b, ...ys);
  const pad = Math.max(0.4, (hi - lo) * 0.12);
  const matched = Math.abs(a - 3) < 0.05 && Math.abs(b) < 0.05;

  let status = "The printed formula does not define f(0).";
  if (filled && matched) {
    status = "With f(0) defined to be 3, a = 3 and b = 0 give a continuous extension.";
  } else if (filled) {
    status = "f(0) = 3 is filled in, and the one-sided limits still have to match it.";
  }

  return (
    <figure>
      <Plot
        ariaLabel="Piecewise function with a hole at x equals 0 unless the extension is defined"
        series={[
          {
            id: "env+",
            label: <Tex>{String.raw`3+x^3`}</Tex>,
            points: linspace(0.02, 1, 40).map((x) => ({ x, y: 3 + x ** 3 })),
            color: "var(--c3)",
            dash: "4 4",
            width: 1.2,
          },
          {
            id: "env-",
            label: <Tex>{String.raw`3-x^3`}</Tex>,
            points: linspace(0.02, 1, 40).map((x) => ({ x, y: 3 - x ** 3 })),
            color: "var(--c3)",
            dash: "4 4",
            width: 1.2,
          },
          { id: "left", label: <Tex>{String.raw`\sin(ax)/x`}</Tex>, points: left },
          { id: "mid", label: <Tex>{String.raw`3+x^3\sin(\pi/x^3)`}</Tex>, points: mid },
          {
            id: "right",
            label: <Tex>{String.raw`ax+b`}</Tex>,
            points: right,
            color: "var(--c2)",
          },
        ]}
        markers={[
          {
            x: 0,
            y: 3,
            open: !filled,
            label: filled ? "f(0)=3" : "undefined",
          },
          { x: 1, y: 3, label: "f(1)=3" },
          ...(Math.abs(a + b - 3) > 0.08
            ? [{ x: 1, y: a + b, open: true, color: "var(--c2)", label: "a+b" }]
            : []),
        ]}
        xDomain={[-1.45, 2.15]}
        yDomain={[lo - pad, hi + pad]}
        rules={[{ x: 0 }, { x: 1 }]}
      />
      <div className={styles.controls}>
        <label>
          a = {fmt(a, 1)}
          <input
            type="range"
            min={-1}
            max={6}
            step={0.1}
            value={a}
            aria-label="Parameter a"
            onChange={(e) => setA(Number(e.target.value))}
          />
        </label>
        <label>
          b = {fmt(b, 1)}
          <input
            type="range"
            min={-3}
            max={3}
            step={0.1}
            value={b}
            aria-label="Parameter b"
            onChange={(e) => setB(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          className={styles.play}
          aria-pressed={filled}
          onClick={() => setFilled((v) => !v)}
        >
          {filled ? "Remove f(0)=3" : "Define f(0)=3"}
        </button>
      </div>
      <ul className={styles.readout}>
        <li>
          <span>Left limit at 0</span>
          <strong>{fmt(a, 2)}</strong>
        </li>
        <li>
          <span>Right limit at 0</span>
          <strong>3</strong>
        </li>
        <li>
          <span>f(1) and right limit</span>
          <strong>
            3 and {fmt(a + b, 2)}
          </strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>{status}</figcaption>
    </figure>
  );
}

function leftPiece(a: number): Point[] {
  return linspace(-1.4, -0.015, 360).map((x) => ({
    x,
    y: Math.sin(a * x) / x,
  }));
}

function rightPiece(a: number, b: number): Point[] {
  return linspace(1.02, 2.1, 40).map((x) => ({ x, y: a * x + b }));
}

function middlePiece(): Point[] {
  const phi0 = Math.PI;
  const phi1 = 420;
  const n = 1800;
  const pts: Point[] = [];
  for (let i = 0; i < n; i++) {
    const phi = phi0 + ((phi1 - phi0) * i) / (n - 1);
    const x3 = Math.PI / phi;
    pts.push({ x: Math.cbrt(x3), y: 3 + x3 * Math.sin(phi) });
  }
  return pts;
}

export function RegionFigure() {
  const [delta, setDelta] = useState(1);
  const [play, setPlay] = useState(false);
  const [showSin, setShowSin] = useState(true);
  const [showHalf, setShowHalf] = useState(false);
  const [showCos, setShowCos] = useState(false);
  useRaf(play, 7000, (u) => {
    const zoom = Math.sin(Math.PI * u);
    setDelta(1.45 - (1.45 - 0.18) * zoom);
  });
  const xs = linspace(-1.55, 1.55, 220);
  const band = xs.map((x) => ({ x, y0: -(x * x), y1: x * x }));
  const series = [
    {
      id: "top",
      label: <Tex>{String.raw`x^2`}</Tex>,
      points: xs.map((x) => ({ x, y: x * x })),
      color: "var(--c3)",
      width: 1.3,
    },
    {
      id: "bot",
      label: <Tex>{String.raw`-x^2`}</Tex>,
      points: xs.map((x) => ({ x, y: -(x * x) })),
      color: "var(--c3)",
      width: 1.3,
    },
    showSin
      ? {
          id: "sin",
          label: <Tex>{String.raw`x^2\sin x`}</Tex>,
          points: mapx(xs, (x) => x * x * Math.sin(x)),
        }
      : null,
    showHalf
      ? {
          id: "half",
          label: <Tex>{String.raw`\tfrac12 x^2`}</Tex>,
          points: xs.map((x) => ({ x, y: 0.5 * x * x })),
          color: "var(--c2)",
        }
      : null,
    showCos
      ? {
          id: "cos",
          label: <Tex>{String.raw`x^2\cos(1/x)`}</Tex>,
          points: cosExample(),
          color: "var(--c2)",
          dash: "0",
        }
      : null,
  ].filter((s) => s !== null);

  return (
    <figure>
      <Plot
        ariaLabel="Region between negative x squared and x squared, which collapses near zero"
        series={series}
        band={band}
        markers={[{ x: 0, y: 0, label: "f(0)=0" }]}
        rules={[{ x: -delta }, { x: delta }, { y: delta * delta }, { y: -(delta * delta) }]}
        xDomain={[-1.55, 1.55]}
        yDomain={[-2.5, 2.5]}
      />
      <div className={styles.controls}>
        <label>
          δ = {fmt(delta, 2)}
          <input
            type="range"
            min={0.18}
            max={1.45}
            step={0.01}
            value={delta}
            aria-label="Radius of the neighborhood of 0"
            onChange={(e) => {
              setPlay(false);
              setDelta(Number(e.target.value));
            }}
          />
        </label>
        <label>
          <input type="checkbox" checked={showSin} onChange={(e) => setShowSin(e.target.checked)} />
          x² sin x
        </label>
        <label>
          <input type="checkbox" checked={showHalf} onChange={(e) => setShowHalf(e.target.checked)} />
          ½ x²
        </label>
        <label>
          <input type="checkbox" checked={showCos} onChange={(e) => setShowCos(e.target.checked)} />
          x² cos(1/x)
        </label>
        <Play on={play} toggle={() => setPlay((v) => !v)} />
      </div>
      <ul className={styles.readout}>
        <li>
          <span>|x| &lt; δ</span>
          <strong>{fmt(delta, 2)}</strong>
        </li>
        <li>
          <span>|f(x)| ≤ δ²</span>
          <strong>{fmt(delta * delta, 4)}</strong>
        </li>
      </ul>
      <figcaption className={styles.caption}>
        Any function with <Tex>{String.raw`|f(x)|\le x^2`}</Tex> stays in the shaded region.
        The curves are examples. Inside <Tex>{String.raw`|x|<\delta`}</Tex>, the region is only{" "}
        <Tex>{String.raw`2\delta^2`}</Tex> tall.
      </figcaption>
    </figure>
  );
}

function cosExample(): Point[] {
  const pts: Point[] = [];
  for (const sign of [-1, 1]) {
    const phi0 = 1 / 1.5;
    const phi1 = 80;
    const n = 700;
    for (let i = 0; i < n; i++) {
      const phi = phi0 + ((phi1 - phi0) * i) / (n - 1);
      const x = sign / phi;
      pts.push({ x, y: x * x * Math.cos(phi) });
    }
  }
  return pts.sort((p, q) => p.x - q.x);
}

export function SquareFigure() {
  const left = linspace(-2, -0.02, 20).map((x) => ({ x, y: -2 }));
  const right = linspace(0.02, 2, 20).map((x) => ({ x, y: 2 }));
  const square = linspace(-2, 2, 20).map((x) => ({ x, y: 4 }));
  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="Two times the sign function, with different one-sided limits"
          series={[
            {
              id: "f",
              label: <Tex>{String.raw`f(x)=2\operatorname{sgn}(x)`}</Tex>,
              points: [...left, null, ...right],
            },
          ]}
          markers={[
            { x: 0, y: 2, open: true },
            { x: 0, y: -2, open: true },
          ]}
          xDomain={[-2, 2]}
          yDomain={[-3, 3]}
          rules={[{ y: 0 }]}
        />
        <Plot
          ariaLabel="Square of f is the constant 4"
          series={[
            {
              id: "sq",
              label: <Tex>{String.raw`[f(x)]^2=4`}</Tex>,
              points: square,
              color: "var(--c2)",
            },
          ]}
          xDomain={[-2, 2]}
          yDomain={[0, 6]}
        />
      </div>
      <figcaption className={styles.caption}>
        The square is the constant 4, so its limit is 4. The original function
        approaches 2 from the right and −2 from the left.
      </figcaption>
    </figure>
  );
}

export function ProductFigure() {
  const xs = linspace(-2, 2, 240);
  const g = mapx(xs, (x) => (Math.abs(x) < 0.08 ? NaN : 1 / x));
  const prod = mapx(xs, (x) => (Math.abs(x) < 0.02 ? NaN : 1));
  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="One over x has no limit at 0"
          series={[{ id: "g", label: <Tex>{String.raw`g(x)=1/x`}</Tex>, points: g }]}
          xDomain={[-2, 2]}
          yDomain={[-8, 8]}
          rules={[{ x: 0 }, { y: 0 }]}
        />
        <Plot
          ariaLabel="The product x times 1/x equals 1 away from 0"
          series={[
            {
              id: "p",
              label: <Tex>{String.raw`f(x)g(x)=1`}</Tex>,
              points: prod,
              color: "var(--c2)",
            },
          ]}
          xDomain={[-2, 2]}
          yDomain={[-0.5, 2]}
          rules={[{ y: 1 }]}
        />
      </div>
      <figcaption className={styles.caption}>
        <Tex>{String.raw`f(x)=x`}</Tex> has limit 0. <Tex>{String.raw`g`}</Tex> has none.
        The product is 1 for every <Tex>{String.raw`x\neq 0`}</Tex>, so its limit is 1.
      </figcaption>
    </figure>
  );
}

export function ComparisonFigure() {
  const left = linspace(-2, -0.02, 16).map((x) => ({ x, y: -1 }));
  const right = linspace(0.02, 2, 16).map((x) => ({ x, y: 1 }));
  const g = linspace(-2, 2, 16).map((x) => ({ x, y: 1 }));
  return (
    <figure>
      <Plot
        ariaLabel="Sign function below the constant 1, with no limit at 0"
        series={[
          {
            id: "f",
            label: <Tex>{String.raw`f(x)=\operatorname{sgn}(x)`}</Tex>,
            points: [...left, null, ...right],
          },
          {
            id: "g",
            label: <Tex>{String.raw`g(x)=1`}</Tex>,
            points: g,
            color: "var(--c2)",
          },
        ]}
        markers={[
          { x: 0, y: 1, open: true },
          { x: 0, y: -1, open: true },
        ]}
        xDomain={[-2, 2]}
        yDomain={[-1.6, 1.8]}
        rules={[{ y: 0 }]}
      />
      <figcaption className={styles.caption}>
        <Tex>{String.raw`f(x)\le g(x)`}</Tex> holds for every x, once{" "}
        <Tex>{String.raw`\operatorname{sgn}(0)=0`}</Tex>. The limit of{" "}
        <Tex>f</Tex> at 0 does not exist, so the claimed comparison of limits
        has nothing to compare.
      </figcaption>
    </figure>
  );
}

export function IvtFigure() {
  const xs = linspace(0, 2, 120);
  const curve = (x: number) => 2 - 0.5 * x * x;
  const h = (x: number) => curve(x) - x * x;
  const root = Math.sqrt(4 / 3);
  return (
    <figure>
      <div className={styles.pair}>
        <Plot
          ariaLabel="An example continuous function crossing y equals x squared"
          series={[
            {
              id: "sq",
              label: <Tex>{String.raw`y=x^2`}</Tex>,
              points: xs.map((x) => ({ x, y: x * x })),
              color: "var(--c3)",
            },
            {
              id: "f",
              label: <Tex>{String.raw`f(x)=2-\tfrac12 x^2`}</Tex>,
              points: mapx(xs, curve),
            },
          ]}
          markers={[{ x: root, y: root * root, label: "example c" }]}
          xDomain={[0, 2]}
          yDomain={[-0.2, 4.3]}
          rules={[{ y: 4 }]}
        />
        <Plot
          ariaLabel="Auxiliary function h of x equals f of x minus x squared crossing zero"
          series={[
            {
              id: "h",
              label: <Tex>{String.raw`h(x)=f(x)-x^2`}</Tex>,
              points: mapx(xs, h),
              color: "var(--c2)",
            },
          ]}
          markers={[{ x: root, y: 0, color: "var(--c2)" }]}
          xDomain={[0, 2]}
          yDomain={[-4.4, 2.4]}
          rules={[{ y: 0 }]}
          yLabel="h(x)"
        />
      </div>
      <figcaption className={styles.caption}>
        One example: <Tex>{String.raw`f(0)=2>0`}</Tex> and <Tex>{String.raw`f(2)=0<4`}</Tex>,
        so <Tex>{String.raw`h(0)>0>h(2)`}</Tex>. The proof uses the intermediate value
        theorem on <Tex>{String.raw`h`}</Tex> for an arbitrary continuous <Tex>f</Tex>.
      </figcaption>
    </figure>
  );
}
