import type { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { FeedbackLinks } from "@/components/FeedbackLinks";
import { getAllSlugs, getContentBySlug } from "@/lib/content";
import { formatDate } from "@/lib/dates";
import { mdxOptions } from "@/lib/mdx";
import { site } from "@/lib/site";
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
  const url = `/blog/${slug}/`;
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: site.name,
      publishedTime: post.date,
      images: [
        { url: "/og.png", width: 1200, height: 630, alt: post.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og.png"],
    },
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
          <time dateTime={post.date}>{formatDate(post.date)}</time>
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
      <FeedbackLinks title={post.title} path={`/blog/${slug}/`} />
    </main>
  );
}
