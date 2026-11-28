// Maps site/brand/tokens.json onto the site's CSS variables.
// color.accent -> --naive-accent
// color.accent-on -> --naive-accent-on
// color.muted -> --naive-muted
// color.move, move-on, ink, paper -> --naive-move, --naive-move-on, --naive-ink, --naive-paper
// font.sans -> --font-sans
// font.mono -> --font-mono
// font.display -> --font-display-stack (behind the loaded --font-display)
// radius.md -> --radius-lg
// radius.sm -> --naive-radius-sm

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const tokens = JSON.parse(readFileSync(new URL("../brand/tokens.json", import.meta.url), "utf8"));
const hex = (token) => {
  const value = token.$value;
  if (value.hex) return value.hex;
  const [r, g, b] = value.components;
  const n = (c) => Math.round(c * 255).toString(16).padStart(2, "0");
  return `#${n(r)}${n(g)}${n(b)}`;
};
const family = (token) => token.$value.join(", ");
const radius = tokens.radius.md.$value;
const sharp = tokens.radius.sm.$value;
const css = `:root {
  --naive-accent: ${hex(tokens.color.accent)};
  --naive-accent-on: ${hex(tokens.color["accent-on"])};
  --naive-muted: ${hex(tokens.color.muted)};
  --naive-move: ${hex(tokens.color.move)};
  --naive-move-on: ${hex(tokens.color["move-on"])};
  --naive-ink: ${hex(tokens.color.ink)};
  --naive-paper: ${hex(tokens.color.paper)};
  --font-sans: ${family(tokens.font.sans)};
  --font-mono: ${family(tokens.font.mono)};
  --font-display-stack: var(--font-display), ${family(tokens.font.display)};
  --radius-lg: ${radius.value}${radius.unit};
  --naive-radius-sm: ${sharp.value}${sharp.unit};
}
.dark {
  --naive-accent: #ededed;
  --naive-accent-on: #0a0a0a;
  --naive-muted: #d4d4d8;
  --naive-move: #ededed;
  --naive-move-on: #0a0a0a;
}
`;
const out = new URL("../generated/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "tokens.css"), css);
console.log("tokens mapped");
