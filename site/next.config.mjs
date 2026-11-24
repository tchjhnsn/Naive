import nextra from "nextra";

const withNextra = nextra({
  defaultShowCopyCode: true,
  search: { codeblocks: false },
});

// Old paths. `/` was the docs home and is now the marketing page, so it is not redirected.
const renamed = [
  ["/getting-started", "/docs/get-started"],
  ["/getting-started/install", "/docs/get-started/install"],
  ["/getting-started/first-venture", "/docs/get-started/install"],
  // Quickstart and Your first venture folded into Installation, as in the Next.js docs (I-2).
  ["/docs/get-started/quickstart", "/docs/get-started/install"],
  ["/docs/get-started/first-venture", "/docs/get-started/install"],
  ["/concepts", "/docs/concepts"],
  ["/concepts/layers-and-kits", "/docs/concepts/layers-and-kits"],
  ["/concepts/provenance", "/docs/concepts/provenance"],
  ["/concepts/validation", "/docs/concepts/validation"],
  ["/concepts/ventures-and-phases", "/docs/concepts/ventures-and-phases"],
  ["/concepts/governance", "/docs/concepts/governance"],
  ["/interfaces", "/docs/guides"],
  ["/interfaces/cli", "/docs/guides/cli"],
  ["/interfaces/mcp", "/docs/guides/mcp"],
  ["/interfaces/api", "/docs/guides/api"],
  ["/interfaces/routes", "/docs/reference/routes"],
  ["/reference", "/docs/reference"],
  ["/reference/decisions", "/docs/reference/decisions"],
  ["/reference/file-formats", "/docs/reference/file-formats"],
  ["/reference/nouns", "/docs/reference/nouns"],
];

// Every environment, previews included: public URLs stay out of search until a person approves a channel (EE-025, EE-034).
export const noindexHeaders = () => [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }];

export default withNextra({
  reactStrictMode: true,
  async redirects() {
    return renamed.map(([source, destination]) => ({ source, destination, permanent: true }));
  },
  async headers() {
    return noindexHeaders();
  },
});
