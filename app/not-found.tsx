import Link from "next/link";
import styles from "./not-found.module.css";

export default function NotFound() {
  return (
    <main className={`${styles.main} fade-up`}>
      <p className="kicker">404</p>
      <h1 className={styles.title}>Not found</h1>
      <p className={styles.copy}>
        This page is not in the current structure of the site.
      </p>
      <p>
        <Link href="/">Return home</Link>
      </p>
    </main>
  );
}
