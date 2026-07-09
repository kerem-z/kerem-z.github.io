"use client";

import { useEffect, useId, useState } from "react";
import {
  ladderSteps,
  vignette,
  type LadderStepId,
} from "./ladder/data";
import styles from "./ExplanationLadder.module.css";

const order = ladderSteps.map((s) => s.id);

function SaliencyVisual() {
  return (
    <div className={styles.visual} aria-hidden>
      <p className={styles.visualLabel}>Local attribution</p>
      <ul className={styles.bars}>
        {vignette.features.map((f) => (
          <li key={f.name} className={styles.barRow}>
            <span className={styles.barName}>{f.name}</span>
            <span className={styles.barTrack}>
              <span
                className={styles.barFill}
                style={{ width: `${f.weight * 100}%` }}
              />
            </span>
            <span className={styles.barVal}>{f.weight.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CounterfactualVisual() {
  return (
    <div className={styles.visual} aria-hidden>
      <p className={styles.visualLabel}>Minimal flip (toy)</p>
      <div className={styles.cfGrid}>
        <div>
          <span className={styles.cfHead}>Current</span>
          <p>
            late_payments <strong>3</strong>
          </p>
          <p>
            income_ratio <strong>0.41</strong>
          </p>
          <p className={styles.cfOut}>→ Deny</p>
        </div>
        <div className={styles.cfArrow}>⟶</div>
        <div>
          <span className={styles.cfHead}>Edited</span>
          <p>
            late_payments <strong>0</strong>
          </p>
          <p>
            income_ratio <strong>0.28</strong>
          </p>
          <p className={styles.cfOutGood}>→ Approve</p>
        </div>
      </div>
    </div>
  );
}

function CausalVisual() {
  return (
    <div className={styles.visual} aria-hidden>
      <p className={styles.visualLabel}>Assumed DAG</p>
      <svg
        className={styles.dag}
        viewBox="0 0 320 150"
        role="img"
        aria-label="Toy causal graph"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        <line x1="60" y1="40" x2="150" y2="75" markerEnd="url(#arrow)" />
        <line x1="60" y1="110" x2="150" y2="85" markerEnd="url(#arrow)" />
        <line x1="170" y1="80" x2="250" y2="80" markerEnd="url(#arrow)" />
        <rect x="18" y="22" width="88" height="36" rx="2" className={styles.node} />
        <text x="62" y="45" textAnchor="middle" className={styles.nodeText}>
          income
        </text>
        <rect x="18" y="92" width="88" height="36" rx="2" className={styles.node} />
        <text x="62" y="115" textAnchor="middle" className={styles.nodeText}>
          history
        </text>
        <rect
          x="140"
          y="62"
          width="88"
          height="36"
          rx="2"
          className={`${styles.node} ${styles.nodeAccent}`}
        />
        <text x="184" y="85" textAnchor="middle" className={styles.nodeText}>
          do(ratio)
        </text>
        <rect x="248" y="62" width="60" height="36" rx="2" className={styles.node} />
        <text x="278" y="85" textAnchor="middle" className={styles.nodeText}>
          Y
        </text>
      </svg>
    </div>
  );
}

function FormalVisual() {
  return (
    <div className={styles.visual} aria-hidden>
      <p className={styles.visualLabel}>Certified neighborhood</p>
      <div className={styles.cert}>
        <div className={styles.certBall}>
          <span>ε = 0.02</span>
        </div>
        <div className={styles.certCopy}>
          <p>
            <strong>Stable: Deny</strong>
          </p>
          <p>All points in the ℓ∞ ball keep the same label.</p>
          <p className={styles.certBadge}>certificate · local · model-level</p>
        </div>
      </div>
    </div>
  );
}

function StepVisual({ id }: { id: LadderStepId }) {
  switch (id) {
    case "saliency":
      return <SaliencyVisual />;
    case "counterfactual":
      return <CounterfactualVisual />;
    case "causal":
      return <CausalVisual />;
    case "formal":
      return <FormalVisual />;
  }
}

export function ExplanationLadder() {
  const labelId = useId();
  const [active, setActive] = useState<LadderStepId>("saliency");
  const step = ladderSteps.find((s) => s.id === active)!;
  const index = order.indexOf(active);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      e.preventDefault();
      setActive((current) => {
        const i = order.indexOf(current);
        if (e.key === "ArrowRight") return order[Math.min(order.length - 1, i + 1)];
        return order[Math.max(0, i - 1)];
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className={styles.shell} aria-labelledby={labelId}>
      <div className={styles.top}>
        <div>
          <p className={styles.kicker}>Interactive · Explanation ladder</p>
          <h3 id={labelId} className={styles.title}>
            Same decision, four claims
          </h3>
        </div>
        <div className={styles.decision}>
          <span className={styles.decisionLabel}>Model output</span>
          <span className={styles.decisionValue}>{vignette.decision}</span>
          <span className={styles.decisionConf}>
            p = {vignette.confidence.toFixed(2)}
          </span>
        </div>
      </div>

      <div className={styles.steps} role="tablist" aria-label="Explanation types">
        {ladderSteps.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active === s.id}
            className={styles.stepBtn}
            data-active={active === s.id}
            onClick={() => setActive(s.id)}
          >
            <span className={styles.stepIndex}>0{i + 1}</span>
            <span className={styles.stepLabel}>{s.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.panel} role="tabpanel" key={active}>
        <div className={styles.copy}>
          <p className={styles.short}>{step.short}</p>
          <p className={styles.claim}>
            <span className={styles.claimLabel}>Claims</span>
            {step.claim}
          </p>
          <div className={styles.refuse}>
            <p className={styles.claimLabel}>Does not entail</p>
            <ul>
              {step.doesNotEntail.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <StepVisual id={active} />
      </div>

      <div className={styles.controls}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() => setActive(order[Math.max(0, index - 1)])}
          disabled={index === 0}
        >
          ← Prev
        </button>
        <p className={styles.hint}>Use ← → keys</p>
        <button
          type="button"
          className={styles.navBtn}
          onClick={() =>
            setActive(order[Math.min(order.length - 1, index + 1)])
          }
          disabled={index === order.length - 1}
        >
          Next →
        </button>
      </div>
    </section>
  );
}
