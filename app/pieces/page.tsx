import type { Metadata } from "next";
import Link from "next/link";
import styles from "../lists.module.css";

export const metadata: Metadata = {
  title: "Pieces",
  description: "Interactive essays — concepts you can step through.",
};

const pieces = [
  {
    href: "/pieces/what-is-an-explanation/",
    title: "What is an explanation?",
    description:
      "Climb an explanation ladder: saliency, counterfactuals, causal claims, formal guarantees.",
    status: "Live",
  },
];

export default function PiecesIndexPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <p className="kicker">Pieces</p>
      <h1 className={styles.title}>Pieces</h1>
      <p className={styles.lede}>
        Interactive essays. One idea, stepped carefully, with a widget that
        carries the argument.
      </p>

      <ul className={styles.list}>
        {pieces.map((piece) => (
          <li key={piece.href} className={styles.item}>
            <Link href={piece.href} className={styles.link}>
              <span className={styles.meta}>
                <span className={styles.badge}>{piece.status}</span>
              </span>
              <span className={styles.postTitle}>{piece.title}</span>
              <span className={styles.desc}>{piece.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
