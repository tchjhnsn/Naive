import Link from "next/link";
import { Children, cloneElement, isValidElement } from "react";
import facts from "../generated/venture-facts.json";
import { Command } from "./command";
import { FeatureArt } from "./feature-art";

export function Fact({ name }) {
  const fact = facts[name];
  if (typeof fact?.value !== "string" || fact.value.length === 0) return null;
  return <span>{fact.value}</span>;
}

export function FactList({ name }) {
  const fact = facts[name];
  if (!Array.isArray(fact?.value) || fact.value.length === 0) return null;
  return (
    <ul>
      {fact.value.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

// The five phases, read from the record (purpose/frameworks/product-anatomy/phases.json).
export function Lifecycle() {
  const phases = facts.phases?.value ?? [];
  return (
    <ol className="naive-phases">
      {phases.map((p, i) => (
        <li key={p.name}>
          <span className="naive-phase-n">{String(i + 1).padStart(2, "0")}</span>
          <strong>{p.name}</strong>
          <span>{p.question}</span>
          <small>Gate: {p.gate}</small>
        </li>
      ))}
    </ol>
  );
}

// The home page hero: an outlined wordmark, what Naive is as the headline, who it serves under it,
// and the primary next move. `command` is optional. The public home page does not show an install command.
export function Hero({ title, command, href, action, children }) {
  return (
    <header className="naive-hero">
      <p className="naive-wordmark" aria-hidden="true">Naive</p>
      <h1>{title}</h1>
      <div className="naive-hero-lede">{children}</div>
      {command ? <Command command={command} /> : null}
      {href && action ? (
        <p className="naive-hero-action">
          <Link href={href} className="naive-move">{action} <span aria-hidden="true">→</span></Link>
        </p>
      ) : null}
    </header>
  );
}

// A full-width band with one large statement, for the "Now what?" moment.
export function Statement({ title, children }) {
  return (
    <section className="naive-statement">
      <h2>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

export function Section({ title, wide, children }) {
  return (
    <section className={wide ? "naive-section naive-section-wide" : "naive-section"}>
      {title ? <h2>{title}</h2> : null}
      <div>{children}</div>
    </section>
  );
}

// Each feature learns its place in the row, so each card draws a different picture.
export function Features({ children }) {
  let index = 0;
  const numbered = Children.map(children, (child) => (isValidElement(child) ? cloneElement(child, { index: index++ }) : child));
  return <div className="naive-features">{numbered}</div>;
}

export function Feature({ title, href, highlight, index = 0, children }) {
  const className = highlight ? "naive-feature naive-feature-highlight" : "naive-feature";
  const body = (
    <>
      <FeatureArt index={index} title={title} />
      <strong>
        {title} {href ? <span aria-hidden="true">→</span> : null}
      </strong>
      <span>{children}</span>
    </>
  );
  if (!href) return <div className={className}>{body}</div>;
  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  );
}

export function Closing({ title, children }) {
  return (
    <section className="naive-closing">
      <h2>{title}</h2>
      <div className="naive-closing-actions">{children}</div>
    </section>
  );
}

export function CTA({ href, secondary, children }) {
  return (
    <p className={secondary ? "naive-cta naive-cta-secondary" : "naive-cta"}>
      <Link href={href}>{children}</Link>
    </p>
  );
}
