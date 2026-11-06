"use client";

import { useEffect, useMemo, useState } from "react";
import cr from "../chinese-room/chinese-room.module.css";
import { closure, ENTRIES, kernel, loopFrom, sccs, WORDS } from "./dictionary";
import { DictGraph } from "./DictGraph";
import styles from "./symbol-grounding.module.css";

export type MinSets = { size: number; sets: string[][] } | null;

/** Every smallest grounding set, found in a worker after the page has loaded. */
export function useMinSets(): MinSets {
  const [m, setM] = useState<MinSets>(null);
  useEffect(() => {
    const worker = new Worker(new URL("./minset.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<{ size: number; sets: string[][] }>) => setM(e.data);
    worker.postMessage(null);
    return () => worker.terminate();
  }, []);
  return m;
}

const plain = (w: string) => ENTRIES[w].replace(/\[([a-z]+)(?:\|([^\]]+))?\]/g, (_, a: string, b?: string) => b ?? a);

/** Figure 2: ground words by hand and see what the definitions then give you. */
export function GroundFigure({
  grounded,
  setGrounded,
  minSets,
  script,
  setScript,
}: {
  grounded: Set<string>;
  setGrounded: (g: Set<string>) => void;
  minSets: MinSets;
  script: boolean;
  setScript: (v: boolean) => void;
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [nth, setNth] = useState(0);
  const known = useMemo(() => closure(grounded), [grounded]);
  const learned = known.size - grounded.size;
  const out = WORDS.length - known.size;
  const loop = useMemo(() => (focus && !known.has(focus) ? loopFrom(focus, known) : []), [focus, known]);

  const toggle = (w: string) => {
    const g = new Set(grounded);
    if (g.has(w)) g.delete(w);
    else g.add(w);
    setGrounded(g);
  };

  const status = (w: string) =>
    grounded.has(w) ? styles.grounded : known.has(w) ? styles.learned : styles.unknown;

  let readout: React.ReactNode;
  if (focus) {
    const r = known.get(focus);
    readout = (
      <>
        <b>{focus}</b> — {plain(focus)}.{" "}
        {grounded.has(focus) ? (
          <span>Grounded: learned from the world, not from this definition.</span>
        ) : r !== undefined ? (
          <span>
            Learnable from its definition{r > 1 ? `, once the words learned in round ${r - 1} are known` : ""} (round {r}).
          </span>
        ) : (
          <span className={styles.warn}>
            Out of reach. Its definition leads into the loop {loop.join(" → ")} → {loop[0]}, and nothing in that loop is
            known.
          </span>
        )}
      </>
    );
  } else if (grounded.size === 0) {
    readout = <>Nothing is grounded, so nothing can be learned: every definition needs a word you do not have.</>;
  } else if (out > 0) {
    readout = <>Point at a faded word to see the loop that keeps it out of reach.</>;
  } else {
    readout = (
      <>
        Everything is learnable: {grounded.size} grounded word{grounded.size === 1 ? "" : "s"} and{" "}
        {Math.max(...known.values())} rounds of reading definitions.
      </>
    );
  }

  return (
    <figure className={cr.figure}>
      <div className={styles.tally}>
        <span>
          <i className={`${styles.key} ${styles.keyGrounded}`} /> grounded <b>{grounded.size}</b>
        </span>
        <span>
          <i className={`${styles.key} ${styles.keyLearned}`} /> learned from definitions <b>{learned}</b>
        </span>
        <span>
          <i className={`${styles.key} ${styles.keyUnknown}`} /> out of reach <b>{out}</b>
        </span>
      </div>

      <DictGraph
        nodeClass={status}
        delay={(w) => (known.has(w) && !grounded.has(w) ? Math.min(known.get(w)! * 90, 900) : 0)}
        focus={focus}
        setFocus={setFocus}
        onToggle={toggle}
        loop={loop}
        script={script}
        label="Definition graph. Activate a word to ground it."
      />

      <p className={styles.readout} aria-live="polite">
        {readout}
      </p>

      <div className={cr.controls}>
        <button
          type="button"
          className={cr.btn}
          disabled={!minSets}
          onClick={() => {
            if (!minSets) return;
            setGrounded(new Set(minSets.sets[nth % minSets.sets.length]));
            setNth((n) => n + 1);
          }}
        >
          {minSets
            ? nth === 0
              ? `ground a smallest set (${minSets.size} words)`
              : `another smallest set (${(nth % minSets.sets.length) + 1} of ${minSets.sets.length})`
            : "searching for the smallest sets…"}
        </button>
        <button type="button" className={cr.btn} onClick={() => setGrounded(new Set())}>
          clear
        </button>
        <label className={cr.toggle}>
          <input type="checkbox" checked={script} onChange={(e) => setScript(e.target.checked)} /> write it in the
          room&apos;s script
        </label>
      </div>
    </figure>
  );
}

// ---------------------------------------------------------------------------
// Figure 3: the latent structure, on this small dictionary.
// ---------------------------------------------------------------------------

export const KERNEL = kernel();
export const CORE = new Set(sccs(KERNEL)[0]);

type Stage = "all" | "kernel" | "core" | "min";

export function StructureFigure({ minSets, script }: { minSets: MinSets; script: boolean }) {
  const [stage, setStage] = useState<Stage>("kernel");
  const [focus, setFocus] = useState<string | null>(null);
  const min = new Set(minSets?.sets[0] ?? []);
  const pct = (k: number) => `${Math.round((100 * k) / WORDS.length)}%`;

  const cls = (w: string) => {
    if (stage === "all") return styles.neutral;
    if (stage === "kernel") return KERNEL.has(w) ? styles.inKernel : styles.pruned;
    if (stage === "core") return CORE.has(w) ? styles.inKernel : KERNEL.has(w) ? styles.satellite : styles.pruned;
    return min.has(w) ? styles.grounded : KERNEL.has(w) ? styles.satellite : styles.pruned;
  };

  const rows: { id: Stage; name: string; n: number | null; what: string }[] = [
    { id: "all", name: "all words", n: WORDS.length, what: "the whole dictionary" },
    { id: "kernel", name: "kernel", n: KERNEL.size, what: "after repeatedly removing words no remaining word's definition uses" },
    { id: "core", name: "core", n: CORE.size, what: "the largest set in which every word can be reached from every other by definitions" },
    { id: "min", name: "a MinSet", n: minSets?.size ?? null, what: "a smallest set from which every word can be learned" },
  ];

  return (
    <figure className={cr.figure}>
      <div className={styles.structGrid}>
        <div className={styles.structTable} role="radiogroup" aria-label="Which layer to show">
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={stage === r.id}
              className={`${styles.layer} ${stage === r.id ? styles.layerOn : ""}`}
              onClick={() => setStage(r.id)}
            >
              <span className={styles.layerName}>{r.name}</span>
              <span className={styles.layerN}>
                {r.n ?? "…"} {r.n !== null ? <span className={cr.dim}>({pct(r.n)})</span> : null}
              </span>
              <span className={styles.layerWhat}>{r.what}</span>
            </button>
          ))}
        </div>
        <DictGraph
          nodeClass={cls}
          focus={focus}
          setFocus={setFocus}
          script={script}
          label="Definition graph, showing the kernel, core and a MinSet"
        />
      </div>
    </figure>
  );
}
