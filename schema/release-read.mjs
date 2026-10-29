// Reading a release without the router (C-12, I-17). A release is the venture's static shell
// (C-11): the confirmed records frozen in, and named holes for what stays live. Everything here
// reads <venture>/.release/ and nothing else, so a release can be read after the venture's records
// change, on a machine with no router, or handed to an investor as files. It never imports
// interface/router.mjs; schema/releases-test.mjs checks that.
//
// The answer to a path is { status, type, body }:
//   /                    the release index: venture, phase, release id, routes in the release, holes
//   /release.json        the manifest;  /card.json  the release card's data (P-25, O-7)
//   /records/<file>      one frozen record, as it was when it was confirmed
//   /<route>             a route as the release holds it: a frozen record, a collection's frozen items,
//                        a frozen command answer (H-4), or a hole that names where to read it live.
//                        An item the release does not hold answers 404 with the items it does and the
//                        command that adds it without rebuilding the rest (C-18, N-10).
// Any method other than GET or HEAD answers 405: a release is read-only.

import { existsSync, readFileSync } from "node:fs";
import { join, normalize } from "node:path";

export const RELEASE_DIR = ".release";
export const MANIFEST = ".release/release.json";
export const CARD = ".release/card.json";
export const RECORDS = ".release/records";

/** The release manifest of a venture, or null when it has none. */
export function readRelease(dir) {
  const f = join(dir, MANIFEST);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
}

/** The frozen copy of one record in a release, as text, or null. */
export function frozenText(dir, file) {
  const rel = normalize(file);
  if (rel.startsWith("..") || rel.startsWith("/")) return null;
  const f = join(dir, RECORDS, rel);
  return existsSync(f) ? readFileSync(f, "utf8") : null;
}

const parse = (file, text) => file.endsWith(".json") ? JSON.parse(text) : text;
const json = (status, body) => ({ status, type: "application/json; charset=utf-8", body: JSON.stringify(body, null, 2) + "\n" });

/** The index a reader starts from. */
export function index(m) {
  return { release: m.release, venture: m.venture, name: m.name, phase: m.phase, built_at: m.built_at, now: m.now,
    routes: m.routes.filter((r) => r.in === "release").map((r) => r.route),
    holes: m.holes.map((h) => ({ kind: h.kind, route: h.route, name: h.name, why: h.why })),
    card: "/card.json", manifest: "/release.json",
    note: "A release is read-only. Holes stay live: read them in the venture through the router." };
}

/** What a route holds in a release: { status, body }. Matches a concrete route (product/kettle) to its entry. */
export function resolveRoute(dir, m, route) {
  route = route.replace(/^\/+|\/+$/g, "");
  const exact = m.routes.find((r) => r.route === route);
  const entry = exact ?? m.routes.find((r) => r.route.endsWith("/[id]") && route.startsWith(r.route.slice(0, -4)) && !route.slice(r.route.length - 4).includes("/"));
  if (!entry) return { status: 404, body: { error: `no route ${route} in release ${m.release}` } };
  const id = exact ? null : route.slice(entry.route.length - 4);
  const holes = m.holes.filter((h) => h.route === route || h.route_template === entry.route);
  // A decision is also found by its id (decisions/founding-team), whatever its file is called.
  const own = holes.find((h) => (h.route === route || (h.kind === "decision" && `decisions/${h.name}` === route)) && h.kind !== "attribute");
  if (entry.in === "hole") return { status: 200, body: { route, hole: true, kind: own?.kind ?? entry.kind, why: own?.why ?? entry.why, live: own?.live ?? entry.live ?? null, ...(own ? {} : { holes }) } };
  if (entry.in === "left out") return { status: 404, body: { route, left_out: true, why: entry.why } };
  if (entry.kind === "command") {
    const out = m.commands?.[entry.route];
    return out === undefined ? { status: 404, body: { route, empty: true, why: entry.why ?? "not in this release" } } : { status: 200, body: { route, frozen: true, built_from: out.built_from, result: out.result } };
  }
  const recs = m.records.filter((r) => r.route_template === entry.route);
  const fieldHoles = (r) => m.holes.filter((h) => h.kind === "attribute" && h.file === r.file).map((h) => h.field);
  const one = (r) => ({ file: r.file, as_of: r.as_of, confirmed_by: r.confirmed_by, ...(fieldHoles(r).length ? { live_fields: fieldHoles(r) } : {}), record: parse(r.file, frozenText(dir, r.file)) });
  if (entry.collection === "list") {
    const items = m.records.filter((r) => r.route_template === `${entry.route}/[id]`);
    return { status: 200, body: { route, items: Object.fromEntries(items.map((r) => [r.id, one(r)])), holes } };
  }
  if (entry.collection === "item") {
    const hit = recs.find((r) => r.id === id);
    if (own) return { status: 200, body: { route, hole: true, kind: own.kind, why: own.why, live: own.live ?? null } };
    if (!hit) return { status: 404, body: { route, not_in_release: true, release: m.release, items: recs.map((r) => r.id), ...(holes.length ? { live_items: holes.filter((h) => h.kind !== "attribute").map((h) => h.name) } : {}),
      note: `${route} was not known when release ${m.release} was built`, add: `node schema/build-release.mjs <venture dir> --add ${route}` } };
    return { status: 200, body: { route, ...one(hit) } };
  }
  if (!recs.length) return { status: 404, body: { route, empty: true, why: entry.why ?? "no confirmed record when the release was built" } };
  return { status: 200, body: { route, ...(recs.length === 1 ? one(recs[0]) : { records: recs.map(one) }) } };
}

/**
 * Answers one request against a venture's release. draw, when given, turns the card's data into an
 * image (the interface's job, O-7): draw(card) -> SVG text.
 */
export function answer(dir, method, path, { draw } = {}) {
  if (method !== "GET" && method !== "HEAD") return { ...json(405, { error: "a release is read-only: only GET and HEAD" }), allow: "GET, HEAD" };
  const m = readRelease(dir);
  if (!m) return json(503, { error: `no release in ${dir}: run node schema/build-release.mjs ${dir} first` });
  const p = decodeURIComponent(path.split("?")[0]);
  if (p.split("/").includes("..")) return json(400, { error: "no .. in a release path" });
  if (p === "/" || p === "") return json(200, index(m));
  if (p === "/release.json") return json(200, m);
  if (p === "/card.json") return existsSync(join(dir, CARD)) ? json(200, JSON.parse(readFileSync(join(dir, CARD), "utf8"))) : json(404, { error: "this release has no card" });
  if (p === "/card.svg") {
    if (!draw) return json(404, { error: "no card drawing here" });
    return { status: 200, type: "image/svg+xml; charset=utf-8", body: draw(JSON.parse(readFileSync(join(dir, CARD), "utf8"))) };
  }
  if (p.startsWith("/records/")) {
    const file = p.slice("/records/".length);
    const r = m.records.find((x) => x.file === file);
    const text = r ? frozenText(dir, file) : null;
    if (text === null) return json(404, { error: `${file} is not in release ${m.release}` });
    return { status: 200, type: file.endsWith(".json") ? "application/json; charset=utf-8" : "text/markdown; charset=utf-8", body: text };
  }
  const r = resolveRoute(dir, m, p);
  return json(r.status, r.body);
}
