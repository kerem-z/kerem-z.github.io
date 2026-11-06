import type { Metadata } from "next";
import { VerificationEssay } from "@/components/verification/Essay";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "Proving a network cannot be fooled (in a small box)",
  description:
    "A mock interactive post on neural network verification: interval bounds, linear relaxations, and branch and bound, run live on a tiny ReLU network.",
};

export default function VerificationPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · draft</p>
        <h1 className={styles.title}>Proving a network cannot be fooled (in a small box)</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Mock</span>
        </p>
        <p className={styles.deck}>
          Testing a classifier on nearby points can find a mistake but never rule one out. Here are three ways to rule
          them out, a fast one, a sharper one, and an exact one, run on a network small enough to check them against
          the truth.
        </p>
      </header>
      <VerificationEssay />
    </main>
  );
}
