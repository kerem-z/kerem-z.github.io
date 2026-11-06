import type { Metadata } from "next";
import { Gallery } from "@/components/mock-animations/Gallery";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "Mock animations",
  description:
    "A workbench of the visuals for the Chinese-room and symbol-grounding drafts: the old static ones and the new interactive ones, side by side and tagged by kind.",
};

export default function MockAnimationsPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · mock</p>
        <h1 className={styles.title}>Mock animations</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Mock</span>
        </p>
        <p className={styles.deck}>
          Old and new visuals for two drafts, the Chinese room and symbol grounding, kept side by side.
        </p>
      </header>
      <Gallery />
    </main>
  );
}
