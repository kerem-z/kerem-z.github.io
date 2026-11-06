import type { Metadata } from "next";

// Private workbench: not linked from the site and kept out of search engines.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function TempLayout({ children }: { children: React.ReactNode }) {
  return children;
}
