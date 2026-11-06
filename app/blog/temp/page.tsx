import type { Metadata } from "next";
import Link from "next/link";
import styles from "../../article.module.css";

export const metadata: Metadata = {
  title: "Temp",
  description: "Unlisted drafts and animations.",
};

const drafts = [
  { href: "/blog/temp/mock-animations/", title: "Mock animations" },
  { href: "/blog/temp/cabinet/", title: "A cabinet of small motions" },
  { href: "/blog/temp/verification/", title: "Proving a network cannot be fooled (in a small box)" },
  { href: "/blog/temp/grokking/", title: "Memorise, then generalise" },
  { href: "/blog/temp/superposition/", title: "Five features in two dimensions" },
  { href: "/blog/temp/interactive-note/", title: "A toy network, a stuck puck, and a score that is not real" },
  { href: "/blog/temp/symbol-grounding/", title: "The symbol and the apple" },
  { href: "/blog/temp/chinese-room/", title: "Shapes under the door" },
  { href: "/blog/temp/self-reference/", title: "A sentence that talks about itself" },
  { href: "/blog/temp/marys-room/", title: "What Mary had not seen" },
];

export default function TempIndexPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · temp</p>
        <h1 className={styles.title}>Temp</h1>
        <p className={styles.deck}>Unlisted drafts and animations.</p>
      </header>
      <ul>
        {drafts.map((d) => (
          <li key={d.href}>
            <Link href={d.href}>{d.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
