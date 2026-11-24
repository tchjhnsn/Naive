import Link from "next/link";
import type { Inline } from "@/lib/blog/types";

export function safeHref(href: string): string | null {
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  return null;
}

export function Inlines({ nodes }: { nodes: Inline[] }) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === "text") return <span key={key}>{node.text}</span>;
    if (node.type === "code") return <code key={key}>{node.text}</code>;
    if (node.type === "strong") return <strong key={key}>{node.text}</strong>;
    if (node.type === "em") return <em key={key}>{node.text}</em>;
    const href = safeHref(node.href);
    if (!href) return <span key={key}>{node.text}</span>;
    if (href.startsWith("/")) {
      return (
        <Link key={key} href={href}>
          {node.text}
        </Link>
      );
    }
    return (
      <a key={key} href={href} rel="noopener noreferrer">
        {node.text}
      </a>
    );
  });
}
