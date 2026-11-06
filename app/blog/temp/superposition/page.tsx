import type { Metadata } from "next";
import { SuperpositionEssay } from "@/components/superposition/Essay";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "Five features in two dimensions",
  description:
    "A mock interactive post: a toy model of superposition, trained live in the browser, with numbers you drag and figures that answer back.",
};

export default function SuperpositionPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · draft</p>
        <h1 className={styles.title}>Five features in two dimensions</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Mock</span>
        </p>
        <p className={styles.deck}>
          A small network stores more features than it has neurons. Train it here, push its weights around by
          hand, and watch where it puts them.
        </p>
      </header>
      <SuperpositionEssay />
    </main>
  );
}
