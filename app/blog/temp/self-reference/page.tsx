import type { Metadata } from "next";
import { DemoFrame } from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "A sentence that talks about itself",
  description:
    "A draft on self-reference: a sentence that flips, and a short program that prints its own text.",
};

export default function SelfReferencePage() {
  return (
    <DemoFrame
      src="/demos/self-reference/index.html"
      title="A sentence that talks about itself"
    />
  );
}
