import type { Metadata } from "next";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";
import { notFound } from "next/navigation";
import { getAllSlugs, getContentBySlug } from "@/lib/content";
import { mdxOptions } from "@/lib/mdx";
import { courses } from "@/lib/site";
import styles from "../../article.module.css";

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

  const meta = courses.find((c) => c.slug === slug);

  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Courses</p>
        <h1 className={styles.title}>{course.title}</h1>
        <p className={styles.meta}>
          {meta ? (
            <>
              <span>{meta.semester}</span>
              <span aria-hidden>·</span>
              <span>{meta.level}</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          <span>{course.readingTime}</span>
        </p>
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
