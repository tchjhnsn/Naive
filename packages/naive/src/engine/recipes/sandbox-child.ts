// The sandbox child: the process that runs one batch of recipe calls. The host (sandbox.ts) never runs this
// file as a module. It reads the text, strips the types and starts it with `node --permission -e`, so the
// child needs no file system read grant, not even for itself. Design: everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The sandbox (Naive)".
//
// Protocol: one JSON job on stdin, one JSON reply on stdout, then exit.
//   job:   { prelude, script, callMs, calls: [{ input, knobs, mode }] }, every value a string or a number
//   reply: { results: [{ ok: true, value } | { ok: false, reason }] }, or { error } when the job is unusable
// Each call gets a fresh realm (a vm context with an ordinary global object, string and wasm code generation
// off, microtasks drained inside the call's timeout). The prelude runs first, then the recipe script with the
// call's input and knobs set as string globals the script takes and deletes at once. The script returns one
// string, so no object from the realm reaches this process and no host object enters the realm.
//
// Imports nothing in the repository.

import util from "node:util";
import vm from "node:vm";

type Call = { input: string; knobs: string; mode: "run" | "exports" };
type Job = { prelude: string; script: string; callMs: number; calls: Call[] };
type Result = { ok: true; value: string } | { ok: false; reason: string };

const isCall = (c: unknown): c is Call => {
  if (typeof c !== "object" || c === null) return false;
  const o = c as Record<string, unknown>;
  return typeof o.input === "string" && typeof o.knobs === "string" && (o.mode === "run" || o.mode === "exports");
};

const asJob = (j: unknown): Job | null => {
  if (typeof j !== "object" || j === null) return null;
  const o = j as Record<string, unknown>;
  if (typeof o.prelude !== "string" || typeof o.script !== "string" || typeof o.callMs !== "number" || !Array.isArray(o.calls)) return null;
  if (!o.calls.every(isCall)) return null;
  return { prelude: o.prelude, script: o.script, callMs: o.callMs, calls: o.calls };
};

// A recipe's own throws are caught inside the realm and come back as a string, so what reaches here is a
// compile error, or a timeout (an error object the realm owns). Never call into an object from the realm: read
// only own data properties of a native error that is not a proxy, which runs no getter and no trap.
const own = (e: object, key: string): string | null => {
  const d = Object.getOwnPropertyDescriptor(e, key);
  return d !== undefined && "value" in d && typeof d.value === "string" ? d.value : null;
};
const describe = (e: unknown): string => {
  if (e instanceof Error) return `${e.name}: ${e.message}`.slice(0, 500);
  if (typeof e === "object" && e !== null && util.types.isNativeError(e) && !util.types.isProxy(e)) {
    const code = own(e, "code"), message = own(e, "message");
    if (message !== null) return `${code ? `${code}: ` : ""}${message}`.slice(0, 500);
  }
  return "the realm threw a value that is not a host error";
};

const reply = (body: unknown): void => { process.stdout.write(JSON.stringify(body)); };

// A recipe that leaves a rejected promise must not end the batch. Its output check fails it on its own.
process.on("unhandledRejection", () => {});

function run(job: Job): void {
  let prelude: vm.Script, script: vm.Script;
  try {
    prelude = new vm.Script(job.prelude, { filename: "naive-prelude.js" });
    script = new vm.Script(job.script, { filename: "recipe.ts" });
  } catch (e) {
    reply({ results: job.calls.map((): Result => ({ ok: false, reason: `the recipe does not compile: ${describe(e)}` })) });
    return;
  }
  const results = job.calls.map((call): Result => {
    const realm = vm.createContext(vm.constants.DONT_CONTEXTIFY, { codeGeneration: { strings: false, wasm: false }, microtaskMode: "afterEvaluate" });
    try {
      prelude.runInContext(realm, { timeout: job.callMs });
      const g = realm as Record<string, unknown>;
      g.__naive_input = call.input;
      g.__naive_knobs = call.knobs;
      g.__naive_mode = call.mode;
      const value: unknown = script.runInContext(realm, { timeout: job.callMs });
      if (typeof value !== "string") return { ok: false, reason: "the realm returned something other than a string" };
      return { ok: true, value: value.length > 500 && value.startsWith("err:") ? value.slice(0, 504) : value };
    } catch (e) {
      return { ok: false, reason: describe(e) };
    }
  });
  reply({ results });
}

const chunks: Buffer[] = [];
process.stdin.on("data", (c: Buffer) => { chunks.push(c); });
process.stdin.on("end", () => {
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { reply({ error: "the job is not JSON" }); return; }
  const job = asJob(parsed);
  if (!job) { reply({ error: "the job is not { prelude, script, callMs, calls }" }); return; }
  run(job);
});
