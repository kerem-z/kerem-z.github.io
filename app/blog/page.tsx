import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Essays on explanation, structure, type theory, and the philosophy of mind.",
  openGraph: {
    title: "Blog · Kerem Zengin",
    description:
      "Essays on explanation, structure, type theory, and the philosophy of mind.",
    url: "/blog/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function BlogIndexPage() {
  return <BlogIndex />;
}
