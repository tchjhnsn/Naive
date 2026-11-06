---
type: knowledge
tags: [everything-ecosystem, mentura, skills, interface, install, mcp, cli]
ai-model: claude-opus-5.5
created: 2026-10-27T20:52:58Z
source: hybrid
name: install-mentura
description: >
  Install Mentura (the Everything Ecosystem) into a coding agent: the MCP server
  for Claude Code or Cursor, the CLI, and a first venture, using the whole system
  or only the layers the builder wants (EE-030).
  MANDATORY TRIGGERS: install mentura, set up mentura, add the everything
  ecosystem, use mentura in claude code, use mentura in cursor, mentura mcp,
  adopt one layer, only the validation kit, start a venture.
---

# Install Mentura

Interface layer (EE-030). Mentura is a set of records, checks and kits in a git repository. This skill connects an agent harness to it. Every interface (CLI, MCP server, HTTP API) goes through `packages/naive/src/router/router.mjs`, so each one has the same routes and gates. The routes are listed in `docs/reference/ROUTES.md`.

## 1. Ask what the builder wants to adopt

Partial adoption is the default. Ask which of these they want, and do not install more:

- **The whole system:** every layer, with the phase defaults.
- **One layer:** for example `purpose` alone, to state a telos and validate.
- **One kit inside a layer:** for example the validation kit. Turn on its layer only; the kit's routes need nothing else.

A layer the builder leaves off is written as `false` in `venture.json`. The need-now score then lists that layer's records as "layer off" instead of suggesting them.

## 2. Get the repository and check it runs

```sh
git clone <the Mentura repository> mentura
cd mentura && npm install && node test.mjs   # Node 22.18+ and python3 with jsonschema (pip install jsonschema)
```

## 3. Start a venture, or point at existing ones

```sh
node packages/naive/src/interfaces/cli/mentura.mjs init <folder>/my-venture --id my-venture --layers purpose
node packages/naive/src/interfaces/cli/mentura.mjs system/need-now run --venture my-venture --workspace <folder>
```

`init` creates new ventures only: it refuses a directory that already has files. To bring an existing project in, create the venture, then run `node packages/naive/src/interfaces/cli/naive.mjs port --from <project> --venture <folder>/my-venture`, read the plan it writes, and apply it with `--apply --confirm port`. To have an agent rewrite the project as Naive records instead, use `naive.mjs migrate` with the same flags, have the founder settle each `migrate-<function>` decision, then run `migrate --venture <folder>/my-venture --apply`. Never run `init` on someone's existing project.

To use the whole system, leave out `--layers`. The workspace is the folder that holds the ventures. Set `MENTURA_WORKSPACE` to it so that you do not have to pass `--workspace` each time.

## 4. Connect the harness

**Claude Code** (one command; add `--scope project` to share it in the venture's repo through `.mcp.json`):

```sh
claude mcp add mentura --env MENTURA_WORKSPACE=<folder> --env MENTURA_HARNESS="Claude Code" -- node <mentura>/packages/naive/src/interfaces/mcp/server.mjs
```

**Cursor** (`.cursor/mcp.json` in the project, or `~/.cursor/mcp.json` for every project):

```json
{
  "mcpServers": {
    "mentura": {
      "command": "node",
      "args": ["<mentura>/packages/naive/src/interfaces/mcp/server.mjs"],
      "env": { "MENTURA_WORKSPACE": "<folder>", "MENTURA_HARNESS": "Cursor" }
    }
  }
}
```

**Any other harness or script:** use the CLI (`node packages/naive/src/interfaces/cli/mentura.mjs help`). You can also run `node packages/naive/src/interfaces/api/server.mjs`. It listens only on 127.0.0.1:4330 and has no authentication, so keep it on the builder's own machine.

Use absolute paths in both configs. Check the connection by asking the agent to call `mentura_ventures`, then `mentura_view` on `system/overview`. Before an agent acts on a route, it should call `mentura_layout` for that route: it returns the kit's skills, references, template and gate.

## 5. Tell the builder how gates work

- An agent's write to a gated record becomes a draft in `<venture>/_drafts/`. The gated records are ownership, board, founder agreement, exit, telos, decision rights and publication policy. Writes through the MCP server and the API always count as an agent's.
- A person accepts a draft with `mentura accept <route> --venture <id>`.
- The CLI cannot tell whether a person or an agent is typing. The real gate is the repository's review: a person merges the pull request.
- Every write is logged in `<venture>/provenance.jsonl` (EE-031): who wrote it, through which interface, what it came from and the decision it acted under. Set `MENTURA_ACTOR_ID`, `MENTURA_MODEL`, `MENTURA_SESSION` and `MENTURA_HARNESS` in the harness config so that each line names the agent. The MCP server also records the harness name that the client reports. For a venture that existed before the log, run `mentura baseline --venture <id>` once.
- Every write is checked against the record's schema first. A record that does not match is refused, and nothing changes.

## Sources

- W3C PROV-DM, the provenance data model: https://www.w3.org/TR/prov-dm/ (checked 2026-10-27).
- Model Context Protocol specification: https://modelcontextprotocol.io/specification/2025-06-18 (checked 2026-10-27).
- Claude Code MCP setup (`claude mcp add`, scopes): https://docs.claude.com/en/docs/claude-code/mcp (checked 2026-10-27).
- Cursor MCP configuration (`.cursor/mcp.json`): https://docs.cursor.com/context/model-context-protocol (checked 2026-10-27).
