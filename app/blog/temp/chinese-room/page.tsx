import type { Metadata } from "next";
import { ChineseRoomEssay } from "@/components/chinese-room/Essay";
import styles from "../../../article.module.css";

export const metadata: Metadata = {
  title: "Shapes under the door",
  description:
    "A draft on Searle's Chinese room: work a real rule book by hand, see the replies on one drawing, and do the arithmetic on how slow the room would be.",
};

export default function ChineseRoomPage() {
  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <p className="kicker">Blog · draft</p>
        <h1 className={styles.title}>Shapes under the door</h1>
        <p className={styles.meta}>
          <time dateTime="2026-11-05">5 November 2026</time>
          <span aria-hidden>·</span>
          <span className={styles.badge}>Draft</span>
        </p>
        <p className={styles.deck}>
          A room, a rule book, and slips in a script nobody reads. Work the book by hand, then ask who, if anyone,
          understood the conversation.
        </p>
      </header>
      <ChineseRoomEssay />
    </main>
  );
}
