import type { Metadata } from "next";
import { publications } from "@/lib/site";
import styles from "./research.module.css";

export const metadata: Metadata = {
  title: "Research",
  description:
    "Publications, thesis work, and research notes by Kerem Zengin.",
  openGraph: {
    title: "Research · Kerem Zengin",
    description:
      "Publications, thesis work, and research notes by Kerem Zengin.",
    url: "/research/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Kerem Zengin" }],
  },
};

const statusLabel: Record<(typeof publications)[number]["status"], string> = {
  published: "Published",
  preprint: "Preprint",
  thesis: "Thesis",
  "in preparation": "In preparation",
};

export default function ResearchPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <h1 className="sr-only">Research</h1>
      <p className={styles.lede}>
        Papers, thesis work, and notes. Links appear as they become public.
      </p>

      <ol className={styles.list}>
        {publications.map((pub) => (
          <li key={pub.title} className={styles.item}>
            <p className={styles.meta}>
              <span>{pub.year}</span>
              <span aria-hidden>·</span>
              <span>{statusLabel[pub.status]}</span>
            </p>
            <h2 className={styles.title}>
              {pub.href ? (
                <a href={pub.href} target="_blank" rel="noopener noreferrer">
                  {pub.title}
                </a>
              ) : (
                pub.title
              )}
            </h2>
            <p className={styles.authors}>{pub.authors}</p>
            <p className={styles.venue}>{pub.venue}</p>
            {pub.note ? <p className={styles.note}>{pub.note}</p> : null}
            {pub.pdf ? (
              <p className={styles.links}>
                <a href={pub.pdf} target="_blank" rel="noopener noreferrer">
                  PDF
                </a>
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </main>
  );
}
