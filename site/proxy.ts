import { NextResponse, type NextRequest } from "next/server";
import { isGatedPath, WAITLIST_PATH } from "@/lib/waitlist-gate";

// Docs, templates, and the exports that carry their text redirect to the
// waitlist (R-45). That page records interest. Markdown acceptance is included: the path is
// gated whether or not the client asks for text/markdown.
//
// `/docs/:path*` matches `/docs/get-started.md` and does not match `/docs.md`,
// because that URL has no slash after `/docs`. The docs home's old Markdown
// address is `/docs.md`, so the index is listed on its own.
export function proxy(request: NextRequest) {
  if (!isGatedPath(request.nextUrl.pathname)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = WAITLIST_PATH;
  url.search = "";
  const response = NextResponse.redirect(url, 307);
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
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
  ],
};
