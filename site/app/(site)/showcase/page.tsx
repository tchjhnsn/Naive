import type { Metadata } from "next";
import { Showcase } from "@/components/showcase/showcase";
import "@/components/showcase/showcase.css";

export const metadata: Metadata = {
  title: "Showcase",
  description: "Ventures and worked examples recorded with Naive, each drawn from a file in this repository.",
  robots: { index: false, follow: false },
};

export default function ShowcasePage() {
  return <Showcase />;
}
