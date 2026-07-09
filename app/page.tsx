import Link from "next/link";
import { selectedWorks, site } from "@/lib/site";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <main className={styles.main}>
      <section className={`${styles.hero} fade-up`}>
        <h1 className={styles.name}>About me</h1>
        <p className={styles.stance}>{site.stance}</p>
      </section>

      <section className={`${styles.selected} fade-up fade-up-delay-1`}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Recent</h2>
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
                <span className={styles.body}>
                  <span className={styles.titleRow}>
                    <span className={styles.title}>{work.title}</span>
                    <span className={styles.kind}>{work.kind}</span>
                  </span>
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
