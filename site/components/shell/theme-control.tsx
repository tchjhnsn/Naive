"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "@/components/shell/icons";

const themes = ["system", "light", "dark"] as const;

export function ThemeControl({ variant = "icon" }: { variant?: "icon" | "text" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? theme ?? "system" : "system";
  const dark = mounted && resolvedTheme === "dark";

  if (variant === "text") {
    return (
      <div className="site-theme-text">
        <span>Select a display theme:</span>
        {themes.map((name) => (
          <button key={name} type="button" aria-pressed={current === name} onClick={() => setTheme(name)}>
            {name}
          </button>
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      className="site-icon-button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
