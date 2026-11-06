"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeometryFigure, PhaseFigure, ProbeFigure, type Snap } from "./figures";
import { importanceFor, ToyModel } from "./model";
import { SphereFigure, StaircaseFigure } from "./more";
import { Tour } from "./tour";
import styles from "./superposition.module.css";
import { Scrub, Term, TeX, useVisible, type Focus } from "./widgets";

const M = 2;
const BUDGET = 5000; // steps per press of "train"
const SNAP_EVERY = 20;
const STEPS_PER_FRAME = 8;

export function SuperpositionEssay() {
  const [n, setN] = useState(5);
  const [density, setDensity] = useState(0.05);
  const [decay, setDecay] = useState(0.9);
  const [seed, setSeed] = useState(1);
  const [focus, setFocus] = useState<Focus>(null);
  const [playing, setPlaying] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const model = useRef<ToyModel | null>(null);
  const evalSet = useRef<Float64Array | null>(null);
  const snaps = useRef<Snap[]>([]);
  const stopAt = useRef(BUDGET);
  const edited = useRef(false);
  const figRef = useRef<HTMLDivElement>(null);
  const visible = useVisible(figRef);
  const reduced = useRef(false);

  const importance = useMemo(() => importanceFor(n, decay), [n, decay]);

  const snapshot = (m: ToyModel): Snap => ({
    step: m.steps,
    loss: m.evaluate(evalSet.current!),
    W: m.W.slice(),
    b: m.b.slice(),
  });

  // A new model whenever the setup changes. It starts training by itself
  // unless the reader asked for less motion.
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const m = new ToyModel(n, M, density, importance, seed);
    model.current = m;
    evalSet.current = m.makeEvalSet(2048, seed + 99);
    snaps.current = [snapshot(m)];
    stopAt.current = BUDGET;
    setScrub(null);
    setPlaying(!reduced.current);
    setTick((t) => t + 1);
  }, [n, density, importance, seed]);

  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      const m = model.current;
      if (!m) return;
      for (let k = 0; k < STEPS_PER_FRAME && m.steps < stopAt.current; k++) {
        m.step(256, 0.01);
        if (m.steps % SNAP_EVERY === 0) snaps.current.push(snapshot(m));
      }
      if (m.steps >= stopAt.current) {
        setPlaying(false);
        setTick((t) => t + 1);
        return;
      }
      if (ts - last > 40) {
        last = ts;
        setTick((t) => t + 1);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible]);

  const onPlay = useCallback(() => {
    const m = model.current;
    if (!m) return;
    if (m.steps >= stopAt.current) stopAt.current = m.steps + 2000;
    setScrub(null);
    setPlaying(true);
  }, []);
  const onPause = useCallback(() => setPlaying(false), []);
  const onReset = useCallback(() => setSeed((s) => s + 1), []);

  const onDrag = useCallback((i: number, x: number, y: number) => {
    const m = model.current;
    if (!m) return;
    setPlaying(false);
    m.W[i] = x;
    m.W[m.n + i] = y;
    edited.current = true;
    setTick((t) => t + 1);
  }, []);
  const onDragEnd = useCallback(() => {
    const m = model.current;
    if (!m || !edited.current) return;
    edited.current = false;
    m.resetOptimizer();
    snaps.current.push({ ...snapshot(m), edited: true });
    setTick((t) => t + 1);
  }, []);

  const m = model.current;
  const live: Snap | null =
    m && m.n === n ? { step: m.steps, loss: m.evaluate(evalSet.current!), W: m.W, b: m.b } : null;
  const shown = scrub !== null && snaps.current[scrub] ? snaps.current[scrub] : live;

  const pct = (v: number) => (v >= 0.1 ? `${Math.round(v * 100)}%` : `${+(v * 100).toPrecision(2)}%`);

  return (
    <article className={`prose ${styles.root}`}>
      <p className={styles.draftNote}>
        <b>Mock post.</b> A test of a format: every figure below is computed in your browser while you read, and every
        number in <span className={styles.scrubSample}>this colour</span> can be dragged. The model is real; the prose is a
        sketch, and the claims in it are only about this toy.
      </p>

      <p>
        A layer with two neurons can hold two independent directions. Ask it to carry five features and something has to
        give. If the layer were linear, it could keep two of them and drop the rest. With a ReLU after it, and with
        features that are rarely on at the same time, it can do something stranger: keep all five, packed at angles to
        each other, and pay for it with a little interference. Elhage et al. call this <em>superposition</em>
        <a href="#ref-elhage" className={styles.cite}>
          [1]
        </a>
        . This page rebuilds their smallest example.
      </p>

      <h2>The model</h2>
      <p>
        An input <TeX>{"x \\in [0,1]^n"}</TeX> is pressed into <TeX>{"m"}</TeX> numbers and unpacked again by the same
        matrix, followed by a bias and a ReLU:
      </p>
      <TeX block>
        {
          "h = Wx, \\qquad x' = \\mathrm{ReLU}(W^{\\top} W x + b), \\qquad L = \\mathbb{E}_x \\sum_i I_i\\,(x_i - x'_i)^2."
        }
      </TeX>
      <p>
        Column <TeX>{"W_i"}</TeX> is the direction feature <TeX>{"i"}</TeX> is written to. Here we take{" "}
        <Scrub value={n} min={2} max={12} step={1} format={(v) => `${v}`} onChange={setN} label="Number of features" />{" "}
        features in <TeX>{"m = 2"}</TeX> dimensions. Each feature is on{" "}
        <Scrub
          value={density}
          min={0.005}
          max={1}
          step={0.05}
          log
          format={pct}
          onChange={setDensity}
          label="Feature density"
        />{" "}
        of the time (uniform on <TeX>{"[0,1]"}</TeX> when it is), and each one matters{" "}
        <Scrub
          value={decay}
          min={0.5}
          max={1}
          step={0.01}
          format={(v) => `${v.toFixed(2)}×`}
          onChange={setDecay}
          label="Importance decay"
        />{" "}
        as much as the one before it, so <TeX>{"I_i = " + decay.toFixed(2) + "^{\\,i-1}"}</TeX>.
      </p>

      <div ref={figRef}>
        {shown ? (
          <GeometryFigure
            n={n}
            importance={importance}
            inputs={evalSet.current!.subarray(0, 512 * n)}
            shown={shown}
            snaps={snaps.current}
            scrub={scrub}
            setScrub={(i) => {
              setPlaying(false);
              setScrub(i);
            }}
            playing={playing}
            onPlay={onPlay}
            onPause={onPause}
            onReset={onReset}
            onDrag={onDrag}
            onDragEnd={onDragEnd}
            canDrag={scrub === null}
            focus={focus}
            setFocus={setFocus}
            tick={tick}
          />
        ) : (
          <div className={styles.placeholder} />
        )}
        <p className={styles.caption}>
          <b>Figure 1.</b> Each arrow is a column <TeX>{"W_i"}</TeX>, darker for more important features, with a faint
          trail of where it has been. Drag an arrow&apos;s tip to set it by hand and watch the loss; press train to let
          gradient descent take it back. Drag along the loss curve to replay the run. While training is paused, pointing at an
          arrow draws its loss landscape: the loss for every place that one arrow could sit, with the rest of the model
          held still. The cross marks the lowest point.
        </p>
      </div>

      <p>
        Scrub the density and three regimes appear. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={() => setDensity(1)}>
          100%
        </button>{" "}
        the model does what a linear one would: two features get a dimension each and the rest are left at zero. Around{" "}
        <button type="button" className={styles.inlineBtn} onClick={() => setDensity(0.3)}>
          30%
        </button>{" "}
        features start to share, in antipodal pairs. By{" "}
        <button type="button" className={styles.inlineBtn} onClick={() => setDensity(0.05)}>
          5%
        </button>{" "}
        all five are kept, as a regular pentagon. (These are the outcomes I saw with the default seed; other seeds
        occasionally stop in a different arrangement, which is worth a try with &ldquo;new seed&rdquo;.)
      </p>
      <p>
        Two readings of the same picture sit beside it. The{" "}
        <Term focus={{ kind: "interference" }} setFocus={setFocus}>
          off-diagonal entries of <TeX>{"W^\\top W"}</TeX>
        </Term>{" "}
        are the interference: how much of feature <TeX>{"j"}</TeX> leaks into feature <TeX>{"i"}</TeX>&apos;s output.
        The{" "}
        <Term focus={{ kind: "dims" }} setFocus={setFocus}>
          dimensionality
        </Term>{" "}
        <TeX>{"D_i = \\lVert W_i \\rVert^2 / \\sum_j (\\hat W_i \\cdot W_j)^2"}</TeX>, also from [1], says how much of a
        dimension a feature gets: <TeX>{"1"}</TeX> on its own, <TeX>{"1/2"}</TeX> in an antipodal pair,{" "}
        <TeX>{"2/5"}</TeX> in the pentagon, <TeX>{"0"}</TeX> when dropped. The tick marks in the table sit at{" "}
        <TeX>{"1/2"}</TeX> and <TeX>{"2/5"}</TeX>. In every run I tried, the column sum came out close to{" "}
        <TeX>{"m = 2"}</TeX>; I have not checked whether that is forced.
      </p>

      <h2>The same story, by scrolling</h2>
      <p>
        If dragging numbers is too much freedom, here is the guided version. Scroll, and the figure walks through five
        trained models.
      </p>

      <Tour />

      <h2>Why sparsity pays for the interference</h2>
      <p>
        In the pentagon, neighbouring features sit <TeX>{"72^\\circ"}</TeX> apart, so turning one feature on pushes
        some signal into its two neighbours, and a negative signal into the two across from it. The ReLU removes the
        negative part outright. The{" "}
        <Term focus={{ kind: "bias" }} setFocus={setFocus}>
          negative biases
        </Term>{" "}
        trim the positive part, but not to zero: with the default settings a single input still leaks roughly 0.1–0.2
        into each neighbour. Turn on two features and they push each other&apos;s outputs too high; turn on three and
        the leaks grow. The model accepts these errors because, when features are rare, inputs with several features on
        are rare too.
      </p>

      {shown ? <ProbeFigure n={n} W={shown.W} b={shown.b} importance={importance} /> : null}
      <p className={styles.caption}>
        <b>Figure 2.</b> The model of Figure 1, as it is right now, applied to one input. Click the numbers to switch
        features on or off.
      </p>

      <h2>A phase change</h2>
      <p>
        The smallest case is two features and one dimension. Feature 1 has importance 1. Change the importance of
        feature 2 and the density of both, and three solutions compete: drop feature 2, give it the only dimension, or
        put both on the line with opposite signs. The figure trains one model per cell, with two restarts each, in a
        background thread, and fills in as they finish. Compare it with the phase diagram in [1].
      </p>

      <PhaseFigure />
      <p className={styles.caption}>
        <b>Figure 3.</b> Each cell is a model trained just now. Sparse inputs at the top. A few cells near the boundary
        come out differently from run to run; a 600-step run with two restarts does not always find the global
        minimum, and &ldquo;new seeds&rdquo; shows which cells are noise.
      </p>

      <h2>A third dimension</h2>
      <p>
        Give the model one more hidden neuron and the arrows live on a sphere. Choose how many features below and drag
        the sphere to turn it. Lines join each feature to its nearest neighbours (within a small tolerance), so the
        shape the model settles into shows up as a wireframe. With six sparse features, my runs ended as three
        antipodal pairs at right angles to each other, the six vertices of an octahedron, each feature at{" "}
        <TeX>{"D = 1/2"}</TeX>. Eight features settled at about <TeX>{"D \\approx 3/8"}</TeX> each; I have not checked
        which polyhedron that is.
      </p>

      <SphereFigure />
      <p className={styles.caption}>
        <b>Figure 4.</b> <TeX>{"n"}</TeX> equally important features in <TeX>{"m = 3"}</TeX> dimensions, trained while
        you watch. Points nearer to you are darker and larger.
      </p>

      <h2>Fractions of a dimension</h2>
      <p>
        In [1], the dimensionality of each feature, plotted against how sparse the inputs are, does not slide smoothly.
        It clusters at a few fractions, which the authors connect to particular geometric arrangements. Here is a much
        smaller version: 24 features in 6 dimensions, one model per density, all trained in a background thread as the
        figure scrolls into view. In my runs the dots gather at <TeX>{"1/2"}</TeX>, then in a looser band between{" "}
        <TeX>{"2/5"}</TeX> and <TeX>{"1/3"}</TeX>, then at <TeX>{"1/4"}</TeX>. The last one is a floor rather than a
        structure: once all 24 features are kept and <TeX>{"\\sum_i D_i"}</TeX> stays near 6, the average cannot go much
        below{" "}
        <TeX>{"6/24"}</TeX>.
      </p>

      <StaircaseFigure />
      <p className={styles.caption}>
        <b>Figure 5.</b> Each column of dots is one model; each dot is one feature&apos;s <TeX>{"D_i"}</TeX>. The line is{" "}
        <TeX>{"m / \\lVert W \\rVert_F^2"}</TeX>, which [1] calls dimensions per feature. Dashed lines mark the fractions.
        This is a small, short run; treat it as a sketch of the effect, not a measurement.
      </p>

      <h2>Notes on the format</h2>
      <ul>
        <li>
          Nothing is pre-recorded. Training runs while Figure 1 is on screen and stops when it scrolls away or after
          5,000 steps.
        </li>
        <li>
          Numbers in prose are controls, after Bret Victor&apos;s <i>Explorable Explanations</i> [2]. Phrases with a
          dotted underline light up the part of a figure they name.
        </li>
        <li>
          Everything heavy runs where it will not freeze the page. Figures 3 and 5 train their 212 models in Web Workers,
          and the landscape in Figure 1 is computed only while training is paused.
        </li>
        <li>Colours, type, and dark mode come from the site&apos;s own tokens, so figures read as part of the page.</li>
      </ul>

      <h2 className={styles.refsHead}>References</h2>
      <ol className={styles.refs}>
        <li id="ref-elhage">
          N. Elhage, T. Hume, C. Olsson, et al. &ldquo;Toy Models of Superposition.&rdquo; <i>Transformer Circuits
          Thread</i>, 2022.{" "}
          <a href="https://transformer-circuits.pub/2022/toy_model/index.html">transformer-circuits.pub</a>
        </li>
        <li>
          B. Victor. &ldquo;Explorable Explanations.&rdquo; 2011.{" "}
          <a href="https://worrydream.com/ExplorableExplanations/">worrydream.com</a>
        </li>
      </ol>
    </article>
  );
}
