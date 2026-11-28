// The header carries no links of its own: the mark, search, the theme control and GitHub.
// About and the waitlist are reached from the footer and from the pages themselves.
export const siteNav: readonly { href: string; label: string }[] = [];

export const footerNav = [
  { href: "/about", label: "About" },
  { href: "/waitlist", label: "Waitlist" },
] as const;

export const githubUrl = "https://github.com/tchjhnsn/everything-ecosystem";

export function navCurrent(pathname: string, href: string) {
  if (href === "/docs") return pathname === "/docs" || pathname.startsWith("/docs/");
  return pathname === href || pathname.startsWith(`${href}/`);
}
