import styles from "./Citations.module.css";

export function Cite({ n }: { n: number }) {
  return (
    <a href={`#ref-${n}`} className={styles.cite} title={`Reference ${n}`}>
      [{n}]
    </a>
  );
}

export function References({
  items,
}: {
  items: { n: number; text: string }[];
}) {
  return (
    <section id="references" className={styles.refs}>
      <h2 className={styles.heading}>References</h2>
      <ol className={styles.list}>
        {items.map((item) => (
          <li key={item.n} id={`ref-${item.n}`} className={styles.item}>
            <span className={styles.num}>[{item.n}]</span>
            <span className={styles.text}>{item.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
