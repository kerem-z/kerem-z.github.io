"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import styles from "./chinese-room.module.css";
import { GLYPHS, TOKENS } from "./room";

type View = "man" | "system" | "memorize" | "virtual" | "robot" | "brain";

// Where each position looks for the understanding: [x, y, w, h] in scene units.
const BOX: Record<View, [number, number, number, number]> = {
  man: [272, 156, 58, 134],
  system: [100, 50, 380, 238],
  memorize: [272, 100, 98, 190],
  virtual: [196, 96, 74, 150],
  robot: [100, 22, 452, 266],
  brain: [136, 70, 160, 92],
};

const TABS: { id: View; label: string }[] = [
  { id: "man", label: "the man" },
  { id: "system", label: "the whole room" },
  { id: "memorize", label: "the book memorized" },
  { id: "virtual", label: "a virtual mind" },
  { id: "robot", label: "a robot body" },
  { id: "brain", label: "a brain simulator" },
];

const TEXT: Record<View, { claim: ReactNode; answer: ReactNode; open: ReactNode }> = {
  man: {
    claim: (
      <>
        <b>Searle.</b> The man follows the book without error and understands none of it. A computer running the same
        program has nothing he lacks, so running a program cannot be enough for understanding.
      </>
    ),
    answer: (
      <>
        The force comes from an intuition about the man: ask him, and he will say he understands nothing. Every reply
        below accepts that, and asks whether he is the right thing to ask.
      </>
    ),
    open: <>Is the man&apos;s report evidence about the room, or only about the man?</>,
  },
  system: {
    claim: (
      <>
        <b>The systems reply.</b> The man is one part, like a processor. If anything understands, it is the whole: man,
        book, scratch paper, baskets, door.
      </>
    ),
    answer: (
      <>
        <b>Searle&apos;s answer.</b> Let the man memorize the book and work in his head. Then the system is inside him,
        and he still understands nothing. (Next tab.)
      </>
    ),
    open: <>Whether a whole can have a property that none of its parts has is not settled by pointing at the parts.</>,
  },
  memorize: {
    claim: (
      <>
        <b>Searle, continued.</b> No walls, no book: only a man doing all the lookups from memory. There is nowhere left
        for a separate system to hide.
      </>
    ),
    answer: (
      <>
        Critics answer that the step from &ldquo;he does not understand&rdquo; to &ldquo;nothing here
        understands&rdquo; is the step in question. Memorizing the book changes where the work is done, not what it
        is.
      </>
    ),
    open: <>Could one head implement two minds that do not share what they know?</>,
  },
  virtual: {
    claim: (
      <>
        <b>The virtual mind reply.</b> Running the program might bring about a second mind, distinct from the man,
        much as one computer can run another computer as a program. Its understanding would be no more his than the
        guest machine&apos;s memory is the host&apos;s. The Stanford Encyclopedia entry credits David Cole with the
        most developed version.
      </>
    ),
    answer: (
      <>
        This grants Searle that the man does not understand, and denies that this settles the matter. The dashed figure
        is a picture of the claim, not an argument for it.
      </>
    ),
    open: <>What would make it true that someone is there, and not only that something behaves as if they were?</>,
  },
  robot: {
    claim: (
      <>
        <b>The robot reply.</b> Put the program in a body: a camera feeding it, motors it drives. Then its symbols are
        tied to the things they are about. The entry lists Boden, Dennett, Fodor, Harnad and Moravec among those who
        have defended versions of this.
      </>
    ),
    answer: (
      <>
        <b>Searle&apos;s answer.</b> The camera&apos;s output reaches the man as more shapes, and his output drives the
        motors as shapes. He matches them as before. The robot adds work, not meaning.
      </>
    ),
    open: (
      <>
        Is a causal link to the world what the symbols were missing? That is the symbol grounding problem, which{" "}
        <Link href="/blog/temp/symbol-grounding/">the companion post</Link> takes up.
      </>
    ),
  },
  brain: {
    claim: (
      <>
        <b>The brain simulator reply.</b> Let the program simulate, neuron by neuron, the brain of a native speaker as
        she reads the slips. Then it has the same causal shape as something that does understand.
      </>
    ),
    answer: (
      <>
        <b>Searle&apos;s answer.</b> Imagine the man opening and closing valves in a system of water pipes laid out like
        those neurons. The water and the man still understand nothing.
      </>
    ),
    open: (
      <>
        Paul and Patricia Churchland reply that no single neuron of an English speaker understands English either, and
        that our intuitions about systems this large and fast may simply be poor.
      </>
    ),
  },
};

function Figure({ x, y, scale = 1, className }: { x: number; y: number; scale?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className={className}>
      <circle cx={0} cy={0} r={11} />
      <path d="M0 11 V 62 M0 62 L -10 104 M0 62 L 10 104 M0 26 L 30 44 M0 26 L -16 50" />
    </g>
  );
}

export function RepliesFigure() {
  const [view, setView] = useState<View>("man");
  const [bx, by, bw, bh] = BOX[view];
  const on = (...vs: View[]) => (vs.includes(view) ? styles.shown : styles.hidden);
  const off = (...vs: View[]) => (vs.includes(view) ? styles.hidden : styles.shown);
  const t = TEXT[view];

  // A few glyph cards for the baskets and the camera feed.
  const cards = TOKENS.slice(0, 6);

  return (
    <figure className={styles.figure}>
      <div className={styles.tabs} role="tablist" aria-label="Where to look for understanding">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={view === tab.id}
            className={`${styles.tab} ${view === tab.id ? styles.tabOn : ""}`}
            onClick={() => setView(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={styles.repliesGrid}>
        <svg className={styles.scene} viewBox="0 0 580 300" role="img" aria-label={`The room, seen as: ${view}`}>
          {/* ground */}
          <line className={styles.ground} x1={10} y1={286} x2={570} y2={286} />

          {/* the visitor in the hallway */}
          <Figure x={52} y={182} className={styles.ink} />
          <rect className={styles.paper} x={70} y={212} width={22} height={14} />

          {/* walls, with a slot in the door */}
          <g className={`${styles.walls} ${view === "memorize" ? styles.faded : ""}`}>
            <path d="M110 286 V 60 H 470 V 286" />
            <line className={styles.doorSlot} x1={110} y1={208} x2={110} y2={226} />
          </g>

          {/* the brain simulator's pipes, on the back wall */}
          <g className={on("brain")}>
            {[0, 1, 2, 3].map((c) =>
              [0, 1, 2].map((r) => (
                <g key={`${c}-${r}`}>
                  {c < 3 ? <line className={styles.pipe} x1={160 + c * 38} y1={88 + r * 28} x2={198 + c * 38} y2={88 + ((r + c) % 3) * 28} /> : null}
                  {r < 2 ? <line className={styles.pipe} x1={160 + c * 38} y1={88 + r * 28} x2={160 + c * 38} y2={116 + r * 28} /> : null}
                  <circle className={styles.valve} cx={160 + c * 38} cy={88 + r * 28} r={4.5} />
                </g>
              )),
            )}
            <path className={styles.pipe} d="M274 144 Q 300 150 304 170" />
          </g>

          {/* desk, book, baskets */}
          <g className={off("memorize")}>
            <path className={styles.ink} d="M322 228 H 432 M332 228 V 286 M422 228 V 286" />
            <rect className={styles.paper} x={140} y={252} width={56} height={34} />
            {cards.slice(0, 3).map((tok, i) => (
              <g key={tok} transform={`translate(${148 + i * 16} 258) scale(4)`} className={styles.miniGlyph}>
                {GLYPHS[tok].map(([a, b, c, d], k) => (
                  <line key={k} x1={a} y1={b} x2={c} y2={d} />
                ))}
              </g>
            ))}
          </g>
          <g className={off("memorize", "brain")}>
            <rect className={styles.book} x={350} y={206} width={44} height={22} />
            <line className={styles.ink} x1={372} y1={206} x2={372} y2={228} />
          </g>

          {/* the man, and the book in his head */}
          <Figure x={300} y={182} className={styles.ink} />
          <g className={on("memorize")}>
            <circle className={styles.thought} cx={322} cy={156} r={3} />
            <circle className={styles.thought} cx={332} cy={142} r={5} />
            <rect className={styles.book} x={322} y={110} width={36} height={18} />
            <line className={styles.ink} x1={340} y1={110} x2={340} y2={128} />
          </g>

          {/* a second, virtual figure */}
          <g className={on("virtual")}>
            <Figure x={232} y={128} scale={1} className={styles.ghost} />
            <path className={styles.thread} d="M350 206 C 320 170, 270 170, 244 160" />
          </g>

          {/* the robot's camera and arm */}
          <g className={on("robot")}>
            <rect className={styles.ink} x={420} y={34} width={34} height={20} />
            <circle className={styles.ink} cx={454} cy={44} r={6} />
            <line className={styles.ink} x1={436} y1={54} x2={436} y2={60} />
            <path className={styles.thread} d="M436 60 C 436 120, 140 120, 120 210" />
            {cards.slice(3).map((tok, i) => (
              <g key={tok} transform={`translate(${380 - i * 70} ${98 + i * 8}) scale(3.4)`} className={styles.miniGlyph}>
                {GLYPHS[tok].map(([a, b, c, d], k) => (
                  <line key={k} x1={a} y1={b} x2={c} y2={d} />
                ))}
              </g>
            ))}
            <path className={styles.ink} d="M470 200 H 505 L 525 175 M525 175 l 10 -4 M525 175 l 4 10" />
          </g>

          {/* where this position looks for understanding */}
          <g className={styles.box} style={{ transform: `translate(${bx}px, ${by}px) scale(${bw}, ${bh})` }}>
            <rect x={0} y={0} width={1} height={1} vectorEffect="non-scaling-stroke" />
          </g>
        </svg>

        <div className={styles.replyText} aria-live="polite">
          <p>{t.claim}</p>
          <p>{t.answer}</p>
          <p className={styles.open}>
            <span className={styles.label}>still open</span> {t.open}
          </p>
        </div>
      </div>
    </figure>
  );
}
