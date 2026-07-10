import { site } from "@/lib/site";
import styles from "./FeedbackLinks.module.css";

type Props = {
  title: string;
  path: string;
};

export function FeedbackLinks({ title, path }: Props) {
  const pageUrl = `${site.url}${path.endsWith("/") ? path : `${path}/`}`;
  const mail = `mailto:${site.email}?subject=${encodeURIComponent(`Re: ${title}`)}&body=${encodeURIComponent(`Regarding: ${pageUrl}\n\n`)}`;
  const discuss = `${site.github}/kerem-z.github.io/issues/new?title=${encodeURIComponent(`Feedback: ${title}`)}&body=${encodeURIComponent(`Page: ${pageUrl}\n\n`)}`;

  return (
    <p className={styles.row}>
      <span className={styles.label}>Reply</span>
      <a href={mail}>Email</a>
      <span className={styles.sep} aria-hidden>
        ·
      </span>
      <a href={discuss} target="_blank" rel="noreferrer">
        GitHub
      </a>
      <span className={styles.sep} aria-hidden>
        ·
      </span>
      <a href={site.x} target="_blank" rel="noreferrer">
        X
      </a>
    </p>
  );
}
