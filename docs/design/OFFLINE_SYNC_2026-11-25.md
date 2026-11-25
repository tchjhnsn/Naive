# Offline sync between a working copy and a business store

Date: 2026-11-25. Decision: EE-174. Status: the field merge is built (`packages/naive/src/engine/merge.ts`); the rest is listed under Not built. Torian's review copy of this design is the Claude Doc "Syncing an offline business with Mentura".

## The ask

Torian, 2026-11-25 06:16Z to 06:26Z: a business can live as files alone, and a founder who works offline must be able to sync what they changed with the business's database when they are back. On a decision card at 06:26Z he chose how conflicts resolve: field by field, with the same field changed on both sides kept as a decision for a person. Last writer wins and CRDTs were rejected.

## Domain

Files alone are a whole Naive. A business store (Mentura keeps records in Neon Postgres and files in Neon's object storage) is for people with no filesystem, several writers at once, connectors that run while a laptop is closed and sign-in tokens that must stay out of git.

| Term | Meaning |
|---|---|
| Business store | The business's records and files in the host. Hosted, it is the copy everyone else sees. |
| Working copy | A folder holding the business's records as files. A host makes one per request (docs/design/HOSTED_WORKING_COPY_2026-11-07.md); a founder's laptop holds one that may be away for days. |
| Version | Every record in the store has one, moving forward on each write. The store is append-only. |
| Base version | The version a working copy last saw for a record. A write names it (`base` in `packages/naive/src/store/connectors/contract.ts`). |
| Sync point | The newest store position a working copy has pulled. |
| Conflict | The same field of the same record changed on both sides since the base version. |
| Conflict decision | An open decision holding both values, who wrote each and when, for a person to pick one or write a third. |

Rules:

1. A working copy is a full business. Every write offline passes the gate and goes into the local provenance log.
2. Nothing in the store is overwritten blind: a push names the base version of every record it changes.
3. A field changed on one side only merges without asking.
4. The same field changed on both sides keeps both values, and a person decides: never the sync and never an agent.
5. Until then the record keeps the store's value; the decision holds the local value, so nothing is lost.
6. Files are named by their sha256, so a file never conflicts. A record field that points at one can.
7. Sync never sends git internals, `.env` files, derived files or anything `check-private.ts` refuses.

## System

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Linked: naive sync link (device sign-in)
  Linked --> InSync: first pull
  InSync --> Ahead: a local write
  InSync --> Behind: someone writes in the store
  Ahead --> Diverged: someone writes in the store
  Behind --> Diverged: a local write
  Behind --> InSync: pull, fast-forward
  Ahead --> Pushing: push
  Diverged --> Merging: pull
  Merging --> Ahead: every field merged
  Merging --> Conflicted: same field changed on both sides
  Conflicted --> Ahead: conflict decisions filed, store value kept
  Pushing --> InSync: every base version matched
  Pushing --> Merging: the store moved, pull again
```

- **Pull.** Fetch every record newer than the sync point. For each, compare the base (from the blob store, `packages/naive/src/core/blobs.ts`, by the hash the last pull recorded), the local copy and the store copy, and merge with `mergeRecord`. Copy down missing file hashes. Move the sync point only after every record is written, so a stopped pull can run again.
- **Field merge** (built, `packages/naive/src/engine/merge.ts`). Objects merge key by key; arrays whose items are objects with unique string ids merge item by item; any other array is one value. A merged record must still pass its schema and the gate, or it becomes a conflict decision.
- **Push.** Upload missing file hashes, then send every change with its base version. The store accepts the batch only if every base still matches, and writes it through its router, so the gate, decision rights and provenance apply as for any write. A refused push pulls, merges and tries again, at most twice.
- **Provenance.** On push each local provenance line is written again on top of the store's chain, naming its original hash and the working copy it came from, as a rebase keeps the original commit.
- **Sign-in.** A device sign-in gives the CLI a token scoped to one business, kept in the operating system's keychain, never in the business folder. Naive names no vendor: the host's address comes from configuration.

## Not built

In the order of the design's pull requests: filing a conflict as a decision; provenance re-chaining and `check-provenance.ts` accepting it; the host's sync API; device sign-in; `naive sync link`, `pull`, `push` and `status`; files to the host's object storage; a production check. Out of scope for now: live sync on every write, merging inside one text field, syncing a code repository, and two-way sync with outside tools (a connector job under the source-of-truth matrix, EE-042).
