import type { Block, Inline } from "./types";

const token =
  /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)|(\[([^\]\n]+)\]\(([^)\s]+)\))/y;

function mergeText(nodes: Inline[]): Inline[] {
  const merged: Inline[] = [];
  for (const node of nodes) {
    const prev = merged.at(-1);
    if (node.type === "text" && prev?.type === "text") prev.text += node.text;
    else if (node.type !== "text" || node.text) merged.push(node);
  }
  return merged;
}

export function parseInline(input: string): Inline[] {
  const nodes: Inline[] = [];
  let index = 0;
  while (index < input.length) {
    token.lastIndex = index;
    const match = token.exec(input);
    if (!match || match.index !== index) {
      const rest = input.slice(index);
      const next = rest.search(/[`*[]/);
      if (next <= 0) {
        nodes.push({ type: "text", text: next === 0 ? input[index] : rest });
        index += next === 0 ? 1 : rest.length;
        continue;
      }
      nodes.push({ type: "text", text: rest.slice(0, next) });
      index += next;
      continue;
    }
    if (match[1]) nodes.push({ type: "code", text: match[1].slice(1, -1) });
    else if (match[2]) nodes.push({ type: "strong", text: match[2].slice(2, -2) });
    else if (match[3]) nodes.push({ type: "em", text: match[3].slice(1, -1) });
    else nodes.push({ type: "link", text: match[5], href: match[6] });
    index = match.index + match[0].length;
  }
  return mergeText(nodes);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}

function isFence(line: string) {
  return line.startsWith("```");
}

function isHeading(line: string) {
  return /^#{1,4}\s+\S/.test(line);
}

function isList(line: string) {
  return line.startsWith("- ") || /^\d+\.\s+/.test(line);
}

function isQuote(line: string) {
  return line.startsWith("> ");
}

function isBlockStart(line: string) {
  return isFence(line) || isHeading(line) || isList(line) || isQuote(line);
}

function isComment(line: string) {
  return /^<!--.*-->$/.test(line.trim());
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  const ids = new Map<string, number>();
  let index = 0;

  const headingId = (text: string) => {
    const base = slugify(text.replace(/`/g, "")) || "section";
    const seen = ids.get(base) ?? 0;
    ids.set(base, seen + 1);
    return seen ? `${base}-${seen}` : base;
  };

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || isComment(line)) {
      index += 1;
      continue;
    }
    if (isFence(line)) {
      const lang = line.slice(3).trim();
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !isFence(lines[index])) {
        code.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push({ type: "code", lang, code: code.join("\n") });
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const written = heading[1].length;
      const level = (written === 1 ? 2 : written) as 2 | 3 | 4;
      blocks.push({
        type: "heading",
        level,
        inlines: parseInline(heading[2]),
        id: headingId(heading[2]),
      });
      index += 1;
      continue;
    }
    if (isQuote(line)) {
      const parts: string[] = [];
      while (index < lines.length && isQuote(lines[index])) {
        parts.push(lines[index].slice(2));
        index += 1;
      }
      blocks.push({ type: "quote", inlines: parseInline(parts.join(" ")) });
      continue;
    }
    if (line.startsWith("- ")) {
      const items: Inline[][] = [];
      while (index < lines.length && lines[index].startsWith("- ")) {
        items.push(parseInline(lines[index].slice(2)));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      const items: Inline[][] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index])) {
        items.push(parseInline(lines[index].replace(/^\d+\.\s+/, "")));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }
    const parts = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines[index]) && !isComment(lines[index])) {
      parts.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: "paragraph", inlines: parseInline(parts.join(" ")) });
  }
  return blocks;
}
