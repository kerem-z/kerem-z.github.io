"use client";

/* eslint-disable @next/next/no-img-element -- the old GIFs are shown as they are, unoptimised */

import { useEffect, useState, type ReactNode } from "react";
import cr from "../chinese-room/chinese-room.module.css";
import { RepliesFigure } from "../chinese-room/RepliesFigure";
import { RoomFigure } from "../chinese-room/RoomFigure";
import { GLOSS, GLYPHS, TOKENS } from "../chinese-room/room";
import { calendarSeconds, SpeedFigure } from "../chinese-room/SpeedFigure";
import { Scrub, useReducedMotion } from "../chinese-room/ui";
import { closure, WORDS } from "../symbol-grounding/dictionary";
import { DictGraph } from "../symbol-grounding/DictGraph";
import { GroundFigure, StructureFigure, useMinSets, type MinSets } from "../symbol-grounding/GroundFigure";
import { WalkFigure } from "../symbol-grounding/WalkFigure";
import sg from "../symbol-grounding/symbol-grounding.module.css";
import styles from "./gallery.module.css";

type Kind = "old · static" | "old · interactive" | "new · interactive" | "new · animation";

function Item({ title, kinds, note, children }: { title: string; kinds: Kind[]; note: ReactNode; children: ReactNode }) {
  return (
    <section className={styles.item}>
      <div className={styles.itemHead}>
        <h3>{title}</h3>
        <ul className={styles.tags} aria-label="Categories">
          {kinds.map((k) => (
            <li key={k} className={k.startsWith("old") ? styles.tagOld : styles.tagNew}>
              {k}
            </li>
          ))}
        </ul>
      </div>
      {children}
      <p className={cr.caption}>{note}</p>
    </section>
  );
}

/** The invented script writing itself, one glyph at a time. */
export function ScriptAnimation() {
  const reduced = useReducedMotion();
  const [k, setK] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => setK((v) => v + 1), 1400);
    return () => window.clearInterval(id);
  }, [reduced]);
  return (
    <div className={`${cr.figure} ${styles.scriptRow}`}>
      {TOKENS.map((t, i) => {
        const on = reduced || i <= k % (TOKENS.length + 4);
        return (
          <span key={t} className={styles.scriptCell}>
            <svg viewBox="-0.6 -0.6 3.2 3.2" width={40} height={40} className={on ? styles.drawn : styles.undrawn}>
              {GLYPHS[t].map(([a, b, c, d], j) => (
                <line key={j} x1={a} y1={b} x2={c} y2={d} pathLength={1} style={{ animationDelay: `${j * 0.12}s` }} />
              ))}
            </svg>
            <span className={styles.scriptGloss}>{on ? GLOSS[t] : " "}</span>
          </span>
        );
      })}
    </div>
  );
}

/** Smallest grounding sets, one after another, with what each one lets you learn. */
export function GroundingCycle({ minSets }: { minSets: MinSets }) {
  const reduced = useReducedMotion();
  const [i, setI] = useState(0);
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    if (reduced || !minSets) return;
    const id = window.setInterval(() => setI((v) => v + 1), 2600);
    return () => window.clearInterval(id);
  }, [reduced, minSets]);
  const G = new Set(minSets ? minSets.sets[i % minSets.sets.length] : []);
  const known = closure(G);
  return (
    <div className={cr.figure}>
      <p className={styles.small}>
        {minSets ? `smallest set ${(i % minSets.sets.length) + 1} of ${minSets.sets.length}` : "searching…"}
      </p>
      <DictGraph
        nodeClass={(w) => (G.has(w) ? sg.grounded : known.has(w) ? sg.learned : sg.unknown)}
        delay={(w) => (G.has(w) ? 0 : Math.min((known.get(w) ?? 0) * 120, 1200))}
        focus={focus}
        setFocus={setFocus}
        script={false}
        label="The dictionary graph, cycling through smallest grounding sets"
      />
    </div>
  );
}

export function Gallery() {
  const minSets = useMinSets();
  const [script, setScript] = useState(false);
  const [grounded, setGrounded] = useState<Set<string>>(() => new Set());
  const [ops, setOps] = useState(1e9);
  const sci = (v: number) => (v < 1e4 ? `${Math.round(v)}` : `10^${Math.log10(v).toFixed(1)}`);

  return (
    <article className={`prose ${cr.root} ${styles.root}`}>
      <p className={cr.draftNote}>
        <b>Mock.</b> A workbench, not a post. Everything made for the Chinese-room and symbol-grounding drafts sits
        here side by side: the old, mostly static visuals and the new interactive figures, each tagged with what kind
        of thing it is. Nothing old was removed.
      </p>

      <h2>Chinese room</h2>

      <Item title="Index GIF" kinds={["old · static"]} note="The animation used on the blog index card.">
        <img className={styles.gif} src="/chinese-room.gif" alt="The Chinese room, animated" />
      </Item>

      <Item
        title="First draft: “Shapes under the door”"
        kinds={["old · interactive", "old · static"]}
        note="The original Distill-style page, shown whole in a frame: the inside/outside teaser and the three-shape book."
      >
        <iframe className={styles.frame} src="/demos/chinese-room/index.html" title="Old Chinese room draft" loading="lazy" />
      </Item>

      <Item
        title="The invented script"
        kinds={["new · animation"]}
        note="The 18 glyphs of the room's script drawing themselves, with the hallway's gloss underneath. The script is generated from a fixed seed, so it stays the same."
      >
        <ScriptAnimation />
      </Item>

      <Item
        title="Work the room"
        kinds={["new · interactive"]}
        note="Figure 1 of the new post: a 7-rule, 2-page rule book you run by hand."
      >
        <RoomFigure />
      </Item>

      <Item
        title="Where is the understanding?"
        kinds={["new · interactive", "new · animation"]}
        note="Figure 2 of the new post: one drawing, six readings, with a moving dashed box."
      >
        <RepliesFigure />
      </Item>

      <Item
        title="The slow room"
        kinds={["new · interactive"]}
        note={
          <>
            Figure 3 of the new post. Operations:{" "}
            <Scrub value={ops} min={10} max={1e14} step={0.1} log format={sci} onChange={setOps} label="Operations" />, at
            5 s each, 8 hours a day.
          </>
        }
      >
        <SpeedFigure seconds={calendarSeconds(ops, 5, 8)} />
      </Item>

      <h2>Symbol grounding</h2>

      <Item title="Index GIF" kinds={["old · static"]} note="The animation used on the blog index card.">
        <img className={styles.gif} src="/symbol-grounding.gif" alt="Symbol grounding, animated" />
      </Item>

      <Item
        title="First draft: “The symbol and the apple”"
        kinds={["old · interactive", "old · static"]}
        note="The original page in a frame: the symbol / ground / circle teaser, the word lookup and the apple loop."
      >
        <iframe className={styles.frame} src="/demos/symbol-grounding/index.html" title="Old symbol grounding draft" loading="lazy" />
      </Item>

      <Item
        title="Smallest grounding sets, cycling"
        kinds={["new · animation"]}
        note={`Every few seconds the next smallest grounding set of the ${WORDS.length}-word dictionary is grounded (filled), and the words it makes learnable light up in rounds.`}
      >
        <GroundingCycle minSets={minSets} />
      </Item>

      <Item title="The dictionary-go-round" kinds={["new · interactive"]} note="Figure 1 of the new post.">
        <WalkFigure script={script} setScript={setScript} />
      </Item>

      <Item title="Ground the words" kinds={["new · interactive"]} note="Figure 2 of the new post.">
        <GroundFigure grounded={grounded} setGrounded={setGrounded} minSets={minSets} script={script} setScript={setScript} />
      </Item>

      <Item title="Kernel, core, MinSet" kinds={["new · interactive"]} note="Figure 3 of the new post.">
        <StructureFigure minSets={minSets} script={script} />
      </Item>
    </article>
  );
}
