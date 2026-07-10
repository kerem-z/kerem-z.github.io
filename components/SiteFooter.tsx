import Link from "next/link";
import { SocialIcons } from "./SocialIcons";
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
          <SocialIcons withSeparators />
          <span className={styles.sep}>·</span>
          <a href="/rss.xml">RSS</a>
        </p>
      </div>
    </footer>
  );
}
