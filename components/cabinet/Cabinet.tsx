"use client";

import katex from "katex";
import { useState, type ReactNode } from "react";
import { useMinSets } from "@/components/symbol-grounding/GroundFigure";
import { GroundingCycle, ScriptAnimation } from "@/components/mock-animations/Gallery";
import { ENTRIES_A } from "./anims-a";
import { ENTRIES_B } from "./anims-b";
import styles from "./cabinet.module.css";
import { Canvas, type Entry, type Tag } from "./frame";

const ENTRIES: Entry[] = [...ENTRIES_A, ...ENTRIES_B];

const TAGS: { tag: Tag | "archive"; label: string }[] = [
  { tag: "geometry", label: "geometry" },
  { tag: "chaos", label: "chaos" },
  { tag: "physics", label: "physics" },
  { tag: "life", label: "life" },
  { tag: "number", label: "number" },
  { tag: "tiling", label: "tiling" },
  { tag: "signal", label: "signal" },
  { tag: "archive", label: "from this site" },
];

function Formula({ tex }: { tex: string }) {
  return <div className={styles.formula} dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false }) }} />;
}

function Exhibit({ n, title, tag, wide, children, blurb, formula }: { n: number; title: string; tag: string; wide?: boolean; children: ReactNode; blurb: ReactNode; formula?: string }) {
  return (
    <figure className={`${styles.item} ${wide ? styles.wide : ""}`}>
      {children}
      <div className={styles.head}>
        <h3 className={styles.title}>
          <span className={styles.num}>{String(n).padStart(2, "0")}</span>
          {title}
        </h3>
        <span className={styles.tag}>{tag}</span>
      </div>
      <p className={styles.blurb}>{blurb}</p>
      {formula ? <Formula tex={formula} /> : null}
    </figure>
  );
}

/** GIFs already in the site's image folder. */
const GIFS: { src: string; title: string; blurb: string }[] = [
  { src: "/chinese-room.gif", title: "The Chinese room", blurb: "The animation on the blog index for the Chinese room draft." },
  { src: "/symbol-grounding.gif", title: "Symbol grounding", blurb: "The animation on the blog index for the symbol grounding draft: a mark, a dashed arrow, an apple." },
  { src: "/98174.gif", title: "Rotating spiral of dots", blurb: "Found in the image folder. Source not recorded yet; credit it before this page goes public." },
  { src: "/hypnosis.gif", title: "Stairwell", blurb: "Found in the image folder. Source not recorded yet; credit it before this page goes public." },
  { src: "/stairs.gif", title: "Stairs", blurb: "Found in the image folder; it looks like an animated M. C. Escher print. Source not recorded yet; credit it before this page goes public." },
  { src: "/200w.gif", title: "Rooms", blurb: "Found in the image folder; it looks like an animated M. C. Escher print. Source not recorded yet; credit it before this page goes public." },
];

export function Cabinet() {
  const [filter, setFilter] = useState<Tag | "archive" | null>(null);
  const minSets = useMinSets();
  const show = (t: Tag | "archive") => filter === null || filter === t;
  let n = 0;

  return (
    <div className={styles.root}>
      <div className={`prose ${styles.intro}`}>
        <p>
          Nothing on this page wants anything from you. Each picture below is a small program drawing into a canvas, from
          a rule short enough to state in a sentence or two. The rule is written under each one. They run only while on
          screen; if your system asks for reduced motion, each draws a single still frame instead.
        </p>
        <p>
          The last section collects the animations already on this site: the GIFs on the blog index, and two pieces
          made for the Chinese room and symbol grounding drafts.
        </p>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter by kind">
        <button type="button" className={`${styles.filter} ${filter === null ? styles.filterOn : ""}`} onClick={() => setFilter(null)}>
          all
        </button>
        {TAGS.map(({ tag, label }) => (
          <button
            key={tag}
            type="button"
            className={`${styles.filter} ${filter === tag ? styles.filterOn : ""}`}
            onClick={() => setFilter(filter === tag ? null : tag)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.grid}>
        {ENTRIES.map((e) => {
          n++;
          if (!show(e.tag)) return null;
          return (
            <Exhibit key={e.id} n={n} title={e.title} tag={e.tag} wide={e.wide} blurb={e.blurb} formula={e.formula}>
              <Canvas anim={e.anim} aspect={e.aspect} seed={e.seed} label={e.title} />
            </Exhibit>
          );
        })}

        {show("archive") ? (
          <>
            <div className={styles.sectionHead}>From this site</div>
            <Exhibit n={++n} title="An invented script" tag="from this site" wide blurb="The eighteen shapes of the Chinese room draft's rule book, drawing themselves stroke by stroke, with the English gloss the room never uses.">
              <ScriptAnimation />
            </Exhibit>
            <Exhibit n={++n} title="Grounding sets, in turn" tag="from this site" wide blurb="The symbol grounding draft's 38-word dictionary. Each smallest grounding set is lit in turn, and the words it lets you learn from definitions alone light up after it, round by round.">
              <GroundingCycle minSets={minSets} />
            </Exhibit>
            {GIFS.map((g) => (
              <Exhibit key={g.src} n={++n} title={g.title} tag="from this site" blurb={g.blurb}>
                <div className={styles.canvasBox}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.src} alt={g.title} className={styles.archive} loading="lazy" />
                </div>
              </Exhibit>
            ))}
          </>
        ) : null}
      </div>
    </div>
  );
}
