"use client";

import { useState } from "react";
import styles from "./chinese-room.module.css";
import { RepliesFigure } from "./RepliesFigure";
import { RoomFigure } from "./RoomFigure";
import { RULES, VISIT_OPS, VISITOR } from "./room";
import { calendarSeconds, humanDuration, SpeedFigure } from "./SpeedFigure";
import { InlineButton, Scrub, TeX } from "./ui";

const sci = (v: number) => {
  if (v < 1e4) return Math.round(v).toLocaleString("en-GB");
  const e = Math.floor(Math.log10(v));
  const m = v / 10 ** e;
  return `${m >= 9.95 ? "10" : m.toFixed(1).replace(/\.0$/, "")}×10${toSup(m >= 9.95 ? e + 1 : e)}`;
};
const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const toSup = (n: number) =>
  String(n)
    .split("")
    .map((d) => SUP[+d])
    .join("");

export function ChineseRoomEssay() {
  const [ops, setOps] = useState(1e9);
  const [secs, setSecs] = useState(5);
  const [hours, setHours] = useState(8);
  const T = calendarSeconds(ops, secs, hours);

  return (
    <article className={`prose ${styles.root}`}>
      <p className={styles.draftNote}>
        <b>Draft.</b> A working sketch of Searle&apos;s Chinese room. The figures run in your browser; the rule book in
        the first one is a real, if very small, program. The page lays out the argument and some of the replies. It does
        not settle it.
      </p>

      <p>
        You are alone in a room with a book of rules. Slips of paper come in under the door, covered in shapes you
        cannot read. The book, which is written in a language you do know, tells you which shapes to write on a fresh
        slip and push back out. You get good at it. Outside, the people reading your slips take them for the replies of
        someone who understands the questions.
      </p>
      <p>
        That is John Searle&apos;s story, from &ldquo;Minds, Brains, and Programs&rdquo;
        <a href="#ref-searle" className={styles.cite}>
          [1]
        </a>
        . Searle used Chinese, a language he could not read. Here the shapes come from an invented script, so that
        nobody, the author included, reads them. Its only English is a gloss kept in the hallway.
      </p>

      <h2>Work the room</h2>
      <p>
        The book below has {RULES.length} rules and two pages. Each rule says: <i>if the book is open at this page and
        the slip shows these shapes, write those shapes, then perhaps turn the page.</i> A dashed circle matches any
        single shape, and the same circle in a reply means &ldquo;copy that shape here.&rdquo; The book has one
        instruction about itself: use the first rule that fits. A visitor will send {VISITOR.length} slips.
      </p>

      <RoomFigure />
      <p className={styles.caption}>
        <b>Figure 1.</b> Inside, the slip, the book and a tray of shapes; outside, what the visitor reads. Click the rule
        that fits, then write its reply from the tray. Mistakes are refused with the reason a careful clerk would give.
        The checkbox shows the hallway&apos;s gloss under every shape. Turning it on changes nothing about the procedure,
        which never consults it.
      </p>

      <p>
        A few things are worth noticing once you have done it by hand. The page the book is open at is the room&apos;s
        only memory, and it is enough for &ldquo;hello&rdquo; and &ldquo;hello again&rdquo; to come out differently.
        Rule 5 copies a shape it cannot read: the room says where the lamp is without the word, or the lamp, meaning
        anything to it. And the reply to &ldquo;do you understand me?&rdquo; and the reply that admits &ldquo;I do not
        understand&rdquo; come out of the same blind lookup.
      </p>
      <p>
        This book is tiny and the visitor is easily satisfied. Searle&apos;s thought experiment grants the opposite:
        a book good enough that nobody outside could tell the room from a native speaker. Then it asks whether
        carrying out that book is understanding. His answer is no, and his target is what he calls strong AI, the
        claim that a suitably programmed computer does not merely simulate a mind but has one. Running a program, he
        argues, is never by itself enough for that. He has no quarrel with the weaker claim that programs are useful
        tools for studying minds.
      </p>

      <h2>Who is supposed to understand?</h2>
      <p>
        The argument depends on where we look. Searle looks at the man. Many of the replies, in the
        commentaries printed with the paper and since, say he is looking in the wrong place, or at too little. The Stanford Encyclopedia entry by David Cole
        <a href="#ref-sep" className={styles.cite}>
          [2]
        </a>{" "}
        is the best map of them. The figure shows the main ones on one drawing.
      </p>

      <RepliesFigure />
      <p className={styles.caption}>
        <b>Figure 2.</b> The same room, seen six ways. The dashed box marks where each position looks for the
        understanding. Moving the box adds no new fact about the room. What changes is the question being asked. The
        summaries are paraphrases; see [1] and [2] for the arguments in full.
      </p>

      <p>
        Two of these positions touch the other drafts on this blog. The robot reply asks whether a symbol needs a causal
        tie to the world before it can be about anything; that is the symbol grounding problem, which Harnad posed with
        this room in view, recast as trying to learn Chinese from a Chinese/Chinese dictionary
        <a href="#ref-harnad" className={styles.cite}>
          [3]
        </a>
        . The systems and virtual-mind replies ask what it is for something to be a subject at all, which is a question
        this page does not try to answer.
      </p>

      <h2>How slow is the room?</h2>
      <p>
        The story asks us to imagine the man doing what a computer does, and our intuitions about him are tuned to
        human speeds. So it is worth doing the arithmetic, with the assumptions stated.
      </p>
      <p>
        Say the job takes{" "}
        <Scrub value={ops} min={10} max={1e14} step={0.1} log format={sci} onChange={setOps} label="Number of operations" />{" "}
        elementary operations, each takes the man{" "}
        <Scrub
          value={secs}
          min={0.5}
          max={60}
          step={0.5}
          format={(v) => `${v} seconds`}
          onChange={setSecs}
          label="Seconds per operation"
        />
        , and he works{" "}
        <Scrub value={hours} min={1} max={24} step={1} format={(v) => `${v} hours`} onChange={setHours} label="Hours per day" />{" "}
        a day. Then one run takes
      </p>
      <TeX block>{`T = N \\cdot s \\cdot \\frac{24}{h} \\;\\approx\\; \\text{${humanDuration(T)}}.`}</TeX>
      <p>
        Some sizes for <TeX>{"N"}</TeX>:{" "}
        <InlineButton
          onClick={() => {
            setOps(VISIT_OPS);
            setSecs(2);
          }}
        >
          the whole visit in Figure 1
        </InlineButton>{" "}
        is {VISIT_OPS} operations, counted as every check, every copied shape and every page turn. A neural network
        producing one word does very roughly one multiplication and one addition per weight, so{" "}
        <InlineButton
          onClick={() => {
            setOps(1e9);
            setSecs(5);
          }}
        >
          one word from a network with a billion weights
        </InlineButton>{" "}
        is about <TeX>{"10^9"}</TeX> multiply-adds, and{" "}
        <InlineButton
          onClick={() => {
            setOps(2e12);
            setSecs(10);
          }}
        >
          a twenty-word reply from one with a hundred billion
        </InlineButton>{" "}
        is about <TeX>{"2 \\times 10^{12}"}</TeX>. These are back-of-the-envelope figures: they ignore everything but the
        weights, count a word as one step of the model, and assume a person can multiply and add two decimals in a few
        seconds without error, which is generous.
      </p>

      <SpeedFigure seconds={T} />
      <p className={styles.caption}>
        <b>Figure 3.</b> The time for one run on a logarithmic clock, from a second to the age of the universe. Rough
        arithmetic only; drag the numbers in the paragraph above.
      </p>

      <p>
        With the man working {hours} hours a day, one word from the smaller network takes him about{" "}
        {humanDuration(calendarSeconds(1e9, 5, hours))} at five seconds a multiply-add, and the twenty-word reply from
        the larger one about {humanDuration(calendarSeconds(2e12, 10, hours))} at ten. Whether that matters is itself
        disputed. Some critics take it as a sign that our intuitions about the man are being stretched far outside the
        range where they were formed; others answer that whether understanding is present cannot depend on how fast the
        steps are taken. The encyclopedia entry [2] collects both sides. What the arithmetic does show is that the man in the story is not much like any person.
      </p>

      <h2>What this page does not do</h2>
      <ul>
        <li>
          The rule book of Figure 1 cannot hold a conversation; it handles seven slips. The argument is about books that
          could, and nobody can work those by hand.
        </li>
        <li>
          Figure 2 lists replies without weighing them. The order is the order in which they are usually told, not a
          ranking.
        </li>
        <li>
          The operation counts in Figure 3 are estimates of the right order of magnitude at best, not measurements of
          any particular system.
        </li>
      </ul>

      <h2 className={styles.refsHead}>References</h2>
      <ol className={styles.refs}>
        <li id="ref-searle">
          J. R. Searle. &ldquo;Minds, Brains, and Programs.&rdquo; <i>Behavioral and Brain Sciences</i> 3(3):417–424,
          1980, with open peer commentary and Searle&apos;s response through p. 457.{" "}
          <a href="https://doi.org/10.1017/S0140525X00005756">doi:10.1017/S0140525X00005756</a>
        </li>
        <li id="ref-sep">
          D. Cole. &ldquo;The Chinese Room Argument.&rdquo; <i>Stanford Encyclopedia of Philosophy</i>, substantive
          revision 23 October 2024. <a href="https://plato.stanford.edu/entries/chinese-room/">plato.stanford.edu</a>
        </li>
        <li id="ref-harnad">
          S. Harnad. &ldquo;The Symbol Grounding Problem.&rdquo; <i>Physica D</i> 42:335–346, 1990.{" "}
          <a href="https://arxiv.org/abs/cs/9906002">arXiv:cs/9906002</a>
        </li>
      </ol>
    </article>
  );
}
