"use client";

import Link from "next/link";
import { useState } from "react";
import cr from "../chinese-room/chinese-room.module.css";
import { InlineButton, TeX } from "../chinese-room/ui";
import { closure, WORDS } from "./dictionary";
import { CORE, GroundFigure, KERNEL, StructureFigure, useMinSets } from "./GroundFigure";
import styles from "./symbol-grounding.module.css";
import { WalkFigure } from "./WalkFigure";

const FOUR = ["plant", "living", "thing", "big"];
const FOUR_GAIN = closure(FOUR).size - FOUR.length;

export function SymbolGroundingEssay() {
  const [script, setScript] = useState(false);
  const [grounded, setGrounded] = useState<Set<string>>(() => new Set(["apple"]));
  const minSets = useMinSets();
  const size = minSets ? String(minSets.size) : "…";
  const count = minSets ? minSets.sets.length.toLocaleString("en-GB") : "…";
  const N = WORDS.length;

  return (
    <article className={`prose ${cr.root}`}>
      <p className={cr.draftNote}>
        <b>Draft.</b> A working sketch on the symbol grounding problem, built around a small dictionary that is real in
        the only sense that matters here: every word in it is defined by other words in it. All the numbers on the page
        are computed from that dictionary in your browser.
      </p>

      <p>
        A dictionary explains words with words. That is fine if you already know some of them. Stevan Harnad asked
        what happens to a system that knows none of them, and has only symbols that point at other symbols
        <a href="#ref-harnad" className={cr.cite}>
          [1]
        </a>
        . His own way of putting it:
      </p>
      <blockquote>
        The problem is analogous to trying to learn Chinese from a Chinese/Chinese dictionary alone.
      </blockquote>
      <p>
        It is a close relative of <Link href="/blog/temp/chinese-room/">the Chinese room</Link>. The man in the room has a
        book that connects shapes to shapes; a Chinese/Chinese dictionary connects words to words. Neither, by itself,
        ever reaches a thing.
      </p>

      <h2>The dictionary-go-round</h2>
      <p>
        Here is a dictionary of {N} words. Small words like <i>a</i>, <i>the</i> and <i>of</i> are treated as glue
        and left out; every other word in every definition is itself an entry. Start at <i>apple</i> and follow any
        word you like.
      </p>

      <WalkFigure script={script} setScript={setScript} />
      <p className={cr.caption}>
        <b>Figure 1.</b> The entry you are on, and the trail behind you. Click a word in the definition to look it up;
        a dashed underline marks words you have already visited. The checkbox writes the dictionary in the invented
        script of the Chinese-room post, which is the position Harnad&apos;s reader is actually in.
      </p>

      <p>
        Every walk comes back on itself, and not by bad luck. The dictionary is finite and closed, so a long enough
        walk must repeat a word; after that you are going round. You can learn a great deal about the shape of the
        dictionary this way (which words lead to which, which ones you keep landing on) without learning what any of
        it is about. Turn on the script and that is all that is left.
      </p>

      <h2>Where the loop has to break</h2>
      <p>
        Suppose some words are learned another way: not from a definition but from the world, by seeing, handling and
        tasting apples until you can tell them from everything else. Call those words <i>grounded</i>. Once you have
        some, others can be learned from definitions: a word becomes learnable as soon as every word in its definition
        is known. Then more become learnable, and so on.
      </p>
      <p>
        In the figure, click words to ground them. The page computes everything that follows from definitions alone.
        Only{" "}
        <InlineButton onClick={() => setGrounded(new Set(["apple"]))}>
          <i>apple</i>
        </InlineButton>{" "}
        is grounded to begin with, and it buys nothing: no other definition can be completed from it alone. Try{" "}
        <InlineButton onClick={() => setGrounded(new Set(FOUR))}>four well-chosen words</InlineButton> instead, and{" "}
        {FOUR_GAIN} more follow from definitions.
      </p>

      <GroundFigure
        grounded={grounded}
        setGrounded={setGrounded}
        minSets={minSets}
        script={script}
        setScript={setScript}
      />
      <p className={cr.caption}>
        <b>Figure 2.</b> An arrow runs from each word to every word whose definition uses it. Filled words are
        grounded; tinted ones can be learned from definitions, in rounds; faded ones are still out of reach. Point at a
        faded word to see the loop that blocks it, and at any word to read its definition. The smallest sets are found
        by exhaustive search in a background thread.
      </p>

      <p>
        Getting everything takes more grounding than you might expect. For this dictionary the smallest number of
        grounded words that makes all {N} learnable is <b>{size}</b>, and there are {count} different sets of that
        size. The button in the figure steps through them. Which words end up in a smallest set is partly a matter of
        choice: in a two-word loop such as <i>big</i> and <i>small</i>, either one will do.
      </p>
      <p>
        There is a clean way to say which sets work. Write <TeX>{"D(w)"}</TeX> for the words in the definition of{" "}
        <TeX>{"w"}</TeX>, and <TeX>{"G"}</TeX> for the grounded words. What you know after <TeX>{"t"}</TeX> rounds is
      </p>
      <TeX block>{"K_0 = G, \\qquad K_{t+1} = K_t \\cup \\{\\, w : D(w) \\subseteq K_t \\,\\}."}</TeX>
      <p>
        <b>Claim.</b> If every definition is non-empty, the rounds eventually reach every word exactly when every cycle
        in the graph contains a word of <TeX>{"G"}</TeX>. In graph terms, <TeX>{"G"}</TeX> must be a{" "}
        <i>feedback vertex set</i>.
      </p>
      <p>
        <i>Why.</i> If some cycle avoids <TeX>{"G"}</TeX>, none of its words can ever be the first of them to be
        learned, since each needs the next one on the cycle already known; so they are never learned. Conversely, if
        every cycle meets <TeX>{"G"}</TeX>, look at the words not yet known. If there are any, follow from one of them
        to an unknown word in its definition, and keep going. A finite walk like that must repeat, which would be a
        cycle of unknown words, avoiding <TeX>{"G"}</TeX>. So at some point the walk gets stuck: it reaches an unknown
        word whose definition is entirely known, which the next round learns. Hence the unknown words run out. (This is
        also how Figure 2 finds the loop it shows you.)
      </p>
      <p>
        Finding a smallest feedback vertex set is NP-hard in general. For {N} words an exact search is quick, and the
        figure does one, by branching on the shortest loop still blocking something. While writing the page I also
        checked it a second, independent way, by trying every subset of the largest tangle of words; the two agree on
        both the size and the number of smallest sets.
      </p>

      <h2>The shape of a dictionary</h2>
      <p>
        Vincent-Lamarre, Blondin Massé, Lopes, Lord, Marcotte and Harnad ran this kind of analysis on real dictionaries
        <a href="#ref-latent" className={cr.cite}>
          [2]
        </a>
        . First strip away every word that no remaining definition uses, and repeat; what is left they call the{" "}
        <i>kernel</i>. Inside it is a <i>core</i> in which every word can be reached from every other by following
        definitions, and around the core a few <i>satellites</i>. A <i>MinSet</i> is a smallest set of words from which
        the whole dictionary can be learned, the set the previous section was looking for. They also note that the core
        alone is not enough: &ldquo;the Core cannot define all the rest of the dictionary.&rdquo;
      </p>

      <StructureFigure minSets={minSets} script={script} />
      <p className={cr.caption}>
        <b>Figure 3.</b> The same {N} words, layer by layer. In the core view, words of the kernel outside the core
        are dashed. In the MinSet view, the filled words are one smallest grounding set.
      </p>

      <table className={styles.compare}>
        <thead>
          <tr>
            <th></th>
            <th>this toy</th>
            <th>real dictionaries, as reported in [2]</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>kernel</td>
            <td>{Math.round((100 * KERNEL.size) / N)}%</td>
            <td>about 10%</td>
          </tr>
          <tr>
            <td>core</td>
            <td>{Math.round((100 * CORE.size) / N)}%</td>
            <td>most of the kernel</td>
          </tr>
          <tr>
            <td>MinSet</td>
            <td>{minSets ? `${Math.round((100 * minSets.size) / N)}%` : "…"}</td>
            <td>about 1%</td>
          </tr>
        </tbody>
      </table>

      <p>
        The toy is far denser in loops than a real dictionary, because I wrote it to be closed with as few words as
        possible, and real dictionaries carry thousands of words that nothing else depends on. So the proportions do
        not carry over; the structure does. The paper&apos;s point is that if a small set of words were grounded, the
        rest could in principle be reached through definitions.
      </p>

      <h2>What a click stands for</h2>
      <p>
        In Figure 2, grounding a word costs one click. That hides everything that makes grounding hard. Harnad&apos;s
        proposal [1] is that symbols must be grounded bottom-up in two kinds of non-symbolic representation:{" "}
        <i>iconic</i> ones, &ldquo;analogs of the proximal sensory projections of distal objects and events,&rdquo; and{" "}
        <i>categorical</i> ones, &ldquo;learned and innate feature-detectors that pick out the invariant features of
        object and event categories.&rdquo; Grounding <i>apple</i> means being able to pick out apples, which is a
        skill, not a link.
      </p>
      <p>
        This is also where the <Link href="/blog/temp/chinese-room/">Chinese room</Link> left off. The robot reply says the
        room&apos;s symbols would mean something if they were tied to cameras and motors; Searle answers that the man
        would only receive more shapes. The dictionary does not decide between them. What it does show is the shape of
        the demand: some words have to be learned from outside the dictionary. In a real dictionary, by the
        count in [2], that may be a small fraction of them, but never none.
      </p>

      <h2>What this page does not show</h2>
      <ul>
        <li>
          Learning from a definition is all or nothing here, and a word counts as known as soon as its definition is.
          Real learning is neither.
        </li>
        <li>
          Being able to compute which words are learnable is not the same as understanding them. The figures work
          identically in the invented script, which is rather the point.
        </li>
        <li>
          Whether systems trained on text, or on text and images, are in the position of the reader of a Chinese/Chinese
          dictionary is argued both ways. This page has no data on it and takes no side.
        </li>
      </ul>

      <h2 className={cr.refsHead}>References</h2>
      <ol className={cr.refs}>
        <li id="ref-harnad">
          S. Harnad. &ldquo;The Symbol Grounding Problem.&rdquo; <i>Physica D</i> 42:335–346, 1990.{" "}
          <a href="https://arxiv.org/abs/cs/9906002">arXiv:cs/9906002</a>
        </li>
        <li id="ref-latent">
          P. Vincent-Lamarre, A. Blondin Massé, M. Lopes, M. Lord, O. Marcotte, S. Harnad. &ldquo;The Latent Structure
          of Dictionaries.&rdquo; <i>Topics in Cognitive Science</i> 8(3):625–659, 2016.{" "}
          <a href="https://doi.org/10.1111/tops.12211">doi:10.1111/tops.12211</a>;{" "}
          <a href="https://arxiv.org/abs/1411.0129">arXiv:1411.0129</a>
        </li>
        <li>
          J. R. Searle. &ldquo;Minds, Brains, and Programs.&rdquo; <i>Behavioral and Brain Sciences</i> 3(3):417–424,
          1980. <a href="https://doi.org/10.1017/S0140525X00005756">doi:10.1017/S0140525X00005756</a>
        </li>
      </ol>
    </article>
  );
}
