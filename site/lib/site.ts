const vercelHost = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined;

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? vercelHost ?? "https://mentura-docs-tchjhnsns-projects.vercel.app";
