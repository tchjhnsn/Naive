---
type: template
tags: [everything-ecosystem, operations, marketing, brand, template]
ai-model: claude-opus-5.5
created: 2026-10-29T06:04:07Z
source: hybrid
---

# Template: brand

Fills `<venture>/marketing/brand.json` (`packages/naive/src/records/marketing-brand.schema.json`). The brand is the venture's global stylesheet: every agent's layout carries its voice and fonts, and `marketing/brand/tokens` renders it as design tokens and CSS for any interface. Check it with `mentura marketing/brand check`.

```json
{
  "version": "0.1.0",
  "venture": "<venture id>",
  "name": "<the name as the brand writes it>",
  "colors": { "accent": "#1d4e89", "ink": "#111111", "paper": "#ffffff" },
  "typefaces": [
    { "id": "inter", "family": "Inter", "source": "self-hosted", "license": "OFL-1.1", "files": ["public/fonts/inter.woff2"], "fallback": ["system-ui", "sans-serif"] }
  ],
  "fonts": { "body": "inter", "heading": "inter" },
  "voice": {
    "tone": ["plain", "warm"],
    "rules": [{ "id": "no-jargon", "avoid": ["synergy", "leverage"], "use": "work with", "why": "our customers do not talk like this" }]
  },
  "marks": [
    { "kind": "logo", "asset": "public/logo.svg" },
    { "kind": "icon", "asset": "public/icon.svg" },
    { "kind": "apple-icon", "asset": "public/apple-icon.png" },
    { "kind": "favicon", "asset": "public/favicon.ico" }
  ],
  "design_systems": [{ "id": "radix", "name": "Radix Colors", "url": "https://www.radix-ui.com/colors", "version": "3.0.0", "license": "MIT", "uses": ["the blue scale"] }],
  "scopes": [{ "for": "investors", "colors": { "accent": "#000000" }, "voice": { "tone": ["direct"] } }]
}
```

## What each part means

- **Colors** are hex values by token name.
- **Typefaces** are defined once, each with its license. A self-hosted face names its files in `public/`, each registered in `public/assets.json` under the same license. A remote face fails the check: every reader's browser would call another host.
- **Fonts** assign a typeface to a role everywhere. A scope can assign a different one under a route prefix.
- **Voice** is the stylesheet for words: the tone, and phrases the venture never uses, with what to use instead.
- **Marks** are the logo and icons. An apple-icon is a 180x180 PNG, an icon is square, a favicon is an ICO.
- **Design systems** are linked, never copied in.
- **Scopes** override the brand for a route prefix. The nearer scope wins.
