import type { Metadata } from "next";
import { BlogIndex } from "@/components/BlogIndex";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes and essays.",
  openGraph: {
    title: "Blog · Kerem Zengin",
    description: "Notes and essays.",
    url: "/blog/",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
};

export default function BlogIndexPage() {
  return <BlogIndex />;
}
