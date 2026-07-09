"use client";

import { useMemo, useState } from "react";
import styles from "./TypeRefinement.module.css";

type Level = 0 | 1 | 2 | 3;

const levels: {
  id: Level;
  type: string;
  accepts: string[];
  forbids: string[];
  claim: string;
}[] = [
  {
    id: 0,
    type: "Any",
    accepts: ["42", '"hello"', "null", "{ x: 1 }", "() => {}"],
    forbids: [],
    claim: "Almost nothing is ruled out. Meaning is unconstrained.",
  },
  {
    id: 1,
    type: "string",
    accepts: ['"hello"', '"a@b.co"', '"not-an-email"'],
    forbids: ["42", "null", "{ x: 1 }"],
    claim: "Only string-shaped values survive. Numbers and objects are out.",
  },
  {
    id: 2,
    type: "Email",
    accepts: ['"a@b.co"', '"kerem@metu.edu.tr"'],
    forbids: ['"hello"', '"not-an-email"', "42"],
    claim: "Syntax is constrained further. A string is no longer enough.",
  },
  {
    id: 3,
    type: "VerifiedEmail",
    accepts: ['"kerem@metu.edu.tr"'],
    forbids: ['"a@b.co"', '"hello"', "42"],
    claim: "Now the type encodes a check in the world — not only a shape.",
  },
];

export function TypeRefinement() {
  const [level, setLevel] = useState<Level>(0);
  const current = levels[level];

  const progress = useMemo(() => (level / (levels.length - 1)) * 100, [level]);

  return (
    <section className={styles.shell} aria-label="Type refinement demo">
      <div className={styles.top}>
        <div>
          <p className={styles.kicker}>Interactive · Type refinement</p>
          <h3 className={styles.title}>What does this type forbid?</h3>
        </div>
        <div className={styles.typeBadge} aria-live="polite">
          <span className={styles.typeLabel}>Current type</span>
          <code className={styles.typeName}>{current.type}</code>
        </div>
      </div>

      <label className={styles.sliderLabel} htmlFor="type-level">
        Precision
      </label>
      <input
        id="type-level"
        className={styles.slider}
        type="range"
        min={0}
        max={3}
        step={1}
        value={level}
        onChange={(e) => setLevel(Number(e.target.value) as Level)}
        style={{ ["--progress" as string]: `${progress}%` }}
      />
      <div className={styles.ticks} aria-hidden>
        {levels.map((l) => (
          <button
            key={l.id}
            type="button"
            className={styles.tick}
            data-active={level === l.id}
            onClick={() => setLevel(l.id)}
          >
            {l.type}
          </button>
        ))}
      </div>

      <p className={styles.claim}>{current.claim}</p>

      <div className={styles.cols}>
        <div>
          <p className={styles.colLabel}>Still allowed</p>
          <ul className={styles.chips}>
            {current.accepts.map((item) => (
              <li key={item} className={styles.ok}>
                <code>{item}</code>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={styles.colLabel}>Forbidden</p>
          <ul className={styles.chips}>
            {current.forbids.length === 0 ? (
              <li className={styles.empty}>Nothing yet</li>
            ) : (
              current.forbids.map((item) => (
                <li key={item} className={styles.bad}>
                  <code>{item}</code>
                </li>
              ))
            )}
          </ul>
        </div>
      </div>

      <p className={styles.hint}>
        Drag the dial. Refinement is mostly subtraction — each step deletes
        interpretations.
      </p>
    </section>
  );
}
