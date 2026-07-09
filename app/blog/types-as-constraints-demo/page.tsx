import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { TypeRefinement } from "@/components/pieces/TypeRefinement";
import { mdxOptions } from "@/lib/mdx";
import styles from "../../article.module.css";

export const metadata: Metadata = {
  title: "Types as constraints — interactive demo",
  description:
    "A playable sketch of type refinement: what a type forbids as precision increases.",
};

const closing = `
A judgment $\\Gamma \\vdash t : A$ says that under assumptions $\\Gamma$, term $t$ inhabits type $A$. Refinement tightens $A$:

$$
\\texttt{Any} \\supset \\texttt{string} \\supset \\texttt{Email} \\supset \\texttt{VerifiedEmail}
$$

Each step deletes interpretations. That is the epistemic content of a type.
`;

export default function TypesDemoPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · Interactive dummy</p>
        <h1 className={styles.title}>Types as constraints</h1>
        <p className={styles.meta}>
          <time dateTime="2026-07-09">2026-07-09</time>
          <span aria-hidden>·</span>
          <span>Demo</span>
        </p>
        <p className={styles.deck}>
          A type is not only a compiler convenience. It is a public constraint on
          what a term is allowed to mean.
        </p>
      </header>

      <article className="prose">
        <p>
          When we refine <code>Any → string → Email → VerifiedEmail</code>, we
          do not primarily <em>add</em> information. We{" "}
          <strong>forbid interpretations</strong>. That forbidding is the
          interesting part — for programming languages, and for any system that
          claims to “know” something about the world.
        </p>

        <TypeRefinement />

        <MDXRemote source={closing} options={mdxOptions} />

        <p>
          This page is a layout probe: GIF cards on the index, an embedded
          client widget, and KaTeX in the same reading flow. Replace the dummy
          copy with a real essay when ready.
        </p>
      </article>

      <p className={styles.back}>
        <Link href="/blog/">← Back to blog</Link>
      </p>
    </main>
  );
}
