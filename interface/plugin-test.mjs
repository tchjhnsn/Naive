// The Claude Code plugin (EE-084): the repository, and so the naive-framework npm package, is the plugin.
// Its manifest follows package.json, names skills that exist, and starts the MCP server from its own
// copy of the framework, which answers outside a venture. The public marketplace is tchjhnsn/naive-plugins;
// the only one here is .claude-plugin/marketplace.json, for a clone.

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
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

t("one marketplace in the repo, for a clone; the README names it and the public naive-plugins one", () => {
  ok(load(".claude-plugin/marketplace.json").plugins.some((p) => p.name === "naive" && p.source === "./"));
  const r = spawnSync("git", ["ls-files", "*marketplace*.json"], { cwd: repo, encoding: "utf8" });
  const listed = r.stdout.split("\n").filter(Boolean);
  ok(listed.length === 1 && listed[0] === ".claude-plugin/marketplace.json", `marketplaces: ${listed.join(", ")}`);
  const docs = readFileSync(join(repo, "README.md"), "utf8");
  ok(docs.includes("/plugin marketplace add tchjhnsn/naive-plugins") && docs.includes(".claude-plugin/marketplace.json"), "README.md");
});

// The plugin a user installs is the npm package, so validate what npm packs: a clone also holds this
// repository's own CLAUDE.md and agents/, which the package leaves out and which Claude Code would read as
// plugin context and a plugin agent.
t("Claude Code accepts the packed plugin and the marketplace (when the claude CLI is installed)", () => {
  if (spawnSync("claude", ["--version"]).status !== 0) return;
  const dir = mkdtempSync(join(tmpdir(), "plugin-pack-"));
  const pack = spawnSync("npm", ["pack", "--pack-destination", dir, "--silent"], { cwd: repo, encoding: "utf8" });
  ok(pack.status === 0, pack.stderr);
  const tgz = join(dir, pack.stdout.trim().split("\n").pop() ?? "");
  const x = spawnSync("tar", ["xzf", tgz, "-C", dir], { encoding: "utf8" });
  ok(x.status === 0, x.stderr);
  const r = spawnSync("claude", ["plugin", "validate", join(dir, "package"), "--strict"], { encoding: "utf8" });
  rmSync(dir, { recursive: true, force: true });
  ok(r.status === 0, r.stdout + r.stderr);
  const m = spawnSync("claude", ["plugin", "validate", join(repo, ".claude-plugin/marketplace.json"), "--strict"], { encoding: "utf8" });
  ok(m.status === 0, m.stdout + m.stderr);
});

process.exit(failed ? 1 : 0);
