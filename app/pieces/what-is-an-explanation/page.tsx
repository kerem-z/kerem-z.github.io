import type { Metadata } from "next";
import Link from "next/link";
import { Cite, References } from "@/components/Citations";
import { FeedbackLinks } from "@/components/FeedbackLinks";
import { ExplanationLadder } from "@/components/pieces/ExplanationLadder";
import { vignette } from "@/components/pieces/ladder/data";
import { indexBib, loadBibFile } from "@/lib/bib";
import styles from "./piece.module.css";

export const metadata: Metadata = {
  title: "What is an explanation?",
  description:
    "An interactive essay on prediction versus explanation - saliency, counterfactuals, causal claims, and formal guarantees.",
  openGraph: {
    type: "article",
    title: "What is an explanation?",
    description:
      "An interactive essay on prediction versus explanation - saliency, counterfactuals, causal claims, and formal guarantees.",
    url: "/pieces/what-is-an-explanation/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "What is an explanation?",
    images: ["/og.png"],
  },
};

const citeOrder = [
  "miller2019explanation",
  "ribeiro2016lime",
  "wachter2017counterfactual",
  "pearl2009causality",
];

const toc = [
  { id: "question", label: "The question" },
  { id: "example", label: "A shared example" },
  { id: "ladder", label: "The ladder" },
  { id: "claims", label: "What each rung claims" },
  { id: "faithfulness", label: "Faithfulness" },
  { id: "closing", label: "Closing" },
  { id: "references", label: "References" },
];

export default function ExplanationPiecePage() {
  const refs = indexBib(loadBibFile("content/bib/explanation.bib"), citeOrder);

  return (
    <div className={styles.layout}>
      <aside className={styles.toc} aria-label="On this page">
        <p className={styles.tocLabel}>On this page</p>
        <ol>
          {toc.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`}>{item.label}</a>
            </li>
          ))}
        </ol>
      </aside>

      <main className={`${styles.main} fade-up`}>
        <header className={styles.header}>
          <p className="kicker">Interactive piece</p>
          <h1 className={styles.title}>What is an explanation?</h1>
          <p className={styles.deck}>
            Prediction is cheap. Explanation is a claim about why - and every
            claim has a type.
          </p>
        </header>

        <article className={`prose ${styles.article}`}>
          <section id="question">
            <h2>The question</h2>
            <p>
              A model that outputs the right label has not yet told you anything
              about <em>why</em> that label obtained. Accuracy answers a
              different question from explanation. One is about performance on a
              distribution. The other is about the legitimacy of a story we tell
              ourselves, a regulator, or a person affected by the decision.
              Work in the social sciences has long treated explanation as a
              pragmatic, audience-relative act
              <Cite n={1} />.
            </p>
            <blockquote>
              An explanation is not a visualization. It is an epistemic act:
              something is asserted, and something is refused.
            </blockquote>
            <p>
              The trouble with much of explainable AI is not that the tools are
              useless. It is that they quietly change the question. A heatmap
              can feel like understanding while committing to almost nothing. A
              counterfactual can sound actionable while describing only the
              model&apos;s geometry. A causal narrative can sound deep while
              resting on an unexamined graph.
            </p>
          </section>

          <section id="example">
            <h2>A shared example</h2>
            <p>{vignette.setup}</p>
            <p>
              Keep the decision fixed. What changes, as we climb the ladder, is
              not the output - it is the <strong>strength and kind</strong> of
              claim we are allowed to make about that output.
            </p>
          </section>

          <section id="ladder">
            <h2>The ladder</h2>
            <p>
              Step through four explanation styles. For each rung, read the
              claim, look at the toy visual, and notice the “does not entail”
              list. The interesting part is usually what the explanation{" "}
              <em>refuses</em> to say.
            </p>
            <ExplanationLadder />
          </section>

          <section id="claims">
            <h2>What each rung claims</h2>
            <h3>Saliency</h3>
            <p>
              Attribution methods answer a local sensitivity question: which
              coordinates mattered for this score. Local surrogate explanations
              such as LIME popularized this style of “why”
              <Cite n={2} />. They are often good at directing attention and bad
              at supporting intervention talk. A bright feature is not yet a
              lever.
            </p>
            <h3>Counterfactual</h3>
            <p>
              Counterfactuals answer a model-edit question: what nearby input
              would flip the label
              <Cite n={3} />. They are closer to action than saliency, but still
              silent about feasibility in the world and about whether the edit
              path is stable for other people.
            </p>
            <h3>Causal</h3>
            <p>
              Causal explanations answer an intervention question under
              assumptions. The graph is doing real work
              <Cite n={4} />. If the graph is wrong, the story can be fluent and
              false. Conditioning is not intervening; that distinction is the
              whole point.
            </p>
            <h3>Formal guarantee</h3>
            <p>
              Certificates answer a robustness question inside a stated region.
              They are narrower and, for that reason, often more honest.
              Stability is not fairness, wisdom, or understanding - but it is a
              claim that can be checked.
            </p>
          </section>

          <section id="faithfulness">
            <h2>Faithfulness versus plausibility</h2>
            <p>
              Humans like explanations that sound like the ones we give each
              other. Models do not owe us that genre. A plausible story can be
              unfaithful to the computation; a faithful description can be
              psychologically unsatisfying. Confusing the two is how
              interpretability becomes theater.
            </p>
            <p>
              One useful discipline: for any explanation artifact, ask what
              would count as a counterexample. If nothing could falsify it, it
              was never a claim - only a mood.
            </p>
          </section>

          <section id="closing">
            <h2>Closing</h2>
            <p>
              Explanation, on this view, is typed. Saliency, counterfactuals,
              causal stories, and certificates occupy different positions in a
              space of commitments. Climbing the ladder is not automatically
              progress; it is a change of speech act.
            </p>
            <p>
              The practical moral is modest. Before asking a model to explain
              itself, decide what kind of answer would be allowed to change your
              mind - and what kind would only decorate a decision you had
              already made.
            </p>
          </section>
        </article>

        <References items={refs.map(({ n, text }) => ({ n, text }))} />

        <FeedbackLinks
          title="What is an explanation?"
          path="/pieces/what-is-an-explanation/"
        />

        <footer className={styles.footer}>
          <p>
            Related:{" "}
            <Link href="/blog/formal-interpretability/">
              Formal Methods in ML Interpretability
            </Link>
            {" · "}
            <Link href="/blog/causal-structures/">
              Causal Structures in Neural Networks
            </Link>
          </p>
        </footer>
      </main>
    </div>
  );
}
