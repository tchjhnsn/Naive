// Copied from site/lib/layout.shared.tsx so the blog does not import that module.
// layout.shared.tsx imports Fumadocs types, and this route stays off Fumadocs and Nextra.

const vercelHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? vercelHost ?? "https://mentura-docs-tchjhnsns-projects.vercel.app";
