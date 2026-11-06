import type { Metadata } from "next";
import { DemoFrame } from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "A toy network, a stuck puck, and a score that is not real",
  description:
    "A mock of an interactive research note: a three-panel teaser, setup drawers, and figures that switch. The numbers are invented.",
};

export default function InteractiveNotePage() {
  return (
    <DemoFrame
      src="/demos/interactive-research-demo/index.html"
      title="A toy network, a stuck puck, and a score that is not real"
    />
  );
}
