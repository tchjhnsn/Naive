import { generateStaticParamsFor } from "nextra/pages";

export async function paramsFor(prefix: "docs" | "marketing") {
  const all = await generateStaticParamsFor("mdxPath")();
  return all.flatMap((entry) => {
    const segments = entry.mdxPath;
    if (!Array.isArray(segments) || segments[0] !== prefix) return [];
    return [{ mdxPath: segments.slice(1) }];
  });
}

export function contentPath(prefix: "docs" | "marketing", mdxPath?: string[]) {
  return [prefix, ...(mdxPath ?? [])];
}

export function pageUrl(prefix: "docs" | "marketing", mdxPath?: string[]) {
  const rest = mdxPath ?? [];
  if (prefix === "docs") return rest.length ? `/docs/${rest.join("/")}` : "/docs";
  return rest.length ? `/${rest.join("/")}` : "/";
}
