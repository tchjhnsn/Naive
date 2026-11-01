# README template

Every folder that holds code gets a `README.md` built from this template. The README sits next to the code it describes, the code is the source of truth, and a pull request that changes the code changes the nearest README in the same commit (or a line of its body starts with `No docs change: ` and gives a real reason). The `docs required` check enforces it, and `node schema/check-docs-claims.mjs` checks every README: each path, command and route it names exists, and each relative Markdown link, inline or reference-style, resolves (HTML `href` and `src` are not checked).

Copy everything below the line. Keep each README to about a page; when a section outgrows that, give the subfolder its own README and link to it. Write only what is built; anything planned says "not built" in that sentence.

---

# <folder name>

Up: [<parent folder>](../README.md)

## What this is

One paragraph: what this folder does, for whom, and the decision that set it up (`EE-NNN`).

## Where things are

| Path | Holds |
|---|---|
| [`<file or subfolder>`](./<file or subfolder>) | One line. Link a subfolder's README when it has one. |

## Run and test

- `node <script> <args>`: what it does and what it prints.
- The test that covers this folder, and how `node test.mjs` runs it.

## How it connects

- Called by: [`<caller>`](<relative path>).
- Calls: [`<dependency>`](<relative path>).
- Records it reads or writes, by route (`foundation/problem`).

## Not built

- Each gap in one line, with the decision or issue that tracks it. Delete the section when there are none.
