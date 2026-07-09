import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { getAllSlugs, getContentBySlug } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";
import styles from "../../article.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  // Dedicated interactive routes live beside [slug]; exclude them here.
  const reserved = new Set(["types-as-constraints-demo"]);
  return getAllSlugs("blog")
    .filter((slug) => !reserved.has(slug))
    .map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getContentBySlug("blog", slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
  };
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getContentBySlug("blog", slug);
  if (!post) notFound();

  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog</p>
        <h1 className={styles.title}>{post.title}</h1>
        <p className={styles.meta}>
          <time dateTime={post.date}>{post.date}</time>
          <span aria-hidden>·</span>
          <span>{post.readingTime}</span>
          {post.status === "forthcoming" ? (
            <>
              <span aria-hidden>·</span>
              <span className={styles.badge}>Forthcoming</span>
            </>
          ) : null}
        </p>
        {post.description ? (
          <p className={styles.deck}>{post.description}</p>
        ) : null}
      </header>
      <article className="prose">
        <MDXRemote source={post.content} options={mdxOptions} />
      </article>
    </main>
  );
}
