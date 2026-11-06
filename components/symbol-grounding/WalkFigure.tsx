"use client";

import { useState } from "react";
import cr from "../chinese-room/chinese-room.module.css";
import { Glyph } from "../chinese-room/ui";
import { DEPS, segments, WORDS } from "./dictionary";
import { glyphFor, SCRIPT } from "./script";
import styles from "./symbol-grounding.module.css";

const START = "apple";

/** Figure 1: follow definitions from word to word, and find there is no way out. */
export function WalkFigure({ script, setScript }: { script: boolean; setScript: (v: boolean) => void }) {
  const [path, setPath] = useState<string[]>([START]);
  const here = path[path.length - 1];
  const firstVisit = path.indexOf(here);
  const back = firstVisit < path.length - 1 ? path.length - 1 - firstVisit : 0;
  const distinct = new Set(path).size;

  const go = (w: string) => setPath((p) => (p.length > 200 ? [...p.slice(-100), w] : [...p, w]));
  const wander = () =>
    setPath((p) => {
      const out = [...p];
      for (let i = 0; i < 12; i++) {
        const d = DEPS[out[out.length - 1]];
        out.push(d[Math.floor(Math.random() * d.length)]);
      }
      return out.slice(-200);
    });

  const shown = path.slice(-14);
  const offset = path.length - shown.length;

  return (
    <figure className={cr.figure}>
      <div className={styles.walkGrid}>
        <div className={styles.entry} aria-live="polite">
          <div className={styles.headword}>
            {script ? <Glyph g={SCRIPT[here]} size={44} title="the current word" /> : here}
          </div>
          <p className={styles.definition}>
            {segments(here).map((s, i) =>
              s.word ? (
                <button
                  key={i}
                  type="button"
                  className={`${styles.defLink} ${path.includes(s.word) ? styles.defSeen : ""}`}
                  onClick={() => go(s.word!)}
                  aria-label={script ? `a word of the definition, ${path.includes(s.word) ? "seen before" : "new"}` : s.text}
                >
                  {script ? <Glyph g={SCRIPT[s.word]} size={24} /> : s.text}
                </button>
              ) : script ? (
                <span key={i} className={styles.glue}>
                  {(s.text.toLowerCase().match(/[a-z]+/g) ?? []).map((t, j) => (
                    <Glyph key={j} g={glyphFor(t)} size={24} />
                  ))}
                </span>
              ) : (
                <span key={i}>{s.text}</span>
              ),
            )}
          </p>
          <p className={styles.walkNote}>
            {back
              ? script
                ? `You have been here before, ${back} step${back === 1 ? "" : "s"} ago.`
                : `Back at “${here}”, ${back} step${back === 1 ? "" : "s"} after leaving it.`
              : " "}
          </p>
        </div>

        <div className={styles.trail}>
          <div className={cr.panelHead}>
            <span>The trail</span>
            <span className={cr.dim}>
              {path.length - 1} steps · {distinct} of {WORDS.length} words
            </span>
          </div>
          <ol className={styles.trailList} start={offset + 1}>
            {shown.map((w, i) => {
              const idx = offset + i;
              const repeat = path.indexOf(w) < idx;
              return (
                <li key={idx} className={`${repeat ? styles.trailRepeat : ""} ${idx === path.length - 1 ? styles.trailHere : ""}`}>
                  {script ? <Glyph g={SCRIPT[w]} size={18} /> : w}
                  {repeat ? <span className={styles.again}> again</span> : null}
                </li>
              );
            })}
          </ol>
          <div className={cr.controls}>
            <button type="button" className={cr.btn} onClick={wander}>
              wander 12 steps
            </button>
            <button type="button" className={cr.btn} onClick={() => setPath([START])}>
              start over
            </button>
            <label className={cr.toggle}>
              <input type="checkbox" checked={script} onChange={(e) => setScript(e.target.checked)} /> write it in the
              room&apos;s script
            </label>
          </div>
          <p className={cr.counter}>exits found: 0</p>
        </div>
      </div>
    </figure>
  );
}
