import type { Metadata } from "next";
import { Week02 } from "@/components/math119/week02/Week02";

export const metadata: Metadata = {
  title: "Week 02 · MATH 119",
  description:
    "Limits, continuity, the squeeze theorem, and the intermediate value theorem. MATH 119 recitation, week 02.",
};

export default function Week02Page() {
  return <Week02 />;
}
