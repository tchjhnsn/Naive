export const siteNav = [
  { href: "/blog", label: "Blog" },
  { href: "/showcase", label: "Showcase" },
  { href: "/about", label: "About" },
  { href: "/waitlist", label: "Waitlist" },
] as const;

export const githubUrl = "https://github.com/tchjhnsn/everything-ecosystem";

export function navCurrent(pathname: string, href: string) {
  if (href === "/docs") return pathname === "/docs" || pathname.startsWith("/docs/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
