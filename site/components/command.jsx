"use client";

import { useEffect, useRef, useState } from "react";

export function Command({ command }) {
  const [label, setLabel] = useState("Copy");
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = (text) => {
    clearTimeout(timer.current);
    setLabel(text);
    timer.current = setTimeout(() => setLabel("Copy"), 1500);
  };
  return (
    <div className="naive-command">
      <span aria-hidden="true">$</span>
      <code>{command}</code>
      <button
        type="button"
        aria-label="Copy command"
        onClick={() => {
          if (!navigator.clipboard) return show("Copy failed");
          navigator.clipboard.writeText(command).then(
            () => show("Copied"),
            () => show("Copy failed"),
          );
        }}
      >
        <span aria-hidden="true">{label}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {label === "Copy" ? "" : label}
      </span>
    </div>
  );
}
