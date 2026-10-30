// Redacting secrets and personal data from text before anything else reads it (transcript diagnosis,
// framework bundles). Patterns, not a guarantee: anything that looks like a credential is replaced.

// A name that holds a secret: the word anywhere in it (clientSecret, PGPASSWORD, x_auth_token), or one that ends in _key or _pass.
const SECRET_NAME = String.raw`[A-Za-z0-9_-]*(?:api[_-]?key|access[_-]?key|private[_-]?key|secret|token|password|passwd|passphrase|pwd)(?:[_-]?(?:key|value|string|base))*|pass|[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)*[_-](?:key|pass)`;
const QUOTED = String.raw`\\"(?:[^"\\]|\\[^"])*\\"|"[^"]*"|'[^']*'`;

/** @type {[string, RegExp][]} */
const PATTERNS = [
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY(?: BLOCK)?-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY(?: BLOCK)?-----|$)/g],
  ["langsmith-key", /\blsv2_(?:pt|sk)_[A-Za-z0-9_]{16,}/g],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{16,}/g],
  ["openai-style-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/g],
  ["gitlab-token", /\bglpat-[A-Za-z0-9_-]{16,}/g],
  ["huggingface-token", /\bhf_[A-Za-z0-9]{20,}/g],
  ["google-key", /\bAIza[A-Za-z0-9_-]{30,}/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["slack-token", /\bxox[abpors]-[A-Za-z0-9-]{10,}/g],
  ["slack-webhook", /\bhooks\.slack\.com\/services\/[A-Za-z0-9/_-]+/g],
  ["stripe-key", /\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}/g],
  ["stripe-webhook", /\bwhsec_[A-Za-z0-9+/]{16,}/g],
  ["jwt", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g],
  ["url-credentials", /\b([a-z][a-z0-9+.-]*:\/\/)[^\s:/@]*:[^\s/@]+@/gi],
  ["authorization", new RegExp(String.raw`(["']?)\b(Authorization)\1\s*[:=]\s*(${QUOTED}|(?:(?:Bearer|Basic|Token|Digest)\s+)?[^\s"',]+)`, "gi")],
  ["bearer", /\b[Bb]earer\s+[A-Za-z0-9._~+/=-]{16,}/g],
  ["cookie", /\b((?:Set-)?Cookie["']?\s*:\s*)[^\n]+/gi],
  ["cli-flag", new RegExp(String.raw`(--[a-z-]*(?:password|passwd|passphrase|token|secret|api-?key)[a-z-]*[ =])(?:${QUOTED}|\S+)`, "gi")],
  ["cli-user", /((?:\s-u\s*|\s--user[ =]))[^\s:]*:\S+/g],
  // These clients take a password straight after -p, so the rest of the command stays readable. A bare mysql -p prompts and holds nothing.
  ["mysql-password", new RegExp(String.raw`(\b(?:mysql|mariadb)[a-z-]*\b[^\n|;&]*?\s-p)(?:${QUOTED}|[^\s"'\\]\S*)`, "g")],
  ["sshpass-password", new RegExp(String.raw`(\bsshpass\b[^\n|;&]*?\s-p\s*)(?:${QUOTED}|\S+)`, "g")],
  // An unquoted password can hold spaces, so it runs to the end of the line.
  ["password-line", /(\b[A-Za-z0-9_-]*(?:password|passwd|passphrase)(?:\s*[=:]\s*|\s+is\s+))(?!\\?["'])[^\n]+/gi],
  // NAME=value, name: value, "name": "value" in any case, where the name is a secret's.
  ["assignment", new RegExp(String.raw`(\\?["']?)\b(${SECRET_NAME})\1(\s*[=:]\s*)(?:${QUOTED}|[^\s,;}]+)`, "gi")],
  ["email", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ["hex", /\b[0-9a-fA-F]{32,}\b/g],
  ["base64", /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{40,}={0,2}(?![A-Za-z0-9+/_-])/g],
];

export function findSecrets(text) {
  const found = [];
  for (const [kind, re] of PATTERNS) for (const m of String(text).matchAll(re)) found.push({ kind, index: m.index });
  return found;
}

const SECRET = "[REDACTED:secret]";
const KEEP_PREFIX = new Set(["url-credentials", "cookie", "cli-flag", "cli-user", "mysql-password", "sshpass-password", "password-line"]);

export function redact(text) {
  let out = String(text);
  for (const [kind, re] of PATTERNS) out = out.replace(re, /** @type {*} */ (
    KEEP_PREFIX.has(kind) ? (_, prefix) => `${prefix}${SECRET}${kind === "url-credentials" ? "@" : ""}`
    : kind === "assignment" ? (_, q, name, sep) => `${q}${name}${q}${sep}${q ? `${q}${SECRET}${q}`.replace(/'/g, '"') : SECRET}`
    : kind === "authorization" ? (_, q, name, value) => `${q}${name}${q}: ${/^\\?["']/.test(value) ? `"${SECRET}"` : SECRET}`
    : `[REDACTED:${kind}]`));
  return out;
}
