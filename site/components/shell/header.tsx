"use client";

import { Search } from "nextra/components";
import { setMenu, useMenu } from "nextra-theme-docs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Mark, MenuIcon } from "@/components/shell/icons";
import { navCurrent, siteNav } from "@/components/shell/nav";
import { ThemeControl } from "@/components/shell/theme-control";

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const docs = pathname === "/docs" || pathname.startsWith("/docs/");
  const menuOpen = useMenu();
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="site-header-bar">
        <Link href="/" className="site-logo" aria-label="Naive home">
          <Mark />
          <span>Naive</span>
        </Link>
        <nav className="site-nav" aria-label="Site">
          {siteNav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={navCurrent(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-tools">
          <Search className="site-search" placeholder="Search…" />
          <ThemeControl />
          <button
            type="button"
            className="site-icon-button site-mobile-toggle"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            <MenuIcon />
          </button>
        </div>
      </div>
      {open ? (
        <nav className="site-mobile-nav" aria-label="Site">
          {siteNav.map((item) => (
            <Link key={item.href} href={item.href} aria-current={navCurrent(pathname, item.href) ? "page" : undefined} onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          {docs ? (
            <button
              type="button"
              aria-expanded={menuOpen}
              onClick={() => {
                setOpen(false);
                setMenu(true);
              }}
            >
              Docs sections
            </button>
          ) : null}
        </nav>
      ) : null}
    </header>
  );
}
