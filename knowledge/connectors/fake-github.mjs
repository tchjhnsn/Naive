// A fake of the part of GitHub's REST API the GitHub connector uses, as a fetch function, so the
// connector's evals run offline. It follows the real API's shapes and refusals: trees, contents
// (404 for a missing file, 422 for a PUT over an existing file without its sha), commits, refs,
// pulls and code search (default branch only), and 401 without a token. It is a test double, not a
// second implementation: the live eval (MENTURA_EVAL_GITHUB_REPO) checks the same contract on the
// real API.
//
//   const gh = fakeGitHub({ repo: "acme/knowledge", files: { "docs/a.md": "..." } });
//   connect({ repo: "acme/knowledge", fetch: gh.fetch })

import { createHash } from "node:crypto";
import { blobSha, matches } from "./contract.mjs";

export function fakeGitHub({ repo, files = {}, branch = "main", token = true } = {}) {
  let n = 0;
  const commits = new Map();
  const commit = (snapshot) => { const sha = createHash("sha1").update(`commit ${++n}`).digest("hex"); commits.set(sha, new Map(snapshot)); return sha; };
  const branches = new Map([[branch, commit(Object.entries(files))]]);
  const pulls = [];
  const calls = [];
  const at = (ref) => commits.get(branches.get(ref) ?? ref) ?? null;
  const json = (status, body) => new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  async function fetch(url, { method = "GET", headers = {}, body } = {}) {
    const u = new URL(url);
    calls.push(`${method} ${u.pathname}`);
    if (token && !headers.authorization) return json(401, { message: "Requires authentication" });
    const p = decodeURIComponent(u.pathname);
    const rp = `/repos/${repo}`;
    const b = body ? JSON.parse(body) : {};
    let m;
    if (method === "GET" && (m = p.match(new RegExp(`^${rp}/git/trees/(.+)$`)))) {
      const s = at(m[1]);
      if (!s) return json(404, { message: "Not Found" });
      return json(200, { sha: branches.get(m[1]) ?? m[1], truncated: false, tree: [...s].map(([path, c]) => ({ path, type: "blob", sha: blobSha(c), size: Buffer.byteLength(c) })) });
    }
    if (method === "GET" && (m = p.match(new RegExp(`^${rp}/commits/(.+)$`)))) {
      const sha = branches.get(m[1]) ?? (commits.has(m[1]) ? m[1] : null);
      return sha ? json(200, { sha }) : json(404, { message: "Not Found" });
    }
    if (method === "GET" && (m = p.match(new RegExp(`^${rp}/git/ref/heads/(.+)$`)))) {
      return branches.has(m[1]) ? json(200, { ref: `refs/heads/${m[1]}`, object: { sha: branches.get(m[1]), type: "commit" } }) : json(404, { message: "Not Found" });
    }
    if (method === "POST" && p === `${rp}/git/refs`) {
      const name = b.ref.replace(/^refs\/heads\//, "");
      if (branches.has(name)) return json(422, { message: "Reference already exists" });
      if (!commits.has(b.sha)) return json(422, { message: "Object does not exist" });
      branches.set(name, b.sha);
      return json(201, { ref: b.ref, object: { sha: b.sha } });
    }
    if ((m = p.match(new RegExp(`^${rp}/contents/(.+)$`)))) {
      const path = m[1];
      if (method === "GET") {
        const s = at(u.searchParams.get("ref") ?? branch);
        if (!s || !s.has(path)) return json(404, { message: "Not Found" });
        const c = s.get(path);
        return json(200, { type: "file", path, sha: blobSha(c), encoding: "base64", content: Buffer.from(c).toString("base64") });
      }
      if (method === "PUT") {
        const on = b.branch ?? branch;
        const s = at(on);
        if (!s) return json(404, { message: "Branch not found" });
        if (s.has(path) && b.sha !== blobSha(s.get(path))) return json(b.sha ? 409 : 422, { message: b.sha ? `${path} does not match ${b.sha}` : "Invalid request.\n\n\"sha\" wasn't supplied." });
        const next = new Map(s);
        const c = Buffer.from(b.content, "base64").toString("utf8");
        next.set(path, c);
        const sha = commit(next);
        branches.set(on, sha);
        return json(s.has(path) ? 200 : 201, { content: { path, sha: blobSha(c) }, commit: { sha, message: b.message } });
      }
    }
    if (method === "POST" && p === `${rp}/pulls`) {
      if (!branches.has(b.head) || !branches.has(b.base)) return json(422, { message: "Validation Failed" });
      const pr = { number: pulls.length + 1, html_url: `https://github.com/${repo}/pull/${pulls.length + 1}`, title: b.title, body: b.body, draft: !!b.draft, head: { ref: b.head }, base: { ref: b.base }, state: "open" };
      pulls.push(pr);
      return json(201, pr);
    }
    if (method === "GET" && p === "/search/code") {
      const q = u.searchParams.get("q") ?? "";
      const quals = Object.fromEntries([...q.matchAll(/(\w+):(\S+)/g)].map((x) => [x[1], x[2]]));
      if (quals.repo !== repo) return json(422, { message: "Validation Failed" });
      const terms = q.replace(/\w+:\S+/g, " ").trim();
      const items = [...at(branch)].filter(([path, c]) => (!quals.path || path.startsWith(`${quals.path}/`) || path === quals.path) && matches(`${path}\n${c}`, terms))
        .map(([path, c]) => ({ name: path.split("/").at(-1), path, sha: blobSha(c) }));
      return json(200, { total_count: items.length, incomplete_results: false, items });
    }
    return json(404, { message: `the fake has no ${method} ${p}` });
  }

  return { fetch, branches, pulls, calls, files: (ref = branch) => Object.fromEntries(at(ref) ?? []) };
}
