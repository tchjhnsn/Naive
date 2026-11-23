"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { applyFilters } from "@/lib/templates/filter.mjs";
import { Diagram } from "./diagram";
import type { CardItem, CatalogUseCase } from "./types";
import { UsePanel } from "./use-panel";

const KINDS = [
  { id: "template", label: "Templates" },
  { id: "playbook", label: "Playbooks" },
];

export function Gallery({ items }: { items: CardItem[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const q = params.get("q") ?? "";
  const kinds = split(params.get("kind"));
  const categories = split(params.get("category"));
  const uses = split(params.get("use"));
  const frameworks = split(params.get("framework"));

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  function toggle(key: string, id: string, selected: string[]) {
    const next = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
    update(key, next.length ? next.join(",") : null);
  }

  const shown = applyFilters(items, { q, kinds, categories, uses, frameworks });

  const categoryOptions = unique(items.map((item) => item.category));
  const frameworkOptions = unique(items.map((item) => item.framework).filter((value): value is string => Boolean(value)));
  const useGroups = groupUses(items);
  const filtered = kinds.length || categories.length || uses.length || frameworks.length || q.trim();

  return (
    <div className="tpl-main">
      <div className="tpl-intro">
        <h1>Templates and playbooks</h1>
        <p>
          Records already in this repository. A template is a venture type, package, decision set, frame, or kit.
          A playbook is a skill, handoff, guide, or a file tagged playbook. Each card is read from those files when the site builds.
        </p>
      </div>
      <div className="tpl-layout">
        <details className="tpl-filters" open>
          <summary>Filter</summary>
          <label className="tpl-kicker" htmlFor="template-search">Search</label>
          <input
            id="template-search"
            className="tpl-search"
            type="search"
            value={q}
            placeholder="Title, command, or source"
            onChange={(event) => update("q", event.target.value || null)}
          />
          <fieldset className="tpl-group">
            <legend>Kind</legend>
            {KINDS.map((kind) => (
              <label key={kind.id}>
                <input type="checkbox" checked={kinds.includes(kind.id)} onChange={() => toggle("kind", kind.id, kinds)} />
                <span>{kind.label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="tpl-group">
            <legend>Category</legend>
            {categoryOptions.map((category) => (
              <label key={category}>
                <input type="checkbox" checked={categories.includes(category)} onChange={() => toggle("category", category, categories)} />
                <span>{category}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="tpl-group">
            <legend>Use case</legend>
            {useGroups.map((group) => (
              <div key={group.group}>
                <div className="tpl-sub">{group.group}</div>
                {group.items.map((useCase) => (
                  <label key={useCase.id}>
                    <input type="checkbox" checked={uses.includes(useCase.id)} onChange={() => toggle("use", useCase.id, uses)} />
                    <span>{useCase.label}</span>
                  </label>
                ))}
              </div>
            ))}
          </fieldset>
          <fieldset className="tpl-group">
            <legend>Framework</legend>
            {frameworkOptions.map((framework) => (
              <label key={framework}>
                <input type="checkbox" checked={frameworks.includes(framework)} onChange={() => toggle("framework", framework, frameworks)} />
                <span>{framework}</span>
              </label>
            ))}
          </fieldset>
          {filtered ? <Link className="tpl-clear" href={pathname}>Clear filters</Link> : null}
        </details>
        <div>
          <p className="tpl-count">{shown.length} of {items.length}</p>
          {shown.length ? (
            <div className="tpl-grid">
              {shown.map((item) => (
                <article key={item.slug} className="tpl-card" data-testid={`template-card-${item.slug}`}>
                  <Link className="tpl-card-media" href={`/templates/${item.slug}`}>
                    <Diagram title={item.title} category={item.category} lines={item.diagram} />
                  </Link>
                  <div className="tpl-card-body">
                    <p className="tpl-kicker">{item.category}{item.framework ? `, ${item.framework}` : ""}</p>
                    <h2><Link href={`/templates/${item.slug}`}>{item.title}</Link></h2>
                    <p className="tpl-clamp">{item.description}</p>
                    {item.badges.length ? (
                      <ul className="tpl-badges">{item.badges.map((badge) => <li key={badge}>{badge}</li>)}</ul>
                    ) : null}
                    <p className="tpl-path">{item.source}</p>
                  </div>
                  <div className="tpl-card-actions">
                    <UsePanel item={item} variant="dialog" />
                    <Link className="tpl-btn tpl-btn-ghost" href={`/templates/${item.slug}`}>View</Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="tpl-empty">No records match these filters.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function split(value: string | null) {
  return value ? value.split(",").filter(Boolean) : [];
}

function unique(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function groupUses(items: CardItem[]) {
  const groups = new Map<string, Map<string, CatalogUseCase>>();
  for (const item of items) {
    for (const useCase of item.useCases) {
      const group = groups.get(useCase.group) ?? new Map<string, CatalogUseCase>();
      group.set(useCase.id, useCase);
      groups.set(useCase.group, group);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, entries]) => ({
      group,
      items: [...entries.values()].sort((a, b) => a.label.localeCompare(b.label)),
    }));
}
