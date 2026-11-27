// A page's frontmatter, read in one place because both the publish lint and field visibility read it, and the lint
// also reads the copy a record holds, which reads visibility (EE-214): the parser sits below all three so none of
// them imports another.

/** A page's frontmatter: every value a string or a list, and publish a boolean. */
export type Meta = { [key: string]: string | string[] | boolean };

/** Frontmatter with list support: { meta, body }. sources may be `[a, b]` or a block of `- a` lines. */
export function frontmatter(text: string): { meta: Meta, body: string } {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta: Meta = {}; let key: string | null = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/), item = line.match(/^\s+-\s+(.*)$/);
    if (kv) {
      key = kv[1]; const v = kv[2].trim();
      meta[key] = v.startsWith("[") ? v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : v === "" ? [] : v.replace(/^["']|["']$/g, "");
    } else if (item && key) { const list = meta[key]; if (Array.isArray(list)) list.push(item[1].trim().replace(/^["']|["']$/g, "")); }
  }
  if (typeof meta.publish === "string") meta.publish = meta.publish === "true";
  return { meta, body: m[2] };
}
