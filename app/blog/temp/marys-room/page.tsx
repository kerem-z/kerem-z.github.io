import type { Metadata } from "next";
import { DemoFrame } from "@/components/DemoFrame";

export const metadata: Metadata = {
  title: "What Mary had not seen",
  description:
    "A draft of Jackson's knowledge argument: every physical note about red, then the door opens.",
};

export default function MarysRoomPage() {
  return (
    <DemoFrame
      src="/demos/marys-room/index.html"
      title="What Mary had not seen"
    />
  );
}
