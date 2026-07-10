"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  ladderSteps,
  vignette,
  type LadderStepId,
} from "./ladder/data";
import styles from "./ExplanationLadder.module.css";

const order = ladderSteps.map((s) => s.id);

type FeatureState = Record<string, number>;

const defaults: FeatureState = {
  late_payments: 3,
  income_ratio: 0.41,
  zip_code: 0.48,
  employment_years: 1.5,
  education: 0.12,
};

function scoreOf(f: FeatureState) {
  // Toy linear score - Deny when score > 0.55
  return (
    0.28 * (f.late_payments / 5) +
    0.34 * f.income_ratio +
    0.18 * f.zip_code +
    0.12 * (1 - Math.min(f.employment_years, 10) / 10) +
    0.08 * f.education
  );
}

function decisionOf(f: FeatureState) {
  const s = scoreOf(f);
  return { score: s, label: s > 0.55 ? "Deny" : "Approve", p: Math.min(0.99, 0.5 + Math.abs(s - 0.55)) };
}

function attributions(f: FeatureState) {
  const parts = [
    { name: "late_payments", weight: 0.28 * (f.late_payments / 5), raw: f.late_payments },
    { name: "income_ratio", weight: 0.34 * f.income_ratio, raw: f.income_ratio },
    { name: "zip_code", weight: 0.18 * f.zip_code, raw: f.zip_code },
    { name: "employment_years", weight: 0.12 * (1 - Math.min(f.employment_years, 10) / 10), raw: f.employment_years },
    { name: "education", weight: 0.08 * f.education, raw: f.education },
  ];
  const max = Math.max(...parts.map((p) => p.weight), 1e-6);
  return parts
    .map((p) => ({ ...p, norm: p.weight / max }))
    .sort((a, b) => b.weight - a.weight);
}

function SaliencyVisual({
  features,
  muted,
  onToggle,
}: {
  features: FeatureState;
  muted: Set<string>;
  onToggle: (name: string) => void;
}) {
  const attrs = attributions(features).map((a) =>
    muted.has(a.name) ? { ...a, weight: 0, norm: 0 } : a,
  );
  return (
    <div className={styles.visual}>
      <p className={styles.visualLabel}>Local attribution · click to mute</p>
      <ul className={styles.bars}>
        {attrs.map((f) => (
          <li key={f.name}>
            <button
              type="button"
              className={styles.barRow}
              data-muted={muted.has(f.name)}
              onClick={() => onToggle(f.name)}
            >
              <span className={styles.barName}>{f.name}</span>
              <span className={styles.barTrack}>
                <span
                  className={styles.barFill}
                  style={{ width: `${f.norm * 100}%` }}
                />
              </span>
              <span className={styles.barVal}>{f.weight.toFixed(2)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CounterfactualVisual({
  features,
  onChange,
}: {
  features: FeatureState;
  onChange: (name: string, value: number) => void;
}) {
  const d = decisionOf(features);
  return (
    <div className={styles.visual}>
      <p className={styles.visualLabel}>Live counterfactual · drag to flip</p>
      <div className={styles.liveDecision} data-approve={d.label === "Approve"}>
        <span>{d.label}</span>
        <span className={styles.liveP}>score {d.score.toFixed(2)}</span>
      </div>
      <label className={styles.sliderBlock}>
        <span>
          late_payments <strong>{features.late_payments.toFixed(0)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={5}
          step={1}
          value={features.late_payments}
          onChange={(e) => onChange("late_payments", Number(e.target.value))}
        />
      </label>
      <label className={styles.sliderBlock}>
        <span>
          income_ratio <strong>{features.income_ratio.toFixed(2)}</strong>
        </span>
        <input
          type="range"
          min={0.05}
          max={0.8}
          step={0.01}
          value={features.income_ratio}
          onChange={(e) => onChange("income_ratio", Number(e.target.value))}
        />
      </label>
      <label className={styles.sliderBlock}>
        <span>
          employment_years <strong>{features.employment_years.toFixed(1)}</strong>
        </span>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={features.employment_years}
          onChange={(e) => onChange("employment_years", Number(e.target.value))}
        />
      </label>
      <p className={styles.cfHint}>
        Try late_payments → 0 and income_ratio → 0.25. The label flips; the world
        may not.
      </p>
    </div>
  );
}

function CausalVisual({
  intervened,
  onIntervene,
}: {
  intervened: string | null;
  onIntervene: (node: string | null) => void;
}) {
  const effect =
    intervened === "income"
      ? { y: 0.31, note: "do(income↓) shifts P(Approve) under the assumed graph." }
      : intervened === "history"
        ? { y: 0.22, note: "do(history) cuts the backdoor through income." }
        : { y: 0.09, note: "No intervention. You are only conditioning on observed values." };

  return (
    <div className={styles.visual}>
      <p className={styles.visualLabel}>Assumed DAG · click a node to intervene</p>
      <svg className={styles.dag} viewBox="0 0 320 150" role="img">
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

        {[
          { id: "income", x: 18, y: 22, label: "income" },
          { id: "history", x: 18, y: 92, label: "history" },
        ].map((n) => (
          <g
            key={n.id}
            className={styles.nodeHit}
            onClick={() => onIntervene(intervened === n.id ? null : n.id)}
            style={{ cursor: "pointer" }}
          >
            <rect
              x={n.x}
              y={n.y}
              width="88"
              height="36"
              rx="2"
              className={`${styles.node} ${intervened === n.id ? styles.nodeAccent : ""}`}
            />
            <text
              x={n.x + 44}
              y={n.y + 23}
              textAnchor="middle"
              className={styles.nodeText}
            >
              {intervened === n.id ? `do(${n.label})` : n.label}
            </text>
          </g>
        ))}

        <rect x="140" y="62" width="88" height="36" rx="2" className={styles.node} />
        <text x="184" y="85" textAnchor="middle" className={styles.nodeText}>
          model
        </text>
        <rect x="248" y="62" width="60" height="36" rx="2" className={styles.node} />
        <text x="278" y="85" textAnchor="middle" className={styles.nodeText}>
          Y
        </text>
      </svg>
      <div className={styles.causalMeter}>
        <span>P(Approve | …)</span>
        <span className={styles.barTrack}>
          <span
            className={styles.barFill}
            style={{ width: `${effect.y * 100}%` }}
          />
        </span>
        <strong>{effect.y.toFixed(2)}</strong>
      </div>
      <p className={styles.cfHint}>{effect.note}</p>
    </div>
  );
}

function FormalVisual({
  epsilon,
  onEpsilon,
}: {
  epsilon: number;
  onEpsilon: (v: number) => void;
}) {
  const stable = epsilon <= 0.035;
  const size = 2.8 + epsilon * 80;

  return (
    <div className={styles.visual}>
      <p className={styles.visualLabel}>Certified neighborhood · grow ε</p>
      <div className={styles.cert}>
        <div
          className={styles.certBall}
          data-broken={!stable}
          style={{ width: `${size}rem`, height: `${size}rem` }}
        >
          <span>ε = {epsilon.toFixed(3)}</span>
        </div>
        <div className={styles.certCopy}>
          <p>
            <strong>{stable ? "Stable: Deny" : "Certificate breaks"}</strong>
          </p>
          <p>
            {stable
              ? "All points in the ℓ∞ ball keep the same label."
              : "A nearby Approve point enters the ball. No free lunch."}
          </p>
          <p className={styles.certBadge}>
            {stable ? "certificate · local · model-level" : "outside certified region"}
          </p>
        </div>
      </div>
      <label className={styles.sliderBlock}>
        <span>
          radius ε <strong>{epsilon.toFixed(3)}</strong>
        </span>
        <input
          type="range"
          min={0.005}
          max={0.08}
          step={0.001}
          value={epsilon}
          onChange={(e) => onEpsilon(Number(e.target.value))}
        />
      </label>
    </div>
  );
}

export function ExplanationLadder() {
  const labelId = useId();
  const [active, setActive] = useState<LadderStepId>("saliency");
  const [features, setFeatures] = useState<FeatureState>(defaults);
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [intervened, setIntervened] = useState<string | null>(null);
  const [epsilon, setEpsilon] = useState(0.02);

  const step = ladderSteps.find((s) => s.id === active)!;
  const index = order.indexOf(active);
  const decision = useMemo(() => decisionOf(features), [features]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
        return;
      e.preventDefault();
      setActive((current) => {
        const i = order.indexOf(current);
        if (e.key === "ArrowRight")
          return order[Math.min(order.length - 1, i + 1)];
        return order[Math.max(0, i - 1)];
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function setFeature(name: string, value: number) {
    setFeatures((prev) => ({ ...prev, [name]: value }));
  }

  function toggleMute(name: string) {
    setMuted((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

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
          <span
            className={styles.decisionValue}
            data-approve={decision.label === "Approve"}
          >
            {decision.label}
          </span>
          <span className={styles.decisionConf}>
            score = {decision.score.toFixed(2)}
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
          <button
            type="button"
            className={styles.reset}
            onClick={() => {
              setFeatures(defaults);
              setMuted(new Set());
              setIntervened(null);
              setEpsilon(0.02);
            }}
          >
            Reset toy state
          </button>
        </div>

        {active === "saliency" && (
          <SaliencyVisual
            features={features}
            muted={muted}
            onToggle={toggleMute}
          />
        )}
        {active === "counterfactual" && (
          <CounterfactualVisual features={features} onChange={setFeature} />
        )}
        {active === "causal" && (
          <CausalVisual intervened={intervened} onIntervene={setIntervened} />
        )}
        {active === "formal" && (
          <FormalVisual epsilon={epsilon} onEpsilon={setEpsilon} />
        )}
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
        <p className={styles.hint}>Use ← → · poke the visuals</p>
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
      <p className={styles.footnote}>
        Toy underwriting model for {vignette.title.toLowerCase()}. Not a real
        scorer - a stage for speech acts.
      </p>
    </section>
  );
}
