"use client";

import { useRef, useState } from "react";
import type { CardItem } from "./types";

export function UsePanel({ item, variant }: { item: CardItem; variant: "dialog" | "stack" }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState("");

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied((current) => (current === id ? "" : current)), 1600);
    } catch {
      setCopied("");
    }
  }

  const body = <PanelBody item={item} copied={copied} onCopy={copy} />;

  if (variant === "stack") {
    return (
      <div className="tpl-panel">
        <h2>Use</h2>
        {body}
      </div>
    );
  }

  return (
    <>
      <button type="button" className="tpl-btn" onClick={() => dialog.current?.showModal()}>Use</button>
      <dialog ref={dialog} aria-labelledby={`use-${item.slug}`}>
        <div className="tpl-panel">
          <h2 id={`use-${item.slug}`}>Use {item.title}</h2>
          {body}
          <button type="button" className="tpl-btn tpl-btn-ghost" onClick={() => dialog.current?.close()}>Close</button>
        </div>
      </dialog>
    </>
  );
}

function PanelBody({ item, copied, onCopy }: { item: CardItem; copied: string; onCopy: (text: string, id: string) => void }) {
  const hasAction = item.commands.length > 0 || item.prompts.length > 0;
  return (
    <>
      {item.commands.map((command, index) => (
        <div className="tpl-command" key={`${command.label}-${index}`}>
          <p>{command.label}</p>
          <pre>{command.text}</pre>
          <div className="tpl-command-bar">
            <button type="button" className="tpl-btn" onClick={() => onCopy(command.text, `c-${index}`)}>
              {copied === `c-${index}` ? "Copied" : "Copy"}
            </button>
          </div>
          {command.note ? <p className="tpl-note">{command.note}</p> : null}
          <p className="tpl-source">Source: {command.source}</p>
        </div>
      ))}
      {item.prompts.map((prompt, index) => (
        <div className="tpl-command" key={`${prompt.label}-${index}`}>
          <p>{prompt.label}</p>
          <pre>{prompt.text}</pre>
          <div className="tpl-command-bar">
            <button type="button" className="tpl-btn tpl-btn-ghost" onClick={() => onCopy(prompt.text, `p-${index}`)}>
              {copied === `p-${index}` ? "Copied" : "Copy prompt"}
            </button>
          </div>
          <p className="tpl-source">Source: {prompt.source}</p>
        </div>
      ))}
      {hasAction ? null : <p className="tpl-note">This file records no command and no agent prompt.</p>}
      <h3>Docs</h3>
      {item.docs.length ? (
        <ul className="tpl-docs">
          {item.docs.map((link) => (
            <li key={link.href}><a href={link.href}>{link.title}</a></li>
          ))}
        </ul>
      ) : (
        <p className="tpl-note">No page under site/content/docs is mapped to this record.</p>
      )}
    </>
  );
}
