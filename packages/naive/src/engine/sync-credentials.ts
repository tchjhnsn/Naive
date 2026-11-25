// Where the CLI keeps a device sign-in token (EE-178, docs/design/OFFLINE_SYNC_2026-11-25.md). The token is a
// secret scoped to one business, so it never goes inside the business folder, never into git and never into a
// provenance line or a log: the operating system's keychain holds it when the machine has a keychain CLI, and a
// file with mode 0600 outside the business folder holds it when it does not.
//
// The recipes are pure (keychainCli): one record per platform saying which command reads and which stores a
// secret, and whether the secret travels in the argument list or on standard input. macOS `security` takes it in
// the argument list, which is its only way; Linux `secret-tool` reads it from standard input, so it never appears
// in the process list. Everything that runs a command is in the thin shell below, so the recipes are tested
// without a keychain.
//
// NAIVE_CREDENTIALS picks the store: keychain, file, or auto (the default: the keychain when its CLI answers,
// else the file). NAIVE_CONFIG_HOME, XDG_CONFIG_HOME and the home directory say where the file sits, in that
// order, so a test writes inside its own temporary folder and never touches the person's keychain or config.
// Naive names no vendor: the service name is Naive's own, and the account is the host and business the token is for.

import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** The keychain entry Naive asks for: one token per host and business. */
export const SERVICE = "naive-sync";
/** Where a token ended up, for a message to a person. Never the token itself. */
export type TokenStore = { kind: "keychain" | "file"; where: string };
/** How to read and store a secret with one platform's keychain command. */
export type KeychainCli = {
  cli: string;
  read: (account: string) => string[];
  /** The arguments that store a token, and the standard input to send; input undefined means it is in the arguments. */
  write: (account: string, token: string) => { args: string[]; input?: string };
};

/** The account a token is filed under: one host and one business. */
export const accountFor = (host: string, business: string): string => `${business}@${host}`;

/**
 * The keychain command for a platform, or null when Naive knows none. macOS has `security`, Linux `secret-tool`
 * (libsecret). Nothing here runs: `keychainWorks` tries the command, so an uninstalled CLI falls back to the file.
 */
export function keychainCli(platform: string = process.platform): KeychainCli | null {
  if (platform === "darwin") return {
    cli: "security",
    read: (account) => ["find-generic-password", "-s", SERVICE, "-a", account, "-w"],
    // `security` has no way to read the password from standard input, so it travels in the argument list.
    write: (account, token) => ({ args: ["add-generic-password", "-U", "-s", SERVICE, "-a", account, "-w", token] }),
  };
  if (platform === "linux") return {
    cli: "secret-tool",
    read: (account) => ["lookup", "service", SERVICE, "account", account],
    // secret-tool reads the secret from standard input, so it never reaches the process list.
    write: (account, token) => ({ args: ["store", "--label", `Naive sync token (${account})`, "service", SERVICE, "account", account], input: token }),
  };
  return null;
}

/** Which store to use: NAIVE_CREDENTIALS=keychain|file, else auto. */
export const chosenStore = (): "keychain" | "file" | "auto" => {
  const v = (process.env.NAIVE_CREDENTIALS ?? "auto").trim();
  return v === "keychain" || v === "file" ? v : "auto";
};

/** The folder the credentials file sits in: NAIVE_CONFIG_HOME, XDG_CONFIG_HOME, else ~/.config, each plus naive/. */
export function configHome(): string {
  const named = process.env.NAIVE_CONFIG_HOME?.trim();
  if (named) return named;
  const xdg = process.env.XDG_CONFIG_HOME?.trim();
  return join(xdg || join(homedir(), ".config"), "naive");
}

/** The credentials file: ~/.config/naive/credentials.json, outside every business folder. */
export const credentialsFile = (): string => join(configHome(), "credentials.json");

/** Is the platform's keychain CLI installed and answering? A missing CLI is not an error, it is a fallback. */
export function keychainWorks(cli: KeychainCli | null = keychainCli()): boolean {
  if (!cli) return false;
  const probe = spawnSync(cli.cli, cli.read("naive-sync-probe-that-does-not-exist"), { encoding: "utf8" });
  // An installed CLI answers, with a non-zero status for an entry it does not hold. Only a missing CLI errors.
  return !probe.error;
}

type FileTokens = { [host: string]: { [business: string]: string } };

function readFileTokens(): FileTokens {
  const f = credentialsFile();
  if (!existsSync(f)) return {};
  try {
    const parsed: unknown = JSON.parse(readFileSync(f, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as FileTokens) : {};
  } catch { return {}; }
}

function writeFileToken(host: string, business: string, token: string): TokenStore {
  const f = credentialsFile();
  mkdirSync(configHome(), { recursive: true, mode: 0o700 });
  const all = readFileTokens();
  all[host] = { ...all[host], [business]: token };
  writeFileSync(f, JSON.stringify(all, null, 2) + "\n", { mode: 0o600 });
  // mode only applies when writeFileSync creates the file, so an existing file is narrowed here.
  chmodSync(f, 0o600);
  return { kind: "file", where: f };
}

/**
 * Keeps a token for one host and business, in the keychain when there is one, else in the file. Answers where it
 * went, never the token. Throws when the keychain was asked for by name and its command failed.
 */
export function saveToken(host: string, business: string, token: string): TokenStore {
  const want = chosenStore();
  const cli = want === "file" ? null : keychainCli();
  if (cli && (want === "keychain" || keychainWorks(cli))) {
    const { args, input } = cli.write(accountFor(host, business), token);
    const ran = spawnSync(cli.cli, args, { encoding: "utf8", input });
    if (!ran.error && ran.status === 0) return { kind: "keychain", where: `${cli.cli} ${SERVICE}` };
    if (want === "keychain") throw new Error(`${cli.cli} could not store the token: ${(ran.stderr || ran.error?.message || `status ${ran.status}`).trim()}`);
  }
  return writeFileToken(host, business, token);
}

/** The token for one host and business, from the keychain or the file, or null when neither holds one. */
export function readToken(host: string, business: string): string | null {
  const want = chosenStore();
  const cli = want === "file" ? null : keychainCli();
  if (cli) {
    const ran = spawnSync(cli.cli, cli.read(accountFor(host, business)), { encoding: "utf8" });
    if (!ran.error && ran.status === 0) {
      const token = ran.stdout.replace(/\n$/, "");
      if (token) return token;
    }
  }
  return readFileTokens()[host]?.[business] ?? null;
}
