import { site } from "@/lib/site";

/** Default site share card. */
export const defaultOgImage = "/og.png";

/** Per-post Open Graph images under /public/og/. */
const postOg: Record<string, string> = {
  "what-is-an-explanation": "/og/what-is-an-explanation.png",
  "types-as-constraints-demo": "/og/types-as-constraints-demo.png",
  "causal-structures": "/og/causal-structures.png",
  "formal-interpretability": "/og/formal-interpretability.png",
};

export function ogImageForSlug(slug: string): string {
  return postOg[slug] ?? defaultOgImage;
}

export function ogImages(path: string, alt: string = site.name) {
  return [
    {
      url: path,
      width: 1200,
      height: 630,
      alt,
    },
  ];
}
