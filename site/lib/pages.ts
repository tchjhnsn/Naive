import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";

export type DocPage = {
  url: string;
  title: string;
  description: string;
  lastReviewed: string;
  body: string;
  collection: "docs" | "marketing";
};

const contentRoot = join(process.cwd(), "content");

function readMdx(file: string) {
  const text = readFileSync(file, "utf8");
  if (!text.startsWith("---\n")) throw new Error(`${file} has no frontmatter`);
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) throw new Error(`${file} frontmatter is not closed`);
  const data = parse(text.slice(4, end)) as { title?: string; description?: string; lastReviewed?: string };
  return { data, body: text.slice(end + 5).replace(/\{\/\*[\s\S]*?\*\/\}\n?/g, "").trim() };
}

function publicUrl(collection: "docs" | "marketing", parts: string[]) {
  if (collection === "docs") return `/${["docs", ...parts].join("/")}`;
  return parts.length ? `/${parts.join("/")}` : "/";
}

function listCollection(collection: "docs" | "marketing"): DocPage[] {
  const pages: DocPage[] = [];
  const walk = (dir: string, parts: string[]) => {
    const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8")) as { pages: string[] };
    for (const name of meta.pages) {
      const folder = join(dir, name);
      if (statSync(folder, { throwIfNoEntry: false })?.isDirectory()) {
        walk(folder, [...parts, name]);
        continue;
      }
      const file = join(dir, `${name}.mdx`);
      if (!existsSync(file)) throw new Error(`missing page ${file}`);
      const { data, body } = readMdx(file);
      const segments = name === "index" ? parts : [...parts, name];
      pages.push({
        url: publicUrl(collection, segments),
        title: data.title ?? name,
        description: data.description ?? "",
        lastReviewed: data.lastReviewed ?? "",
        body,
        collection,
      });
    }
  };
  walk(join(contentRoot, collection), []);
  return pages;
}

let cached: DocPage[] | undefined;

export function listPages(): DocPage[] {
  cached ??= [...listCollection("docs"), ...listCollection("marketing")];
  return cached;
}

export function findPage(url: string): DocPage | undefined {
  const normalized = url === "/" ? "/" : url.replace(/\/$/, "");
  return listPages().find((page) => page.url === normalized);
}

export function markdownFor(page: DocPage) {
  if (page.body.includes("##")) return `${page.body}\n`;
  return `# ${page.title}\n\n${page.body}\n`;
}
