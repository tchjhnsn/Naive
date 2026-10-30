// Redacting secrets and personal data from text before anything else reads it (transcript diagnosis,
// framework bundles). Patterns, not a guarantee: anything that looks like a credential is replaced.

const PATTERNS = [
  ["langsmith-key", /\blsv2_(?:pt|sk)_[A-Za-z0-9_]{16,}/g],
  ["anthropic-key", /\bsk-ant-[A-Za-z0-9_-]{16,}/g],
  ["openai-style-key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}/g],
  ["github-token", /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}/g],
  ["aws-access-key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["slack-token", /\bxox[abpors]-[A-Za-z0-9-]{10,}/g],
  ["bearer", /\b[Bb]earer\s+[A-Za-z0-9._~+/=-]{16,}/g],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g],
  ["assignment", /\b([A-Z][A-Z0-9_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASS))\s*[=:]\s*\S+/g],
  ["email", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ["hex", /\b[0-9a-fA-F]{32,}\b/g],
  ["base64", /(?<![A-Za-z0-9+/_-])[A-Za-z0-9+/_-]{40,}={0,2}(?![A-Za-z0-9+/_-])/g],
];

export function findSecrets(text) {
  const found = [];
  for (const [kind, re] of PATTERNS) for (const m of String(text).matchAll(re)) found.push({ kind, index: m.index });
  return found;
}

export function redact(text) {
  let out = String(text);
  for (const [kind, re] of PATTERNS) out = out.replace(re, kind === "assignment" ? (_, name) => `${name}=[REDACTED:secret]` : `[REDACTED:${kind}]`);
  return out;
}
