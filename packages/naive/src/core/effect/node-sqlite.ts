// An effect/sql client over Node's built-in node:sqlite (EE-161, Effect runtime plan phase 11), so durable work needs no
// npm dependency and no native module. It does what the workflow engine's storage asks of SQL and no more: prepared
// statements, rows as objects or arrays, and one connection behind a semaphore, as SQLite allows one writer.
//
// node:sqlite is experimental in Node 22 and warns when it loads; the warning is dropped here, once, for that module
// only. It binds null, numbers, bigints, strings and bytes, so booleans become 0 or 1, undefined null, and dates ISO
// strings.

import { Effect, Layer, Semaphore, Stream } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import * as SqlClient from "effect/sql/SqlClient";
import type * as SqlConnection from "effect/sql/SqlConnection";
import { SqlError, UnknownError } from "effect/sql/SqlError";
import * as Statement from "effect/sql/Statement";
import type { DatabaseSync as Database, SQLInputValue } from "node:sqlite";

/** Loads node:sqlite without its experimental warning. */
async function loadSqlite(): Promise<typeof import("node:sqlite")> {
  const emit = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    if (/SQLite/i.test(String(warning instanceof Error ? warning.message : warning))) return;
    (emit as (..._a: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try { return await import("node:sqlite"); } finally { process.emitWarning = emit; }
}

const bind = (v: unknown): SQLInputValue =>
  v === undefined || v === null ? null
    : typeof v === "boolean" ? (v ? 1 : 0)
      : v instanceof Date ? v.toISOString()
        : typeof v === "number" || typeof v === "bigint" || typeof v === "string" || v instanceof Uint8Array ? v
          : JSON.stringify(v);

const failed = (cause: unknown, sql: string) => new SqlError({ reason: new UnknownError({ cause, message: `node:sqlite failed: ${sql.slice(0, 80)}` }) });

type Row = Record<string, unknown>;
type Transform = (<A extends object>(_rows: ReadonlyArray<A>) => ReadonlyArray<A>) | undefined;

/** The connection over one open database. */
function connectionOf(db: Database): SqlConnection.Connection {
  const rows = (sql: string, params: ReadonlyArray<unknown>, transform: Transform) => Effect.try({
    try: () => {
      const stmt = db.prepare(sql);
      const args = params.map(bind);
      if (stmt.columns().length === 0) { stmt.run(...args); return [] as Row[]; }
      const out = stmt.all(...args) as Row[];
      return transform ? transform(out) : out;
    },
    catch: (cause) => failed(cause, sql),
  });
  const values = (sql: string, params: ReadonlyArray<unknown>) => Effect.try({
    try: () => {
      const stmt = db.prepare(sql);
      const args = params.map(bind);
      if (stmt.columns().length === 0) { stmt.run(...args); return [] as unknown[][]; }
      return (stmt.all(...args) as Row[]).map((r) => Object.values(r));
    },
    catch: (cause) => failed(cause, sql),
  });
  return {
    execute: rows,
    executeUnprepared: rows,
    executeRaw: (sql, params) => Effect.try({ try: () => db.prepare(sql).run(...params.map(bind)), catch: (cause) => failed(cause, sql) }),
    executeValues: values,
    executeValuesUnprepared: values,
    executeStream: (sql, params, transform) => Stream.fromIterableEffect(rows(sql, params, transform)),
  };
}

/** An SqlClient over the SQLite file at filename, closed when its scope closes. */
export const makeNodeSqlite = (filename: string) => Effect.gen(function* () {
  const { DatabaseSync } = yield* Effect.promise(loadSqlite);
  const db = yield* Effect.acquireRelease(Effect.sync(() => new DatabaseSync(filename)), (d) => Effect.sync(() => d.close()));
  db.exec("PRAGMA journal_mode = WAL");
  const connection = connectionOf(db);
  const semaphore = yield* Semaphore.make(1);
  const acquirers = SqlClient.makeSqliteAcquirers({ connection: Effect.succeed(connection), semaphore, isTransaction: () => db.isTransaction });
  return yield* SqlClient.make({ ...acquirers, compiler: Statement.makeCompilerSqlite(), driver: "node:sqlite", spanAttributes: [["db.system.name", "sqlite"]] });
});

/** The SqlClient layer over a SQLite file. */
export const NodeSqlite = (filename: string) => Layer.effect(SqlClient.SqlClient)(makeNodeSqlite(filename)).pipe(Layer.provide(Reactivity.layer));
