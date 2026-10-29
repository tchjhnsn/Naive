// The Claude Code plugin (EE-084): the repository, and so the naive-framework npm package, is the plugin.
// Its manifest follows package.json, names skills that exist, and starts the MCP server from its own
// copy of the framework, which answers outside a venture; both marketplaces name it.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(join(repo, p), "utf8"));
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const plugin = load(".claude-plugin/plugin.json"), pkg = load("package.json");

t("the plugin's version is the framework's, and npm ships its manifest", () => {
  ok(plugin.name === "naive" && plugin.version === pkg.version, `${plugin.version} != ${pkg.version}`);
  ok(pkg.files.includes(".claude-plugin/plugin.json"), "package.json files leaves the manifest out");
});

t("every skill the plugin names exists, with a SKILL.md", () => {
  for (const s of plugin.skills) ok(existsSync(join(repo, s, "SKILL.md")), `${s}/SKILL.md`);
});

t("the MCP server runs from the plugin's own copy and answers outside a venture", () => {
  const servers = typeof plugin.mcpServers === "string" ? load(plugin.mcpServers).mcpServers : plugin.mcpServers;
  const server = servers.naive;
  const args = server.args.map((a) => a.replace("${CLAUDE_PLUGIN_ROOT}", repo.replace(/\/$/, "")));
  ok(existsSync(args[0]), args[0]);
  const input = [
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "0" } } },
    { jsonrpc: "2.0", method: "notifications/initialized" },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ].map((m) => JSON.stringify(m)).join("\n") + "\n";
  const env = { ...process.env, ...server.env };
  delete env.MENTURA_WORKSPACE;
  const r = spawnSync(server.command, args, { cwd: mkdtempSync(join(tmpdir(), "plugin-test-")), input, env, encoding: "utf8" });
  const out = r.stdout.split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const tools = out.find((m) => m.id === 2)?.result?.tools ?? [];
  ok(tools.some((x) => x.name === "mentura_setup"), `tools: ${tools.map((x) => x.name).join(", ")} ${r.stderr}`);
});

t("both marketplaces list the plugin: the clone's by path, the public one from npm", () => {
  ok(load(".claude-plugin/marketplace.json").plugins.some((p) => p.name === "naive" && p.source === "./"));
  const pub = load("interface/plugin-marketplace.json").plugins.find((p) => p.name === "naive");
  ok(pub?.source?.source === "npm" && pub.source.package === pkg.name, JSON.stringify(pub));
});

t("Claude Code accepts the manifests (when the claude CLI is installed)", () => {
  if (spawnSync("claude", ["--version"]).status !== 0) return;
  const r = spawnSync("claude", ["plugin", "validate", repo, "--strict"], { encoding: "utf8" });
  ok(r.status === 0, r.stdout + r.stderr);
});

process.exit(failed ? 1 : 0);
