import type { Metadata } from "next";
import Link from "next/link";
import { blogCards } from "@/lib/site";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Essays on explanation, structure, type theory, and the philosophy of mind.",
};

export default function BlogIndexPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <h1 className={styles.title}>Blog</h1>
      <p className={styles.lede}>
        Essays and interactive pieces. Some are still forthcoming; the questions
        are already public.
      </p>

      <ul className={styles.list}>
        {blogCards.map((post) => (
          <li key={post.slug} className={styles.item}>
            <Link href={post.href} className={styles.card}>
              <span className={styles.media}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" />
              </span>
              <span className={styles.body}>
                <span className={styles.meta}>
                  {post.kind === "piece" ? (
                    <span className={styles.badge}>Piece</span>
                  ) : post.date ? (
                    <time dateTime={post.date}>{post.date}</time>
                  ) : null}
                  {post.status === "forthcoming" ? (
                    <span className={styles.badge}>Forthcoming</span>
                  ) : null}
                </span>
                <span className={styles.postTitle}>{post.title}</span>
                <span className={styles.desc}>{post.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
