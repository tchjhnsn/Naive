import Link from "next/link";
import {
  PHASE_LABEL,
  imageAlt,
  imageSrc,
  parentName,
  repoUrl,
  type ShowcaseEntry,
  type ShowcaseLink,
} from "@/lib/showcase/catalog";

function PathText({ path }: { path: string }) {
  const parts = path.split("/");
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${part}-${index}`}>
          {index > 0 ? <wbr /> : null}
          {index > 0 ? "/" : null}
          {part}
        </span>
      ))}
    </>
  );
}

function TextLink({ link, className }: { link: ShowcaseLink; className?: string }) {
  if (link.href.startsWith("/")) {
    return (
      <Link className={className} href={link.href}>
        {link.label}
      </Link>
    );
  }
  return (
    <a className={className} href={link.href} target="_blank" rel="noreferrer">
      {link.label}
    </a>
  );
}

export function EntryCard({ entry, featured = false }: { entry: ShowcaseEntry; featured?: boolean }) {
  const primary = entry.links[0];
  const parent = parentName(entry);
  const meta = [
    PHASE_LABEL[entry.phase] ?? entry.phase,
    entry.type,
    entry.industry,
    parent ? `Nested under ${parent}` : null,
  ].filter(Boolean);

  return (
    <article className="sc-card" id={entry.id}>
      <a className="sc-quiet sc-shot" href={primary.href} {...(primary.href.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" })}>
        <img src={imageSrc(entry)} alt={imageAlt(entry)} />
      </a>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {entry.example ? (
          <span className="rounded-full bg-[var(--sc-example-bg)] px-2.5 py-1 text-xs font-medium tracking-wide text-[var(--sc-example)]">
            Example
          </span>
        ) : (
          <span className="sc-phase rounded-full px-2.5 py-1 text-xs font-medium tracking-wide text-[var(--sc-accent)]">
            This repository
          </span>
        )}
        <p className="text-sm text-[var(--sc-muted)]">{meta.join(", ")}</p>
      </div>
      <h3 className={featured ? "mt-2 text-2xl font-semibold tracking-tight" : "mt-2 text-xl font-semibold tracking-tight"}>
        {primary.href.startsWith("/") ? (
          <Link className="sc-title" href={primary.href}>
            {entry.name}
          </Link>
        ) : (
          <a className="sc-title" href={primary.href} target="_blank" rel="noreferrer">
            {entry.name}
          </a>
        )}
      </h3>
      <p className="mt-2 text-[15px] leading-relaxed text-[var(--sc-muted)]">{entry.description}</p>
      <ul className="mt-4 flex flex-wrap gap-2">
        {entry.pieces.map((piece) => (
          <li
            key={piece.id}
            className="rounded-full border border-[var(--sc-line)] px-2.5 py-1 text-xs text-[var(--sc-ink)]"
            title={piece.detail}
          >
            {piece.name}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-[var(--sc-muted)]">{entry.frames}</p>
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {entry.links.map((link) => (
          <TextLink key={link.href} link={link} />
        ))}
      </p>
      <p className="mt-3 font-mono text-xs text-[var(--sc-muted)]">
        <PathText path={entry.source} />
      </p>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-[var(--sc-accent)]">Pieces and sources</summary>
        <dl className="mt-3 space-y-3">
          {entry.pieces.map((piece) => (
            <div key={`${piece.id}-detail`}>
              <dt className="font-medium">{piece.name}</dt>
              <dd className="mt-1 text-[var(--sc-muted)]">{piece.detail}</dd>
              <dd className="mt-1 break-words">
                <a href={repoUrl(piece.source)} target="_blank" rel="noreferrer">
                  <PathText path={piece.source} />
                </a>
              </dd>
            </div>
          ))}
        </dl>
        <h4 className="mt-4 font-medium">Where the description comes from</h4>
        <ul className="mt-2 space-y-2">
          {entry.citations.map((citation) => (
            <li key={citation.path}>
              <a href={repoUrl(citation.path)} target="_blank" rel="noreferrer">
                <PathText path={citation.path} />
              </a>
              <span className="text-[var(--sc-muted)]">. {citation.note}.</span>
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
