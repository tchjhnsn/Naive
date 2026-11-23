import { listPages, markdownFor } from "@/lib/pages";
import { siteUrl } from "@/lib/site";

export function GET() {
  const docs = listPages().filter((page) => page.collection === "docs");
  const body = docs.map((page) => `# ${page.title}\n\nURL: ${new URL(page.url, siteUrl)}\n\n${markdownFor(page)}`).join("\n");
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
