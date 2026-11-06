import type { Metadata } from "next";
import { Cabinet } from "@/components/cabinet/Cabinet";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "A cabinet of small motions",
  description:
    "Twenty-odd small animations, each drawn live from a rule you can state in a sentence: attractors, tilings, pendulums, reaction–diffusion, flocks, and more.",
};

export default function CabinetPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · gallery</p>
        <h1 className={styles.title}>A cabinet of small motions</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Draft</span>
        </p>
        <p className={styles.deck}>
          Small programs, each drawing one rule over and over. Nothing to click; just watch.
        </p>
      </header>
      <Cabinet />
    </main>
  );
}
