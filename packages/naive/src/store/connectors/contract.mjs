// The connector contract (EE-037). A connector reaches one source of records (a folder, a GitHub
// repository, later a database, Notion or Salesforce) and does the same five things for every one:
//
//   list(prefix)            [{ path, version }] for every item under the prefix, sorted by path
//   read(path)              { path, content, version, commit?, permalink? }, or null when it is missing
//   version(path)           the item's version, or null when it is missing
//   search(query, {limit})  [{ path, version }] for items whose text holds every word of the query
//   write(path, content, {message, title})
//                           { path, version, commit?, pull_request? }; how it writes is the
//                           connector's `writes`: direct (in place), pull-request (a draft pull
//                           request; merging it accepts the write) or none (read-only, write throws)
//
// Paths are relative to the source's root and use forward slashes; a path that leaves the root is
// refused. Content is UTF-8 text. A version is the git blob SHA-1 of the content, whichever
// connector holds it, so the same content has the same version in every source and a version
// can be checked without asking the source. An item's address is <source id>://<path>; with its
// version it is what provenance cites.

import { createHash } from "node:crypto";

export const METHODS = ["list", "read", "version", "search", "write"];
export const WRITES = ["direct", "pull-request", "none"];

/** The git blob SHA-1 of some content: what `git hash-object` prints. */
export const blobSha = (content) => {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
};

/** A path inside a source, normalised, or an error for one that is empty or leaves the root. */
export function safePath(p) {
  if (typeof p !== "string" || !p.length || p.includes("\0") || p.includes("\\") || p.startsWith("/")) throw new Error(`${JSON.stringify(p)} is not a path inside the source`);
  const parts = p.split("/").filter((s) => s && s !== ".");
  if (!parts.length || parts.includes("..")) throw new Error(`${p} is not a path inside the source`);
  return parts.join("/");
}

export const address = (sourceId, path) => `${sourceId}://${path}`;

/** Every word of the query, lowercased, appears in the text. */
export const matches = (text, query) => {
  const t = text.toLowerCase();
  return words(query).every((w) => t.includes(w));
};
export const words = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/** Text a catalog may index: small files that are not binary. */
export const isText = (path, content) => !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|mp4|mov)$/i.test(path) && (content === undefined || !content.includes("\0"));

/** Checks an object has the contract's methods and a known `writes`. Returns the problems. */
export function conformance(c) {
  const problems = METHODS.filter((m) => typeof c?.[m] !== "function").map((m) => `no ${m}()`);
  if (!WRITES.includes(c?.writes)) problems.push(`writes is ${c?.writes}, not one of ${WRITES.join(", ")}`);
  if (typeof c?.id !== "string") problems.push("no id");
  return problems;
}
