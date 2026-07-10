import type { Metadata } from "next";
import Link from "next/link";
import { courses } from "@/lib/site";
import styles from "./courses.module.css";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Courses where Kerem Zengin serves as Teaching Assistant at METU Institute of Applied Mathematics.",
};

export default function CoursesPage() {
  const current = courses.filter((c) => c.status === "current");
  const previous = courses.filter((c) => c.status === "previous");

  return (
    <main className={`${styles.main} fade-up`}>
      <h1 className="sr-only">Courses</h1>
      <p className={styles.lede}>
        Some courses that I am (or was) a teaching assistant for.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Current semester</h2>
        <ul className={styles.list}>
          {current.map((course) => (
            <li key={course.slug}>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Previous semesters</h2>
        <ul className={styles.list}>
          {previous.map((course) => (
            <li key={course.slug}>
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function CourseCard({
  course,
}: {
  course: (typeof courses)[number];
}) {
  return (
    <Link href={`/courses/${course.slug}/`} className={styles.card}>
      <span className={styles.media}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={course.image} alt="" />
      </span>
      <div className={styles.cardBody}>
        <p className={styles.code}>
          {course.code}
          <span className={styles.dot}>·</span>
          {course.semester}
        </p>
        <h3 className={styles.cardTitle}>{course.title}</h3>
        <p className={styles.desc}>{course.description}</p>
        <div className={styles.meta}>
          <span>{course.level}</span>
        </div>
        <div className={styles.topics}>
          {course.topics.map((topic) => (
            <span key={topic} className={styles.topic}>
              {topic}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
