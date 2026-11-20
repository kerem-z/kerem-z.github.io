import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { getAllSlugs, getContentBySlug } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";
import { courses } from "@/lib/site";
import styles from "../../article.module.css";
import nf from "../../not-found.module.css";

// Courses without content yet show a joke 404.
const placeholder404: Record<
  string,
  { lines: string[]; back: string }
> = {
  "iam572-rkhs": {
    lines: [
      "Am I so out of touch? No, it's the URL that is wrong.",
      "The notes saw you coming and backed slowly into the hedge.",
    ],
    back: "← Nothing to see here",
  },
  "iam529-nonlinear-dynamics": {
    lines: [
      "These aren't the notes you're looking for.",
      "Ah ah ah. You didn't say the magic word.",
    ],
    back: "← Move along",
  },
};

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return getAllSlugs("courses").map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const course = getContentBySlug("courses", slug);
  if (!course) return {};
  return {
    title: course.title,
    description: course.description,
  };
}

export default async function CourseDetailPage({ params }: Props) {
  const { slug } = await params;
  const course = getContentBySlug("courses", slug);
  if (!course) notFound();

  const meta = courses.find((item) => item.slug === slug);

  const missing = placeholder404[slug];
  if (missing) {
    return (
      <main className={`${nf.main} fade-up`}>
        <p className="kicker">404</p>
        <h1 className={nf.title}>Not found</h1>
        {missing.lines.map((line) => (
          <p key={line} className={nf.copy}>
            {line}
          </p>
        ))}
        <p>
          <Link href="/courses/">{missing.back}</Link>
        </p>
      </main>
    );
  }

  return (
    <main className={`${styles.main} ${styles.wide} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Courses</p>
        <h1 className={styles.title}>{course.title}</h1>
        {meta ? (
          <p className={styles.meta}>
            <span>{meta.semester}</span>
            <span aria-hidden>·</span>
            <span>{meta.level}</span>
          </p>
        ) : null}
        {course.description ? (
          <p className={styles.deck}>{course.description}</p>
        ) : null}
      </header>
      <article className="prose">
        <MDXRemote source={course.content} options={mdxOptions} />
      </article>
      <p className={styles.back}>
        <Link href="/courses/">← Back to courses</Link>
      </p>
    </main>
  );
}
