export type LadderStepId =
  | "saliency"
  | "counterfactual"
  | "causal"
  | "formal";

export type LadderStep = {
  id: LadderStepId;
  label: string;
  short: string;
  claim: string;
  doesNotEntail: string[];
};

export const vignette = {
  title: "A shared decision",
  setup:
    "A toy underwriting model scores an applicant and outputs Deny. Confidence is high. Four explanation styles will now speak about the same decision.",
  decision: "Deny",
  confidence: 0.91,
  features: [
    { name: "late_payments", value: "3", weight: 0.92 },
    { name: "income_ratio", value: "0.41", weight: 0.71 },
    { name: "zip_code", value: "48202", weight: 0.48 },
    { name: "employment_years", value: "1.5", weight: 0.33 },
    { name: "education", value: "BA", weight: 0.12 },
  ],
} as const;

export const ladderSteps: LadderStep[] = [
  {
    id: "saliency",
    label: "Saliency",
    short: "What the model attended to",
    claim:
      "These input dimensions most strongly influenced the local score for this applicant.",
    doesNotEntail: [
      "That changing a highlighted feature would flip the decision",
      "That the feature caused the outcome in the world",
      "That the explanation remains valid off this neighborhood",
    ],
  },
  {
    id: "counterfactual",
    label: "Counterfactual",
    short: "What would have to change",
    claim:
      "If late_payments were 0 and income_ratio rose to 0.28, the model would output Approve on this input.",
    doesNotEntail: [
      "That those changes are feasible for the applicant",
      "That the same edits work for nearby people",
      "That the world, not only the model, would respond that way",
    ],
  },
  {
    id: "causal",
    label: "Causal",
    short: "What interventions imply",
    claim:
      "Under an assumed graph, intervening on income_ratio (not merely conditioning on it) shifts the approval probability.",
    doesNotEntail: [
      "That the assumed graph is true",
      "That unmeasured confounders are absent",
      "That the model itself implements the causal mechanism",
    ],
  },
  {
    id: "formal",
    label: "Formal guarantee",
    short: "What can be certified",
    claim:
      "Within an ℓ∞ ball of radius ε = 0.02 around this input, the decision is stable: every point in the ball is still Deny.",
    doesNotEntail: [
      "That the decision is fair, legal, or wise",
      "That stability holds outside the certified region",
      "That we understand why the region has that shape",
    ],
  },
];
