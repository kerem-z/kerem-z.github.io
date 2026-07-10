export const site = {
  name: "Kerem Zengin",
  title: "Kerem Zengin - essays on structure, explanation, and mind",
  description:
    "Essays and notes on type theory, explainable AI, category theory, cognitive science, and the philosophy of mind. Teaching assistant courses at METU IAM.",
  url: "https://kerem-z.github.io",
  email: "kerem.zengin@metu.edu.tr",
  github: "https://github.com/kerem-z",
  x: "https://x.com/_muopchr",
  aboutLead:
    "Hi, I'm Kerem, research assistant at Institute of Applied Mathematics, METU.",
} as const;

export const nav = [
  { href: "/blog/", label: "Blog" },
  { href: "/courses/", label: "Courses" },
] as const;

export type Publication = {
  title: string;
  authors: string;
  venue: string;
  year: number;
  status: "published" | "preprint" | "thesis" | "in preparation";
  href?: string;
  pdf?: string;
  note?: string;
};

export const publications: Publication[] = [
  {
    title:
      "Physics-Informed Neural Networks for Eigenvalue Problems: Laplace and Steklov Settings",
    authors: "K. Zengin",
    venue: "MSc thesis, Institute of Applied Mathematics, METU",
    year: 2026,
    status: "thesis",
    note: "In preparation.",
  },
  {
    title: "Formal guarantees for local explanations",
    authors: "K. Zengin",
    venue: "Working notes",
    year: 2026,
    status: "in preparation",
    note: "Connected to the interpretability essays on this site.",
  },
];

export type SelectedWork = {
  index: string;
  title: string;
  href: string;
  blurb: string;
  categories: string[];
  date?: string;
  image?: string;
};

export const selectedWorks: SelectedWork[] = [
  {
    index: "01",
    title: "What is an explanation?",
    href: "/pieces/what-is-an-explanation/",
    blurb: "Prediction is cheap. Explanation is a claim about why.",
    categories: ["XAI", "Philosophy"],
    date: "2026-07-09",
    image: "/stairs.gif",
  },
  {
    index: "02",
    title: "Causal Structures in Neural Networks",
    href: "/blog/causal-structures/",
    blurb: "Do-calculus as an epistemic tool, not a dashboard feature.",
    categories: ["Causality", "XAI"],
    date: "2026-07-02",
    image: "/200w.gif",
  },
  {
    index: "03",
    title: "Types as constraints",
    href: "/blog/types-as-constraints-demo/",
    blurb: "A playable sketch of refinement: what a type forbids.",
    categories: ["Type Theory"],
    date: "2026-08-12",
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
      "Advanced study of nonlinear dynamical systems with applications to physics, biology, and engineering.",
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
      "Mathematical foundations of reproducing kernel Hilbert spaces with applications to machine learning and approximation theory.",
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
  date: string;
  categories: string[];
  subcategories?: string[];
  status?: "published" | "forthcoming";
};

/** Parent category → expandable subcategories (for filter UI). */
export const categoryTree: Record<string, string[]> = {
  Philosophy: [
    "Philosophy of mind",
    "Philosophy of cognitive science",
    "Philosophy of AI",
  ],
  "Type Theory": [
    "Intuitionistic type theory",
    "Homotopy type theory",
    "Dependent types",
  ],
};

export const blogCards: BlogCard[] = [
  {
    slug: "what-is-an-explanation",
    title: "What is an explanation?",
    description:
      "Climb an explanation ladder: saliency, counterfactuals, causal claims, formal guarantees.",
    href: "/pieces/what-is-an-explanation/",
    image: "/stairs.gif",
    date: "2026-07-09",
    categories: ["XAI", "Philosophy"],
    subcategories: ["Philosophy of AI", "Philosophy of mind"],
    status: "published",
  },
  {
    slug: "types-as-constraints-demo",
    title: "Types as constraints",
    description:
      "A playable sketch of type refinement: drag the precision dial and watch what gets forbidden.",
    href: "/blog/types-as-constraints-demo/",
    image: "/hypnosis.gif",
    date: "2026-08-12",
    categories: ["Type Theory"],
    subcategories: ["Intuitionistic type theory", "Dependent types"],
    status: "published",
  },
  {
    slug: "causal-structures",
    title: "Causal Structures in Neural Networks",
    description:
      "Do-calculus as an epistemic tool for reading model decisions, not a dashboard feature.",
    href: "/blog/causal-structures/",
    image: "/200w.gif",
    date: "2026-07-02",
    categories: ["Causality", "Category Theory"],
    status: "forthcoming",
  },
  {
    slug: "formal-interpretability",
    title: "Formal Methods in ML Interpretability",
    description:
      "What would it mean for an explanation to be correct, not merely persuasive?",
    href: "/blog/formal-interpretability/",
    image: "/hypnosis.gif",
    date: "2026-08-03",
    categories: ["XAI", "Type Theory"],
    subcategories: ["Homotopy type theory", "Intuitionistic type theory"],
    status: "forthcoming",
  },
];
