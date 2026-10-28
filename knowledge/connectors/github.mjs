// The GitHub connector (EE-037): one repository, at one branch, under one folder, through the REST
// API with plain fetch (no SDK). Reads come from the branch; a write opens a draft pull request
// against it, and merging the pull request is what accepts the write (Torian's choice, 2026-10-28).
//
//   repo     owner/name
//   ref      the branch reads come from and pull requests target (default main)
//   root     the folder inside the repository the source covers (default the whole repository)
//   token    the name of the environment variable holding a token (default GITHUB_TOKEN); the
//            token itself is never stored. Without one, only public repositories can be read.
//   api      the API base (default https://api.github.com; GitHub Enterprise has its own)
//   search   api (default): code search, which covers the default branch only, falling back to a
//            scan when it is refused; scan: read every text file under root and match
//   writes   pull-request (default) or none
//   fetch    a fetch function (default globalThis.fetch); the evals pass a fake GitHub here
//
// version is the blob SHA GitHub reports, which is the git blob SHA-1 of the content. read also
// gives the branch's commit and a permalink to the file at that commit, which is what to cite.

import { blobSha, isText, matches, safePath } from "./contract.mjs";

export function connect({ id = "github", repo, ref = "main", root = "", token = "GITHUB_TOKEN", api = "https://api.github.com", search = "api", writes = "pull-request", fetch: f = globalThis.fetch } = {}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo ?? "")) throw new Error(`the github connector needs repo as owner/name, not ${repo}`);
  if (writes === "direct") throw new Error("the github connector writes by pull request or not at all");
  const base = root ? safePath(root) : "";
  const full = (p) => (base ? `${base}/${safePath(p)}` : safePath(p));
  const inside = (p) => !base || p.startsWith(`${base}/`);
  const rel = (p) => (base ? p.slice(base.length + 1) : p);
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
  const web = api === "https://api.github.com" ? "https://github.com" : api.replace(/\/api\/v3\/?$/, "");

  async function gh(method, path, body) {
    const secret = process.env[token];
    const res = await f(`${api}${path}`, { method, headers: { accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "mentura",
      ...(secret ? { authorization: `Bearer ${secret}` } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    if (res.status === 404 && method === "GET") return null;
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) {
      const why = res.status === 401 ? `no valid token in ${token}` : res.status === 403 ? `forbidden (token scope, or a rate limit)` : data?.message ?? res.statusText;
      const e = new Error(`GitHub ${method} ${path}: ${res.status} ${why}`);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  const head = async () => (await gh("GET", `/repos/${repo}/commits/${encodeURIComponent(ref)}`))?.sha ?? null;
  const tree = async () => {
    const t = await gh("GET", `/repos/${repo}/git/trees/${encodeURIComponent(ref)}?recursive=1`);
    if (!t) throw new Error(`${repo} has no branch ${ref}`);
    if (t.truncated) throw new Error(`${repo}@${ref} is too large for one tree listing; set root to a smaller folder`);
    return t.tree.filter((x) => x.type === "blob" && inside(x.path));
  };
  const contents = async (p, at = ref) => {
    const x = await gh("GET", `/repos/${repo}/contents/${enc(full(p))}?ref=${encodeURIComponent(at)}`);
    return x && !Array.isArray(x) && x.type === "file" ? x : null;
  };
  const decode = (x) => Buffer.from(x.content ?? "", x.encoding === "base64" ? "base64" : "utf8").toString("utf8");

  return {
    id, kind: "github", writes, repo, ref, root: base,
    async list(prefix = "") {
      const pre = prefix ? safePath(prefix) : "";
      return (await tree()).map((x) => ({ path: rel(x.path), version: x.sha })).filter((x) => !pre || x.path === pre || x.path.startsWith(`${pre}/`)).sort((a, b) => a.path.localeCompare(b.path));
    },
    async read(p) {
      const x = await contents(p);
      if (!x) return null;
      const commit = await head();
      return { path: safePath(p), content: decode(x), version: x.sha, ...(commit ? { commit, permalink: `${web}/${repo}/blob/${commit}/${enc(full(p))}` } : {}) };
    },
    async version(p) {
      return (await contents(p))?.sha ?? null;
    },
    async search(query, { limit = 50 } = {}) {
      if (search === "api") {
        try {
          const q = `${query} repo:${repo}${base ? ` path:${base}` : ""}`;
          const r = await gh("GET", `/search/code?q=${encodeURIComponent(q)}&per_page=${Math.min(limit, 100)}`);
          return (r?.items ?? []).filter((x) => inside(x.path)).map((x) => ({ path: rel(x.path), version: x.sha })).slice(0, limit);
        } catch (e) { if (![403, 422].includes(e.status)) throw e; }
      }
      const out = [];
      for (const x of await tree()) {
        if (out.length >= limit) break;
        if (!isText(x.path)) continue;
        const c = await contents(rel(x.path));
        if (c && matches(`${rel(x.path)}\n${decode(c)}`, query)) out.push({ path: rel(x.path), version: x.sha });
      }
      return out;
    },
    async write(p, content, { message, title } = {}) {
      if (writes === "none") throw new Error(`${id} is read-only`);
      const path = full(p);
      const from = (await gh("GET", `/repos/${repo}/git/ref/heads/${enc(ref)}`))?.object?.sha;
      if (!from) throw new Error(`${repo} has no branch ${ref}`);
      const branch = `mentura/${path.replace(/[^\w.-]+/g, "-").slice(0, 60)}-${Date.now().toString(36)}`;
      await gh("POST", `/repos/${repo}/git/refs`, { ref: `refs/heads/${branch}`, sha: from });
      const existing = await contents(p, branch);
      const put = await gh("PUT", `/repos/${repo}/contents/${enc(path)}`, { message: message ?? `Update ${path}`, content: Buffer.from(content, "utf8").toString("base64"), branch, ...(existing ? { sha: existing.sha } : {}) });
      const pr = await gh("POST", `/repos/${repo}/pulls`, { title: title ?? message ?? `Update ${path}`, head: branch, base: ref, draft: true,
        body: `${message ?? `Update ${path}`}\n\nOpened by Mentura. Merging this pull request accepts the write.` });
      return { path: safePath(p), version: put?.content?.sha ?? blobSha(content), commit: put?.commit?.sha, pull_request: { number: pr.number, url: pr.html_url, branch } };
    },
  };
}
