import type { Metadata } from "next";
import "./templates.css";

export const metadata: Metadata = {
  title: "Templates and playbooks",
  description: "Venture types, packages, decision sets, frames, kits, skills, handoffs, and guides from this repository.",
  robots: { index: false, follow: false },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return <div className="tpl">{children}</div>;
}
