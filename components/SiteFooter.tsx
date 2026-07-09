import Link from "next/link";
import { site } from "@/lib/site";
import styles from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <p className={styles.line}>
          <Link href="/">Homepage</Link>
          <span className={styles.sep}>·</span>
          <Link href="/blog/">Blog</Link>
          <span className={styles.sep}>·</span>
          <Link href="/courses/">Courses</Link>
          <span className={styles.sep}>·</span>
          <a href={site.github} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <span className={styles.sep}>·</span>
          <a href={`mailto:${site.email}`}>Email</a>
        </p>
      </div>
    </footer>
  );
}
