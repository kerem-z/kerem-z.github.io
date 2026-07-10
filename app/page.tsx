import type { Metadata } from "next";
import Link from "next/link";
import { selectedWorks, site } from "@/lib/site";
import { formatDate } from "@/lib/dates";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  openGraph: {
    title: site.title,
    description: site.description,
    url: "/",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: site.name }],
  },
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      <section className={`${styles.hero} fade-up`}>
        <h1 className={styles.name}>About me</h1>
        <p className={styles.lead}>{site.aboutLead}</p>
        <p className={styles.body}>
          I write about some things on some stuff. You can find it{" "}
          <Link href="/blog/">here</Link>.
        </p>
        <p className={styles.links}>
          <a href={site.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          <a href={`mailto:${site.email}`}>Email</a>
          <span className={styles.sep} aria-hidden>
            ·
          </span>
          <a href={site.x} target="_blank" rel="noopener noreferrer">
            X
          </a>
        </p>
      </section>

      <section className={`${styles.selected} fade-up fade-up-delay-1`}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recent Posts</h2>
        </div>

        <ol className={styles.list}>
          {selectedWorks.map((work) => (
            <li key={work.href} className={styles.item}>
              <Link href={work.href} className={styles.row}>
                {work.image ? (
                  <span className={styles.thumb}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={work.image} alt="" />
                  </span>
                ) : (
                  <span className={styles.index}>{work.index}</span>
                )}
                <span className={styles.bodyText}>
                  <span className={styles.meta}>
                    {work.date ? (
                      <time dateTime={work.date}>{formatDate(work.date)}</time>
                    ) : null}
                    {work.categories.map((cat) => (
                      <span key={cat} className={styles.cat}>
                        {cat}
                      </span>
                    ))}
                  </span>
                  <span className={styles.title}>{work.title}</span>
                  <span className={styles.blurb}>{work.blurb}</span>
                </span>
                <span className={styles.arrow} aria-hidden>
                  →
                </span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
