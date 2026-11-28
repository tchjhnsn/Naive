import Link from "next/link";
import { footerNav } from "@/components/shell/nav";
import { ThemeControl } from "@/components/shell/theme-control";

const columns = [
  {
    title: "Explore",
    links: footerNav.map((item) => ({ href: item.href, label: item.label })),
  },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        {columns.map((column) => (
          <div key={column.title}>
            <h2>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("http") ? <a href={link.href}>{link.label}</a> : <Link href={link.href}>{link.label}</Link>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="site-footer-bar">
        <p>Naive. Draft, not published, and not indexed.</p>
        <ThemeControl variant="text" />
      </div>
    </footer>
  );
}
