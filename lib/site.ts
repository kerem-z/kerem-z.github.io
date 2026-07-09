export const site = {
  name: "Kerem Zengin",
  title: "Kerem Zengin — essays on structure, explanation, and mind",
  description:
    "Essays and notes on type theory, explainable AI, category theory, cognitive science, and the philosophy of mind. Teaching assistant courses at METU IAM.",
  url: "https://kerem-z.github.io",
  email: "kerem.zengin@metu.edu.tr",
  github: "https://github.com/kerem-z",
  stance: "Essays on structure, explanation, and mind.",
} as const;

export const nav = [
  { href: "/blog/", label: "Blog" },
  { href: "/courses/", label: "Courses" },
] as const;

export type SelectedWork = {
  index: string;
  title: string;
  href: string;
  kind: "piece" | "essay";
  blurb: string;
  image?: string;
};

export const selectedWorks: SelectedWork[] = [
  {
    index: "01",
    title: "What is an explanation?",
    href: "/pieces/what-is-an-explanation/",
    kind: "piece",
    blurb: "Prediction is cheap. Explanation is a claim about why.",
    image: "/stairs.gif",
  },
  {
    index: "02",
    title: "Causal Structures in Neural Networks",
    href: "/blog/causal-structures/",
    kind: "essay",
    blurb: "Do-calculus as an epistemic tool, not a dashboard feature.",
    image: "/200w.gif",
  },
  {
    index: "03",
    title: "Types as constraints — interactive demo",
    href: "/blog/types-as-constraints-demo/",
    kind: "essay",
    blurb: "A playable sketch of refinement: what a type forbids.",
    image: "/hypnosis.gif",
  },
];

export type CourseMeta = {
  slug: string;
  code: string;
  title: string;
  description: string;
  level: string;
  semester: string;
  status: "current" | "previous";
  topics: string[];
  image: string;
};

export const courses: CourseMeta[] = [
  {
    slug: "iam529-nonlinear-dynamics",
    code: "IAM529",
    title: "Applied Nonlinear Dynamics",
    description:
      "Advanced study of nonlinear dynamical systems with applications to physics, biology, and engineering. Covers phase portraits, bifurcation theory, chaos, and stability analysis.",
    level: "Graduate",
    semester: "Fall 2025",
    status: "current",
    topics: [
      "Dynamical Systems",
      "Bifurcation Theory",
      "Chaos Theory",
      "Stability Analysis",
    ],
    image: "/98174.gif",
  },
  {
    slug: "iam572-rkhs",
    code: "IAM775",
    title: "Reproducing Kernel Hilbert Spaces",
    description:
      "Mathematical foundations of reproducing kernel Hilbert spaces with applications to machine learning, approximation theory, and functional analysis.",
    level: "Graduate",
    semester: "Spring 2024",
    status: "previous",
    topics: ["Functional Analysis", "Kernel Methods", "Approximation Theory"],
    image: "/Hilbert.jpg",
  },
];

export type BlogCard = {
  slug: string;
  title: string;
  description: string;
  href: string;
  image: string;
  kind: "piece" | "essay";
  date?: string;
  status?: "published" | "forthcoming";
};

export const blogCards: BlogCard[] = [
  {
    slug: "what-is-an-explanation",
    title: "What is an explanation?",
    description:
      "Climb an explanation ladder: saliency, counterfactuals, causal claims, formal guarantees.",
    href: "/pieces/what-is-an-explanation/",
    image: "/stairs.gif",
    kind: "piece",
    status: "published",
  },
  {
    slug: "types-as-constraints-demo",
    title: "Types as constraints — interactive demo",
    description:
      "A playable sketch of type refinement: drag the precision dial and watch what gets forbidden.",
    href: "/blog/types-as-constraints-demo/",
    image: "/hypnosis.gif",
    kind: "essay",
    date: "2026-07-09",
    status: "published",
  },
  {
    slug: "causal-structures",
    title: "Causal Structures in Neural Networks",
    description:
      "Do-calculus as an epistemic tool for reading model decisions — not a dashboard feature.",
    href: "/blog/causal-structures/",
    image: "/200w.gif",
    kind: "essay",
    date: "2025-09-06",
    status: "forthcoming",
  },
  {
    slug: "formal-interpretability",
    title: "Formal Methods in ML Interpretability",
    description:
      "What would it mean for an explanation to be correct, not merely persuasive?",
    href: "/blog/formal-interpretability/",
    image: "/hypnosis.gif",
    kind: "essay",
    date: "2025-08-28",
    status: "forthcoming",
  },
];
