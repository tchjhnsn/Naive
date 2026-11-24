import Link from "next/link";
import { Diagram } from "./diagram";
import { Markdown } from "./markdown";
import type { DetailItem } from "./types";
import { UsePanel } from "./use-panel";

export function Detail({ item }: { item: DetailItem }) {
  return (
    <div className="tpl-main">
      <Link className="tpl-back" href="/templates">Templates and playbooks</Link>
      <header className="tpl-detail-head" data-testid="template-detail-header">
        <p className="tpl-kicker">{item.category}{item.framework ? `, ${item.framework}` : ""}</p>
        <h1 data-testid="template-detail-title">{item.title}</h1>
        <p className="tpl-lead">{item.description}</p>
        <p className="tpl-path">{item.source}</p>
        {item.badges.length ? (
          <ul className="tpl-badges">{item.badges.map((badge) => <li key={badge}>{badge}</li>)}</ul>
        ) : null}
      </header>
      <div className="tpl-detail-grid">
        <div>
          <figure className="tpl-preview" data-testid="template-detail-preview">
            <Diagram title={item.title} category={item.category} lines={item.diagram} />
            <figcaption>
              Drawn from the fields in {item.source}. This repository has no screenshot file for this record.
            </figcaption>
          </figure>
          {item.facts.length ? (
            <dl className="tpl-facts">
              {item.facts.map((fact) => (
                <div key={fact.label}>
                  <dt>{fact.label}</dt>
                  <dd>{fact.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {item.sections.map((section) => (
            <section className="tpl-section" key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.text}</p>
            </section>
          ))}
          {item.body ? (
            <section className="tpl-section">
              <h2>Source text</h2>
              <Markdown source={item.body} />
            </section>
          ) : null}
          {item.sources.length ? (
            <section className="tpl-section">
              <h2>Data sources</h2>
              <ul className="tpl-related">
                {item.sources.map((source) => (
                  <li key={`${source.path}-${source.note}`} className="tpl-path">{source.path} ({source.note})</li>
                ))}
              </ul>
            </section>
          ) : null}
          {item.related.length ? (
            <section className="tpl-section">
              <h2>Related</h2>
              <ul className="tpl-related">
                {item.related.map((link) => (
                  <li key={link.slug}><Link href={`/templates/${link.slug}`}>{link.label}</Link></li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
        <aside className="tpl-side">
          <UsePanel item={item} variant="stack" />
        </aside>
      </div>
    </div>
  );
}
