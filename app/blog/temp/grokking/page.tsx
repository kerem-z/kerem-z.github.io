import type { Metadata } from "next";
import { GrokkingEssay } from "@/components/grokking/Essay";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "Memorise, then generalise",
  description:
    "A mock interactive post: a small network learns addition mod 23, memorises first, and generalises thousands of steps later, trained live in the browser.",
};

export default function GrokkingPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · draft</p>
        <h1 className={styles.title}>Memorise, then generalise</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Mock</span>
        </p>
        <p className={styles.deck}>
          A network learns to add modulo 23. It gets the examples it was shown right almost at once, and the ones it was
          not shown right only much later. Watch the table fill in.
        </p>
      </header>
      <GrokkingEssay />
    </main>
  );
}
