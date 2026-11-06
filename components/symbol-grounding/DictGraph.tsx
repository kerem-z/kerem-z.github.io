"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";
import { Glyph, useWidth } from "../chinese-room/ui";
import { DEPS, WORDS } from "./dictionary";
import { layout } from "./layout";
import { SCRIPT } from "./script";
import styles from "./symbol-grounding.module.css";

const EDGES: [string, string][] = WORDS.flatMap((w) => DEPS[w].map((d) => [d, w] as [string, string]));
const BOX_H = 20;
const labelW = (w: string, script: boolean) => (script ? 30 : w.length * 6.7 + 14);

/**
 * The definition graph: an arrow from each word to every word whose definition
 * uses it. Node appearance is decided by the caller through `nodeClass`.
 */
export function DictGraph({
  nodeClass,
  delay,
  focus,
  setFocus,
  onToggle,
  loop = [],
  script,
  label,
}: {
  nodeClass: (w: string) => string;
  delay?: (w: string) => number;
  focus: string | null;
  setFocus: (w: string | null) => void;
  onToggle?: (w: string) => void;
  loop?: string[];
  script: boolean;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const measured = useWidth(ref);
  // Recompute the layout only when the width moves by a real amount.
  const W = Math.max(280, Math.floor(measured / 20) * 20);
  const H = Math.round(W < 560 ? W * 1.45 : W * 0.6);

  const pos = useMemo(
    () => layout(WORDS, EDGES, W, H, (w) => labelW(w, script), BOX_H),
    [W, H, script],
  );

  const loopEdges = useMemo(() => {
    const s = new Set<string>();
    for (let i = 0; i < loop.length; i++) s.add(`${loop[(i + 1) % loop.length]}>${loop[i]}`);
    return s;
  }, [loop]);
  const inLoop = new Set(loop);

  const key = (w: string) => (e: KeyboardEvent<SVGGElement>) => {
    if (onToggle && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onToggle(w);
    }
  };

  return (
    <div ref={ref} className={styles.graphWrap}>
      {measured > 0 ? (
        <svg width={W} height={H} className={styles.graph} role="group" aria-label={label}>
          <defs>
            <marker id="sg-arrow" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto">
              <path d="M0 0 L6 3 L0 6 z" className={styles.arrowHead} />
            </marker>
          </defs>
          <g>
            {EDGES.map(([d, w]) => {
              const a = pos[d];
              const b = pos[w];
              const k = `${d}>${w}`;
              const hot = loopEdges.has(k);
              const def = focus === w;
              const use = focus === d;
              // stop short of the label box so the arrowhead shows
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const tx = Math.abs(dx) / len > 0.0001 ? (labelW(w, script) / 2 + 3) / (Math.abs(dx) / len) : Infinity;
              const ty = Math.abs(dy) / len > 0.0001 ? (BOX_H / 2 + 3) / (Math.abs(dy) / len) : Infinity;
              const cut = Math.min(tx, ty, len * 0.45);
              return (
                <line
                  key={k}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x - (dx / len) * cut}
                  y2={b.y - (dy / len) * cut}
                  className={`${styles.edge} ${hot ? styles.edgeLoop : def ? styles.edgeDef : use ? styles.edgeUse : ""}`}
                  markerEnd={hot || def || use ? "url(#sg-arrow)" : undefined}
                />
              );
            })}
          </g>
          {WORDS.map((w) => {
            const p = pos[w];
            const bw = labelW(w, script);
            return (
              <g
                key={w}
                transform={`translate(${p.x} ${p.y})`}
                className={`${styles.node} ${nodeClass(w)} ${focus === w ? styles.nodeFocus : ""} ${
                  inLoop.has(w) ? styles.nodeLoop : ""
                } ${onToggle ? styles.clickable : ""}`}
                style={delay ? { transitionDelay: `${delay(w)}ms` } : undefined}
                tabIndex={0}
                role={onToggle ? "button" : undefined}
                aria-label={w}
                onPointerEnter={() => setFocus(w)}
                onPointerLeave={() => setFocus(null)}
                onFocus={() => setFocus(w)}
                onBlur={() => setFocus(null)}
                onClick={onToggle ? () => onToggle(w) : undefined}
                onKeyDown={key(w)}
              >
                <rect x={-bw / 2} y={-BOX_H / 2} width={bw} height={BOX_H} rx={2} />
                {script ? (
                  <g transform="translate(-8 -8)">
                    <Glyph g={SCRIPT[w]} size={16} />
                  </g>
                ) : (
                  <text textAnchor="middle" dy="0.35em">
                    {w}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height: 420 }} />
      )}
    </div>
  );
}
