"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { EntryCard } from "@/components/showcase/entry-card";
import "@/components/showcase/showcase.css";
import {
  PHASE_LABEL,
  filterEntries,
  phaseFilters,
  pieceFilters,
  showcaseEntries,
  showcaseLinks,
  showcaseMeta,
  type Filter,
} from "@/lib/showcase/catalog";

function FilterButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={
        pressed
          ? "sc-filter sc-filter-on"
          : "sc-filter"
      }
    >
      {children}
    </button>
  );
}

export function Showcase() {
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const phases = phaseFilters(showcaseEntries);
  const pieces = pieceFilters(showcaseEntries);
  const matched = useMemo(() => filterEntries(showcaseEntries, filter), [filter]);
  const featured = filter.kind === "all" ? matched.filter((entry) => entry.featured) : [];
  const grid = filter.kind === "all" ? matched.filter((entry) => !entry.featured) : matched;

  return (
    <div className="sc">
      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="pt-14 pb-10">
          <p className="text-sm font-medium tracking-wide text-[var(--sc-accent)]">Draft</p>
          <h1 className="mt-3 max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl">Showcase</h1>
          {/* DRAFT: agent-written, needs Torian */}
          <p className="mt-6 max-w-3xl text-xl leading-relaxed text-[var(--sc-muted)]">
            Ventures and worked examples recorded in this repository. Each entry lists the packages, the decision docket, and the frames on its records, plus the file those facts came from.
          </p>
          {/* DRAFT: agent-written, needs Torian */}
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--sc-muted)]">
            <Link href={showcaseLinks.packagesDocs}>A package</Link> is Naive&apos;s open definition.{" "}
            <Link href={showcaseLinks.docketDocs}>The decision docket</Link> is the ordered list of decisions a venture owes.{" "}
            <Link href={showcaseLinks.frameDocs}>A frame</Link> is one problem in the decision library. Entries marked Example are fixtures in this repository. This page does not add companies, quotes, logos or results.
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--sc-muted)]">
            The repository has one frame,{" "}
            <a href={showcaseLinks.frameHref} target="_blank" rel="noreferrer">
              fund-without-ceding-control
            </a>
            . None of these entries record a run of it.
          </p>
        </section>

        {featured.length > 0 ? (
          <section aria-labelledby="featured-heading">
            <h2 id="featured-heading" className="text-2xl font-semibold tracking-tight">
              Featured
            </h2>
            <p className="mt-2 max-w-3xl text-[var(--sc-muted)]">
              The venture that holds this repository, the demo venture, a worked example, and the Product Anatomy example.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-2">
              {featured.map((entry) => (
                <EntryCard key={entry.id} entry={entry} featured />
              ))}
            </div>
          </section>
        ) : null}

        <div className="sc-filters mt-14 border-y border-[var(--sc-line)] py-4">
          <p className="mb-3 text-sm text-[var(--sc-muted)]" aria-live="polite">
            Showing {matched.length} of {showcaseEntries.length}
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium">Show</span>
              <FilterButton pressed={filter.kind === "all"} onClick={() => setFilter({ kind: "all" })}>
                All
              </FilterButton>
              <FilterButton pressed={filter.kind === "examples"} onClick={() => setFilter({ kind: "examples" })}>
                Examples
              </FilterButton>
              <FilterButton pressed={filter.kind === "recorded"} onClick={() => setFilter({ kind: "recorded" })}>
                Recorded venture
              </FilterButton>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium">Phase</span>
              {phases.map((phase) => (
                <FilterButton
                  key={phase}
                  pressed={filter.kind === "phase" && filter.phase === phase}
                  onClick={() => setFilter({ kind: "phase", phase })}
                >
                  {PHASE_LABEL[phase] ?? phase}
                </FilterButton>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-sm font-medium">On the records</span>
              {pieces.map((piece) => (
                <FilterButton
                  key={piece.id}
                  pressed={filter.kind === "piece" && filter.id === piece.id}
                  onClick={() => setFilter({ kind: "piece", id: piece.id })}
                >
                  {piece.name}
                </FilterButton>
              ))}
            </div>
          </div>
        </div>

        <section className="pt-10" aria-labelledby="grid-heading">
          <h2 id="grid-heading" className="text-2xl font-semibold tracking-tight">
            {filter.kind === "all" ? "More entries" : "Matching entries"}
          </h2>
          {grid.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-3">
              {grid.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          ) : (
            <p className="mt-8 text-[var(--sc-muted)]">
              {matched.length === 0 ? "No entries match this filter." : "The matching entries are in Featured, above."}
            </p>
          )}
        </section>

        <section className="mt-16 rounded-3xl bg-[var(--sc-accent)] px-6 py-12 text-[var(--sc-on)] sm:px-10" aria-labelledby="submit-heading">
          <h2 id="submit-heading" className="text-3xl font-semibold tracking-tight">
            Submit yours
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed">
            Recorded a venture with Naive? Open an issue on the repository and point at the records. This page does not collect submissions.
          </p>
          <p className="mt-6">
            <a
              className="sc-submit inline-block rounded-full bg-[var(--sc-on)] px-5 py-2.5 font-medium"
              href={showcaseLinks.issues}
              target="_blank"
              rel="noreferrer"
            >
              Open the issues
            </a>
          </p>
        </section>

        <p className="mt-8 text-sm text-[var(--sc-muted)]">
          Entry list compiled from the repository on {showcaseMeta.readOn}. {showcaseMeta.note}
        </p>
      </main>
    </div>
  );
}
