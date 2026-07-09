import Link from "next/link";
import { nav } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/" className={styles.brand}>
          Homepage
        </Link>
        <nav className={styles.nav} aria-label="Primary">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className={styles.link}>
              {item.label}
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
