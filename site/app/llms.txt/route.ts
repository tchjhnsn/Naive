import { listPages } from "@/lib/pages";
import { siteUrl } from "@/lib/site";

export function GET() {
  const docs = listPages().filter((page) => page.collection === "docs");
  const lines = docs.map((page) => `- [${page.title}](${new URL(page.url, siteUrl)}): ${page.description}`);
  const body = `# Naive\n\n> Draft developer docs for Naive. Not published.\n\n${lines.join("\n")}\n`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
