import styles from "./DemoFrame.module.css";

export function DemoFrame({ src, title }: { src: string; title: string }) {
  return <iframe className={styles.frame} src={src} title={title} />;
}
