export const site = {
  name: "Kerem Zengin",
  title: "Kerem Zengin",
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

export const selectedWorks: SelectedWork[] = [];

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
  imageAlt: string;
  imagePosition?: string;
};

export const courses: CourseMeta[] = [
  {
    slug: "math-119",
    code: "MATH 119",
    title: "Calculus with Analytic Geometry",
    description: "Recitation: Friday, 08:40–10:30.",
    level: "Undergraduate",
    semester: "Fall 2026",
    status: "current",
    topics: ["Functions", "Limits", "Derivatives", "Integrals"],
    image: "/newton.jpg",
    imageAlt: "Portrait of Isaac Newton",
  },
  {
    slug: "iam529-nonlinear-dynamics",
    code: "IAM529",
    title: "Applied Nonlinear Dynamics",
    description: "Graduate course on nonlinear dynamical systems.",
    level: "Graduate",
    semester: "Fall 2025",
    status: "previous",
    topics: [
      "Dynamical Systems",
      "Bifurcation Theory",
      "Chaos Theory",
      "Stability Analysis",
    ],
    image: "/poincare.jpg",
    imageAlt: "Portrait of Henri Poincaré",
  },
  {
    slug: "iam572-rkhs",
    code: "IAM775",
    title: "Reproducing Kernel Hilbert Spaces",
    description:
      "Mathematical foundations of reproducing kernel Hilbert spaces.",
    level: "Graduate",
    semester: "Spring 2024",
    status: "previous",
    topics: ["Functional Analysis", "Kernel Methods", "Approximation Theory"],
    image: "/Hilbert.jpg",
    imageAlt: "Portrait of David Hilbert",
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

/** Subcategory → deeper branches (third column in the topic map). */
export const subcategoryTree: Record<string, string[]> = {
  "Intuitionistic type theory": [
    "Martin-Löf type theory",
    "Propositions as types",
    "Identity types",
  ],
};

export const blogCards: BlogCard[] = [];

export type OnProgressItem = {
  title: string;
  image: string;
  imageAlt: string;
};

/** Notices for work that is not a post yet. */
export const onProgress: OnProgressItem[] = [
  {
    title: "Symbol Grounding Problem",
    image: "/symbol-grounding.gif",
    imageAlt: "Illustration of the symbol grounding problem",
  },
  {
    title: "Chinese Room Argument",
    image: "/chinese-room.gif",
    imageAlt: "The Chinese room",
  },
  {
    title: "On Self-Reference",
    image: "/escher-drawing-hands.jpg",
    imageAlt: "M. C. Escher, Drawing Hands",
  },
];
