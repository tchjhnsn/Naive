# Note: files the docs name have moved

- From: architect (written by hand on 2026-11-27, before the role exists)
- To: site owner
- Pages: 8 docs pages under `content/docs/`
- Source: the repository's layout on main, where the code sits under `packages/naive/src/` and the packages under `packages/naive/library/packages/`

## What changed on the pages

Nine paths that named a file by its old place now name it where it is: the ontology, the business roles, the MCP server, the freshness defaults, the instrumentation module, the package catalog, two package manifests and one test.

## Left as it is, and why

- Paths inside a business folder, such as `knowledge/sources.json` or `governance/delegation.json`. They are relative to the business, not to this repository, and they are right.
- Old paths inside quoted program output on three pages (`get-started/upgrading.mdx`, `get-started/errors.mdx`, `get-started/prefetching-and-vitals.mdx`). Each block has to be captured again by running the command, not edited by hand.
