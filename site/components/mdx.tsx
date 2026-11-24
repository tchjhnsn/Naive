import { Callout as NextraCallout, Cards as NextraCards, FileTree, Steps as NextraSteps, Tabs as NextraTabs } from "nextra/components";
import type { ReactNode } from "react";

const calloutType = {
  info: "info",
  warn: "warning",
  warning: "warning",
  error: "error",
  idea: "important",
  default: "default",
} as const;

export function Callout({ type = "info", children }: { type?: string; children?: ReactNode }) {
  const mapped = calloutType[type as keyof typeof calloutType] ?? "info";
  return <NextraCallout type={mapped}>{children}</NextraCallout>;
}

export function Cards({ num = 2, children }: { num?: number; children?: ReactNode }) {
  return <NextraCards num={num}>{children}</NextraCards>;
}

export const Card = NextraCards.Card;

export function Tabs({
  groupId,
  persist,
  storageKey,
  items,
  children,
}: {
  groupId?: string;
  persist?: boolean;
  storageKey?: string;
  items?: string[];
  children?: ReactNode;
}) {
  const key = storageKey ?? (persist && groupId ? groupId : undefined);
  return <NextraTabs storageKey={key} items={items ?? []}>{children}</NextraTabs>;
}

export const Tab = NextraTabs.Tab;

export const Steps = NextraSteps;

export function Step({ children }: { children?: ReactNode }) {
  return <div>{children}</div>;
}

export function Accordions({ children }: { children?: ReactNode }) {
  return <div className="naive-accordions">{children}</div>;
}

export function Accordion({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <details>
      <summary>{title}</summary>
      {children}
    </details>
  );
}

export const Files = FileTree;
export const Folder = FileTree.Folder;
export const File = FileTree.File;

export function TypeTable({ type }: { type?: Record<string, { type?: string; description?: string; required?: boolean }> }) {
  if (!type) return null;
  return (
    <table>
      <thead>
        <tr><th>Name</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        {Object.entries(type).map(([name, field]) => (
          <tr key={name}>
            <td><code>{name}</code></td>
            <td>{field.type ?? ""}{field.required ? "" : " (optional)"}</td>
            <td>{field.description ?? ""}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
