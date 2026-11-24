// Public gate for docs and templates (R-45). The pages stay in the repo.
// A request for one of them redirects to /waitlist. That page records an email
// as interest. It does not create an account.
//
// proxy.ts repeats `gatedMatchers` in its `config.matcher`. Next reads that
// array as a static literal, so the test checks the two lists stay the same.

export const WAITLIST_PATH = "/waitlist";

const PREFIXES = ["/docs", "/templates", "/md/docs", "/og/docs"] as const;

const EXACT = new Set(["/llms.txt", "/llms-full.txt", "/docs.md"]);

export const gatedMatchers = [
  "/docs",
  "/docs.md",
  "/docs/:path*",
  "/templates",
  "/templates/:path*",
  "/llms.txt",
  "/llms-full.txt",
  "/md/docs",
  "/md/docs/:path*",
  "/og/docs",
  "/og/docs/:path*",
] as const;

export function isGatedPath(pathname: string): boolean {
  const cut = pathname.split(/[?#]/)[0] ?? pathname;
  const path = cut.length > 1 && cut.endsWith("/") ? cut.slice(0, -1) : cut;
  if (path === WAITLIST_PATH) return false;
  if (EXACT.has(path)) return true;
  return PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

// True when Next's matcher string would select this pathname.
export function matcherCovers(matcher: string, pathname: string): boolean {
  if (matcher === pathname) return true;
  const star = "/:path*";
  if (!matcher.endsWith(star)) return false;
  const prefix = matcher.slice(0, -star.length);
  return pathname.startsWith(`${prefix}/`);
}

export function normalizeForScan(text: string): string {
  return text
    .replace(/\\u002f/gi, "/")
    .replace(/\\\//g, "/")
    .replace(/&#x2f;/gi, "/")
    .replace(/&#47;/g, "/");
}

const CANDIDATE = /(?:^|[^A-Za-z0-9_])(\/(?:docs\.md|llms-full\.txt|llms\.txt|md\/docs|og\/docs|docs|templates)(?:\/[A-Za-z0-9._~%-]+)*)/g;

// Paths in rendered markup that would send a reader to a gated route.
export function gatedMentions(text: string): string[] {
  const found = new Set<string>();
  const source = normalizeForScan(text);
  for (const match of source.matchAll(CANDIDATE)) {
    const token = match[1];
    if (!token) continue;
    const at = (match.index ?? 0) + match[0].length - token.length;
    const after = source[at + token.length] ?? "";
    if (/[A-Za-z0-9_]/.test(after)) continue;
    const path = token.split(/[?#]/)[0] ?? token;
    if (isGatedPath(path)) found.add(path);
  }
  return [...found];
}
