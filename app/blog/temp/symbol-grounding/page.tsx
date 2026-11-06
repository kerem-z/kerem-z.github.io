import type { Metadata } from "next";
import { SymbolGroundingEssay } from "@/components/symbol-grounding/Essay";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "The symbol and the apple",
  description:
    "A draft on the symbol grounding problem: a small closed dictionary, the loops in it, and how many words must be learned from the world before the rest can be learned from definitions.",
};

export default function SymbolGroundingPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · draft</p>
        <h1 className={styles.title}>The symbol and the apple</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Draft</span>
        </p>
        <p className={styles.deck}>
          A dictionary in which every word is defined by other words, and the question of where, if anywhere, it
          touches the world.
        </p>
      </header>
      <SymbolGroundingEssay />
    </main>
  );
}
