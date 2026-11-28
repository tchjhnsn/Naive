// Art: pictures drawn by code from a name, a palette, a seed, and a time, after
// the techniques Alexandre Villares teaches in Designing with Python (py5):
// grids of elements with random variation, recursive grids, a star function,
// and posters made in variations. Every generator is pure: the same input
// gives the same SVG, byte for byte. Each one also moves: the drawing at its
// rest time is the still a page shows, and `mountArt` plays it from there
// while a person hovers or focuses the element it is mounted on.
//
// No imports, so an app copies this file unchanged (the Naive site and
// tcjcafe do). The design is docs/design/ART.md.

/** The colours a picture uses: ink for marks, ground behind them, and accents used sparingly. */
export type ArtPalette = { ink: string; ground: string; accents: readonly string[] };

export type ArtInput = {
  /** The words the type-based generators set, such as a project's name. Others ignore it. */
  text: string;
  palette: ArtPalette;
  /** Fixes every random choice. */
  seed: number;
  /** Seconds. Omitted, the generator's rest time: the still. */
  t?: number;
  width?: number;
  height?: number;
  /** The serif the type-based generators set. Omitted, Literata with fallbacks. */
  font?: string;
};

export type ArtGenerator = {
  name: string;
  /** One sentence on what it draws and how it moves. */
  description: string;
  /** Whether it sets `text`. */
  usesText: boolean;
  /** The time whose drawing is the still. */
  rest: number;
  draw: (input: ArtInput) => string;
};

export const DEFAULT_FONT = "Literata, Georgia, 'Times New Roman', serif";
const DEFAULT_W = 1200;
const DEFAULT_H = 960;

// ---- Helpers -----------------------------------------------------------------------------------

type Rand = () => number;

/** Mulberry32, the same source Virtu's ornament recipes use, so a seed fixes every draw. */
export function seeded(seed: number): Rand {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A string's FNV-1a hash, for seeding from a name. */
export function hashText(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const n = (x: number): string => {
  const v = Math.round(x * 10) / 10;
  return String(Object.is(v, -0) ? 0 : v);
};
function pick<T>(r: Rand, xs: readonly T[]): T {
  if (xs.length === 0) throw new Error("pick from an empty list");
  return xs[Math.floor(r() * xs.length)] as T;
}
const clamp = (x: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, x));
const ease = (x: number): number => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const escapeXml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const attr = (s: string): string => escapeXml(s).replace(/'/g, "&apos;");

type Frame = { r: Rand; w: number; h: number; t: number; ink: string; ground: string; accents: readonly string[]; all: readonly string[]; font: string; text: string; uid: string };

function frame(name: string, input: ArtInput, rest: number, salt: string): Frame {
  const p = input.palette;
  const accents = p.accents.length > 0 ? p.accents : [p.ink];
  return {
    r: seeded((input.seed ^ hashText(name + salt)) >>> 0),
    w: input.width ?? DEFAULT_W,
    h: input.height ?? DEFAULT_H,
    t: input.t ?? rest,
    ink: p.ink,
    ground: p.ground,
    accents,
    all: [...accents, p.ink],
    font: input.font ?? DEFAULT_FONT,
    text: input.text.trim() === "" ? "Virtu" : input.text.trim(),
    uid: `art-${name}-${input.seed >>> 0}`,
  };
}

const svg = (f: Frame, label: string, body: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${f.w} ${f.h}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${attr(label)}"><rect width="${f.w}" height="${f.h}" fill="${attr(f.ground)}"/>${body}</svg>`;

/** The course's star function: n points between an outer and an inner radius, turned by rot. */
export function starPoints(x: number, y: number, points: number, outer: number, inner: number, rot = 0): string {
  const out: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (Math.PI * i) / points - Math.PI / 2;
    const rad = i % 2 === 1 ? inner : outer;
    out.push(`${n(x + Math.cos(a) * rad)},${n(y + Math.sin(a) * rad)}`);
  }
  return out.join(" ");
}

type Cell = { x: number; y: number; s: number; depth: number };

/** The course's recursive grid: square cells across the width, each split into 2 by 2 or 3 by 3 by chance, down to maxDepth. */
function recursiveCells(r: Rand, w: number, h: number, across: number, maxDepth: number): Cell[] {
  const cells: Cell[] = [];
  const split = (x: number, y: number, s: number, depth: number): void => {
    if (depth < maxDepth && r() < (depth === 0 ? 0.8 : 0.45)) {
      const k = r() < 0.7 ? 2 : 3;
      const t = s / k;
      for (let j = 0; j < k; j++) for (let i = 0; i < k; i++) split(x + i * t, y + j * t, t, depth + 1);
    } else cells.push({ x, y, s, depth });
  };
  const s0 = w / across;
  for (let j = 0; j < Math.ceil(h / s0); j++) for (let i = 0; i < across; i++) split(i * s0, j * s0, s0, 0);
  return cells;
}

// ---- Element grid ------------------------------------------------------------------------------

/** Course units 3.2 and 3.3: one element repeated on a grid, its size set by distance from a point that drifts, its kind and turn by chance. */
const elementGrid: ArtGenerator = {
  name: "element-grid",
  description: "Circles, squares and stars on a grid, growing away from a point; on hover the point drifts and the field follows it.",
  usesText: false,
  rest: 0,
  draw(input) {
    const f = frame(elementGrid.name, input, elementGrid.rest, "");
    const cols = 10;
    const s = f.w / cols;
    const rows = Math.ceil(f.h / s);
    const ox = f.r() * cols;
    const oy = f.r() * rows;
    const px = ox + Math.sin(f.t * 0.5) * cols * 0.3;
    const py = oy + Math.cos(f.t * 0.4) * rows * 0.3;
    let b = "";
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = i * s + s / 2;
        const cy = j * s + s / 2;
        const d = Math.hypot(i - px, j - py) / Math.hypot(cols, rows);
        const size = s * clamp(0.1 + d * 0.9, 0.1, 0.46);
        const fill = attr(f.r() < 0.16 ? pick(f.r, f.accents) : f.ink);
        const kind = f.r();
        const turn = f.r() * 90;
        if (kind < 0.45) b += `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(size)}" fill="${fill}"/>`;
        else if (kind < 0.8) b += `<rect x="${n(cx - size)}" y="${n(cy - size)}" width="${n(size * 2)}" height="${n(size * 2)}" fill="${fill}" transform="rotate(${n(turn)} ${n(cx)} ${n(cy)})"/>`;
        else b += `<polygon points="${starPoints(cx, cy, 5 + Math.floor(f.r() * 4), size * 1.2, size * 0.5, (turn * Math.PI) / 180)}" fill="${fill}"/>`;
      }
    return svg(f, "A grid of circles, squares and stars", b);
  },
};

// ---- Recursive grid ----------------------------------------------------------------------------

/** Course unit 4.1: the recursive grid, each final cell a quarter circle, half circle, triangle or stripes; on hover each tile turns a quarter at its own moment. */
const recursiveGrid: ArtGenerator = {
  name: "recursive-grid",
  description: "A recursive grid of quarter circles, half circles, triangles and stripes; on hover each tile turns a quarter at its own moment.",
  usesText: false,
  rest: 0,
  draw(input) {
    const f = frame(recursiveGrid.name, input, recursiveGrid.rest, "");
    const colours = [...f.all, f.ground, f.ground];
    let defs = "";
    let b = "";
    recursiveCells(f.r, f.w, f.h, 5, 3).forEach((c, k) => {
      const bg = pick(f.r, colours);
      const fg = pick(f.r, colours.filter((x) => x !== bg));
      const kind = Math.floor(f.r() * 4);
      const start = Math.floor(f.r() * 4);
      const offset = f.r() * 6;
      const every = 3 + Math.floor(f.r() * 4);
      const local = Math.max(0, f.t - offset);
      const turns = Math.floor(local / every);
      const frac = local > 0 ? ease(clamp((local % every) / 0.9, 0, 1)) : 0;
      const angle = ((start + turns + frac) % 4) * 90;
      const { x, y, s } = c;
      const cx = x + s / 2;
      const cy = y + s / 2;
      const id = `${f.uid}-${k}`;
      defs += `<clipPath id="${id}"><rect x="${n(x)}" y="${n(y)}" width="${n(s)}" height="${n(s)}"/></clipPath>`;
      let shape: string;
      if (kind === 0) shape = `<path d="M${n(x)} ${n(y)}L${n(x + s)} ${n(y)}A${n(s)} ${n(s)} 0 0 1 ${n(x)} ${n(y + s)}Z"/>`;
      else if (kind === 1) shape = `<path d="M${n(x)} ${n(y + s)}A${n(s / 2)} ${n(s / 2)} 0 0 1 ${n(x + s)} ${n(y + s)}Z"/>`;
      else if (kind === 2) shape = `<path d="M${n(x)} ${n(y + s)}L${n(x + s)} ${n(y + s)}L${n(x)} ${n(y)}Z"/>`;
      else shape = Array.from({ length: 4 }, (_x, i) => `<rect x="${n(x + (i * s) / 4 + s / 16)}" y="${n(y)}" width="${n(s / 8)}" height="${n(s)}"/>`).join("");
      b += `<rect x="${n(x)}" y="${n(y)}" width="${n(s + 0.5)}" height="${n(s + 0.5)}" fill="${attr(bg)}"/><g clip-path="url(#${id})"><g fill="${attr(fg)}" transform="rotate(${n(angle)} ${n(cx)} ${n(cy)})">${shape}</g></g>`;
    });
    return svg(f, "A recursive grid of geometric tiles", `<defs>${defs}</defs>${b}`);
  },
};

// ---- Star grid ---------------------------------------------------------------------------------

/** Course unit 2.7: the star function on a grid, its points counted by column and its depth by row; on hover the stars turn, each at its own speed. */
const starGrid: ArtGenerator = {
  name: "star-grid",
  description: "Stars on a grid, more points across and deeper down; on hover each star turns at its own speed.",
  usesText: false,
  rest: 0,
  draw(input) {
    const f = frame(starGrid.name, input, starGrid.rest, "");
    const cols = 8;
    const s = f.w / cols;
    const rows = Math.ceil(f.h / s);
    let b = "";
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const points = 3 + i;
        const inner = 0.15 + 0.7 * (j / Math.max(1, rows - 1));
        const speed = (f.r() - 0.5) * 0.8;
        const fill = attr(f.r() < 0.15 ? pick(f.r, f.accents) : f.ink);
        b += `<polygon points="${starPoints(i * s + s / 2, j * s + s / 2, points, s * 0.42, s * 0.42 * inner, f.r() * Math.PI + f.t * speed)}" fill="${fill}"/>`;
      }
    return svg(f, "A grid of stars", b);
  },
};

// ---- Weave -------------------------------------------------------------------------------------

/**
 * A weave draft, as the loom charts in a textile school's notebook: a threading (which shaft each warp thread is on), a treadling
 * (which treadle each pick uses) and a tie-up (which shafts each treadle lifts) fix the whole cloth. On hover the cloth advances,
 * woven one row at a time at the bottom as the woven rows move up.
 */
const weave: ArtGenerator = {
  name: "weave",
  description: "A weave draft, the whole cloth fixed by three short lists; on hover the cloth advances one woven row at a time.",
  usesText: false,
  rest: 0,
  draw(input) {
    const f = frame(weave.name, input, weave.rest, "");
    const shafts = 4;
    const cols = 48;
    const s = f.w / cols;
    const rows = Math.ceil(f.h / s);
    const motif = (len: number): number[] => Array.from({ length: len }, (_x, i) => (i < len / 2 ? i % shafts : (len - 1 - i) % shafts));
    const threading = motif(8 + 2 * Math.floor(f.r() * 4));
    const treadling = motif(8 + 2 * Math.floor(f.r() * 4));
    const weft = pick(f.r, f.accents);
    const band = f.accents.length > 1 ? pick(f.r, f.accents.filter((c) => c !== weft)) : f.ground;
    const advanced = Math.floor(Math.max(0, f.t - weave.rest) / 0.12);
    let b = "";
    for (let j = 0; j < rows; j++) {
      const pick_ = j + advanced;
      const treadle = treadling[pick_ % treadling.length] ?? 0;
      const across = Math.floor(pick_ / 6) % 3 === 1 ? band : weft;
      for (let i = 0; i < cols; i++) {
        const shaft = threading[i % threading.length] ?? 0;
        const up = (shaft - treadle + shafts) % shafts < 2;
        b += `<rect x="${n(i * s)}" y="${n(j * s)}" width="${n(s + 0.6)}" height="${n(s + 0.6)}" fill="${attr(up ? f.ink : across)}"/>`;
      }
    }
    return svg(f, "A woven pattern", b);
  },
};

// ---- Type generators ---------------------------------------------------------------------------

/** The text as capitals with spaces removed, for the letter-by-letter generators. */
const letters = (text: string): string => text.toUpperCase().replace(/\s+/g, "") || "V";

/** The name repeated in reading order on a grid. A wave moves each letter along the font's weight axis; at rest it is a still diagonal. */
const letterGrid: ArtGenerator = {
  name: "letter-grid",
  description: "The name repeated on a grid, a few letters turned and coloured; on hover a wave moves each letter from thin to black.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(letterGrid.name, input, letterGrid.rest, "");
    const word = letters(f.text);
    const cols = 12;
    const rows = 10;
    const sx = f.w / cols;
    const sy = f.h / rows;
    const dir = f.r() * Math.PI * 2;
    let b = "";
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const u = (Math.sin((i * Math.cos(dir) + j * Math.sin(dir)) * 0.5 - f.t * 1.6) + 1) / 2;
        const weight = Math.round(200 + 700 * u);
        const size = sy * (0.62 + 0.3 * u);
        const turn = f.r() < 0.12 ? 90 * (1 + Math.floor(f.r() * 3)) : 0;
        const fill = attr(f.r() < 0.14 ? pick(f.r, f.accents) : f.ink);
        const cx = i * sx + sx / 2;
        const cy = j * sy + sy / 2;
        const letter = escapeXml(word[(j * cols + i) % word.length] ?? "");
        b += `<text x="${n(cx)}" y="${n(cy)}" font-size="${n(size)}" font-weight="${weight}" fill="${fill}" text-anchor="middle" dominant-baseline="central"${turn === 0 ? "" : ` transform="rotate(${turn} ${n(cx)} ${n(cy)})"`}>${letter}</text>`;
      }
    return svg(f, `${f.text}, set as a grid of letters`, `<g font-family="${attr(f.font)}">${b}</g>`);
  },
};

/** The name set large as a clip over a grid of dots: dots inside the letters are ink, the rest stay faint. On hover a ripple runs through the dots. */
const dotName: ArtGenerator = {
  name: "dot-name",
  description: "The name drawn in dots on a faint dot grid; on hover a ripple swells the dots outward from the centre.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(dotName.name, input, dotName.rest, "");
    const size = Math.min(f.h * 0.42, (f.w * 0.88) / Math.max(2, f.text.length * 0.55));
    const step = clamp(size / 16, 6, 12);
    const width = Math.min(f.w * 0.88, size * f.text.length * 0.58);
    const accent = pick(f.r, f.accents);
    let faint = "";
    let ink = "";
    for (let y = step / 2; y < f.h; y += step)
      for (let x = step / 2; x < f.w; x += step) {
        const d = Math.hypot(x - f.w / 2, y - f.h / 2) / step;
        const swell = f.t === dotName.rest ? 0 : Math.max(0, Math.sin(d * 0.35 - f.t * 4)) * 0.18;
        faint += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(step * (0.12 + swell * 0.4))}"/>`;
        ink += `<circle cx="${n(x)}" cy="${n(y)}" r="${n(step * (0.34 + swell))}"${f.r() < 0.07 ? ` fill="${attr(accent)}"` : ""}/>`;
      }
    const id = `${f.uid}-clip`;
    const clip = `<clipPath id="${id}"><text x="${n(f.w / 2)}" y="${n(f.h / 2)}" font-family="${attr(f.font)}" font-size="${n(size)}" font-weight="800" text-anchor="middle" dominant-baseline="central" textLength="${n(width)}" lengthAdjust="spacing">${escapeXml(f.text)}</text></clipPath>`;
    return svg(f, `${f.text}, drawn in dots`, `<defs>${clip}</defs><g fill="${attr(f.ink)}" opacity="0.18">${faint}</g><g fill="${attr(f.ink)}" clip-path="url(#${id})">${ink}</g>`);
  },
};

// A 5 by 7 pixel font for the capitals, one row of five per bar-separated part, so the dots that gather into the name have places to go without measuring a font.
export const PIXEL_FONT: Readonly<Record<string, string>> = {
  A: ".###.|#...#|#...#|#####|#...#|#...#|#...#", B: "####.|#...#|#...#|####.|#...#|#...#|####.", C: ".###.|#...#|#....|#....|#....|#...#|.###.",
  D: "####.|#...#|#...#|#...#|#...#|#...#|####.", E: "#####|#....|#....|####.|#....|#....|#####", F: "#####|#....|#....|####.|#....|#....|#....",
  G: ".###.|#...#|#....|#.###|#...#|#...#|.###.", H: "#...#|#...#|#...#|#####|#...#|#...#|#...#", I: ".###.|..#..|..#..|..#..|..#..|..#..|.###.",
  J: "..###|...#.|...#.|...#.|...#.|#..#.|.##..", K: "#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#", L: "#....|#....|#....|#....|#....|#....|#####",
  M: "#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#", N: "#...#|##..#|#.#.#|#..##|#...#|#...#|#...#", O: ".###.|#...#|#...#|#...#|#...#|#...#|.###.",
  P: "####.|#...#|#...#|####.|#....|#....|#....", Q: ".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#", R: "####.|#...#|#...#|####.|#.#..|#..#.|#...#",
  S: ".####|#....|#....|.###.|....#|....#|####.", T: "#####|..#..|..#..|..#..|..#..|..#..|..#..", U: "#...#|#...#|#...#|#...#|#...#|#...#|.###.",
  V: "#...#|#...#|#...#|#...#|#...#|.#.#.|..#..", W: "#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#.", X: "#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#",
  Y: "#...#|#...#|.#.#.|..#..|..#..|..#..|..#..", Z: "#####|....#|...#.|..#..|.#...|#....|#####",
};

/** Where the name's pixels are in the 5 by 7 font: one point per lit pixel, in font units, with the word's width in columns. */
function pixelWord(word: string): { points: Array<[number, number]>; cols: number } {
  const points: Array<[number, number]> = [];
  let col = 0;
  for (const ch of word.toUpperCase()) {
    const rows = PIXEL_FONT[ch];
    if (rows !== undefined) rows.split("|").forEach((row, y) => [...row].forEach((c, x) => (c === "#" ? points.push([col + x, y]) : undefined)));
    col += 6;
  }
  return { points, cols: Math.max(1, col - 1) };
}

/** Dots that gather into the name, hold, scatter and gather again. At rest the name is formed. */
const dotsForm: ArtGenerator = {
  name: "dots-form",
  description: "Dots holding the shape of the name; on hover they scatter across the picture and gather back into it.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(dotsForm.name, input, dotsForm.rest, "");
    const { points, cols } = pixelWord(f.text);
    const unit = Math.min((f.w * 0.86) / cols, (f.h * 0.5) / 7);
    const x0 = (f.w - cols * unit) / 2;
    const y0 = (f.h - 7 * unit) / 2;
    const accent = pick(f.r, f.accents);
    const period = 7;
    const k = (((f.t - dotsForm.rest) % period) + period) % period / period; // 0 formed, then scatter, rest apart, gather
    let b = "";
    for (const [px, py] of points)
      for (let q = 0; q < 4; q++) {
        const tx = x0 + (px + 0.25 + (q % 2) * 0.5) * unit;
        const ty = y0 + (py + 0.25 + Math.floor(q / 2) * 0.5) * unit;
        const sx = f.r() * f.w;
        const sy = f.r() * f.h;
        const delay = f.r() * 0.35;
        const fill = f.r() < 0.1 ? ` fill="${attr(accent)}"` : "";
        let u: number;
        if (k < 0.3) u = 1 - ease(clamp((k / 0.3 - delay * 0.5) / 0.8, 0, 1));
        else if (k < 0.45) u = 0;
        else u = ease(clamp(((k - 0.45) / 0.55 - delay) / 0.65, 0, 1));
        b += `<circle cx="${n(sx + (tx - sx) * u)}" cy="${n(sy + (ty - sy) * u)}" r="${n(unit * (0.14 + 0.08 * u))}"${fill}/>`;
      }
    return svg(f, `${f.text}, made of dots`, `<g fill="${attr(f.ink)}">${b}</g>`);
  },
};

/** The recursive grid with one letter of the name filling each final cell. On hover a wave of weight passes through the cells by depth. */
const recursiveType: ArtGenerator = {
  name: "recursive-type",
  description: "The recursive grid with a letter of the name filling each cell; on hover the letters pulse from thin to black, small cells first.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(recursiveType.name, input, recursiveType.rest, "");
    const word = letters(f.text);
    const colours = [...f.all, f.ground, f.ground];
    let defs = "";
    let b = "";
    recursiveCells(f.r, f.w, f.h, 5, 3).forEach((c, k) => {
      const bg = pick(f.r, colours);
      const fg = pick(f.r, colours.filter((x) => x !== bg));
      const base = pick(f.r, [300, 500, 800, 900]);
      const weight = f.t === recursiveType.rest ? base : Math.round(200 + 700 * ((Math.sin(f.t * 2 - c.depth * 1.2 - k * 0.05) + 1) / 2));
      const id = `${f.uid}-${k}`;
      defs += `<clipPath id="${id}"><rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.s)}" height="${n(c.s)}"/></clipPath>`;
      b += `<rect x="${n(c.x)}" y="${n(c.y)}" width="${n(c.s + 0.5)}" height="${n(c.s + 0.5)}" fill="${attr(bg)}"/><text clip-path="url(#${id})" x="${n(c.x + c.s / 2)}" y="${n(c.y + c.s * 0.9)}" font-size="${n(c.s * 1.12)}" font-weight="${weight}" fill="${attr(fg)}" text-anchor="middle">${escapeXml(word[k % word.length] ?? "")}</text>`;
    });
    return svg(f, `${f.text}, set in a recursive grid`, `<defs>${defs}</defs><g font-family="${attr(f.font)}">${b}</g>`);
  },
};

/** The course's final project as type: the name in rows that shrink by a fixed ratio, cut at the edge, one row in an accent. On hover the rows slide, each the other way from the row above. */
const typePoster: ArtGenerator = {
  name: "type-poster",
  description: "The name in rows that shrink by a fixed ratio, one row in an accent; on hover the rows slide, alternating directions.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(typePoster.name, input, typePoster.rest, "");
    const ratio = 0.62 + f.r() * 0.14;
    const hot = 1 + Math.floor(f.r() * 3);
    const accent = pick(f.r, f.accents);
    const word = `${f.text}. `;
    let size = f.h * 0.375;
    let y = f.h * 0.04;
    let row = 0;
    let b = "";
    while (y < f.h && size > 6) {
      const light = row % 2 === 1;
      const width = size * word.length * (light ? 0.47 : 0.58);
      const shift = ((f.r() * width * 0.4 + (row % 2 === 0 ? 1 : -1) * (f.t - typePoster.rest) * size * 0.6) % width + width) % width;
      const fill = attr(row === hot ? accent : f.ink);
      for (let x = -shift; x < f.w; x += width) b += `<text x="${n(x)}" y="${n(y + size * 0.8)}" font-size="${n(size)}" font-weight="${light ? 300 : 800}" fill="${fill}" textLength="${n(width)}" lengthAdjust="spacing">${escapeXml(word)}</text>`;
      y += size * 0.92;
      size *= ratio;
      row++;
    }
    return svg(f, `${f.text}, set as a poster`, `<g font-family="${attr(f.font)}">${b}</g>`);
  },
};

/** A grid of rings growing away from a point, a few stars among them, with the name below. On hover the point drifts. */
const fieldPoster: ArtGenerator = {
  name: "field-poster",
  description: "Rings on a grid growing away from a point, a few stars, and the name set below; on hover the point drifts across the grid.",
  usesText: true,
  rest: 0,
  draw(input) {
    const f = frame(fieldPoster.name, input, fieldPoster.rest, "");
    const cols = 12;
    const s = f.w / cols;
    const rows = Math.ceil(f.h / s);
    const px = cols * 0.7 + Math.sin(f.t * 0.6) * cols * 0.25;
    const py = rows * 0.35 + Math.cos(f.t * 0.5) * rows * 0.2;
    const accent = pick(f.r, f.accents);
    let b = "";
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const cx = i * s + s / 2;
        const cy = j * s + s / 2;
        const rad = Math.min(s * 0.48, s * (0.08 + (Math.hypot(i - px, j - py) / cols) * 0.9));
        b += f.r() < 0.08
          ? `<polygon points="${starPoints(cx, cy, 8, rad, rad * 0.45)}" fill="${attr(accent)}"/>`
          : `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rad)}" fill="none" stroke="${attr(f.ink)}" stroke-width="3"/>`;
      }
    const band = s * 2.6;
    b += `<rect x="0" y="${n(f.h - band)}" width="${f.w}" height="${n(band)}" fill="${attr(f.ground)}"/>`;
    b += `<text x="${n(s * 0.5)}" y="${n(f.h - s * 0.8)}" font-family="${attr(f.font)}" font-size="${n(s * 1.6)}" fill="${attr(f.ink)}">${escapeXml(f.text)}.</text>`;
    return svg(f, `${f.text}, on a field of rings`, b);
  },
};

// ---- Registry ----------------------------------------------------------------------------------

/** Every generator, in the order a catalog shows them. */
export const ART_GENERATORS: readonly ArtGenerator[] = [elementGrid, recursiveGrid, starGrid, weave, letterGrid, dotName, dotsForm, recursiveType, typePoster, fieldPoster];

export const artGenerator = (name: string): ArtGenerator | undefined => ART_GENERATORS.find((g) => g.name === name);

/** One drawing by name, at input.t or the generator's rest time. Throws on an unknown name. */
export function drawArt(name: string, input: ArtInput): string {
  const g = artGenerator(name);
  if (g === undefined) throw new Error(`no art generator named ${name} (there are ${ART_GENERATORS.map((x) => x.name).join(", ")})`);
  return g.draw(input);
}

/** A generator for an id, the same one every time, so a project keeps its picture. */
export const artFor = (id: string): ArtGenerator => ART_GENERATORS[hashText(id) % ART_GENERATORS.length] as ArtGenerator;

// ---- Player ------------------------------------------------------------------------------------

/** When a mounted picture moves: while a person hovers or focuses its trigger, all the time, or never. */
export type ArtPlay = "hover" | "always" | "never";

export type MountOptions = {
  play?: ArtPlay;
  /** The element whose hover and focus play it, such as the whole card. Omitted, the element it is mounted in. */
  trigger?: HTMLElement;
  /** Frames a second at most. Default 30. */
  fps?: number;
};

/**
 * Draws the still into el, then plays the picture from its rest time while the trigger is hovered or holds focus, and returns to
 * the still when it is left. Under prefers-reduced-motion, or with play "never", it only draws the still. Returns a function that
 * stops it and removes its listeners.
 */
export function mountArt(el: HTMLElement, name: string, input: ArtInput, options: MountOptions = {}): () => void {
  const g = artGenerator(name);
  if (g === undefined) throw new Error(`no art generator named ${name}`);
  const still = g.draw({ ...input, t: g.rest });
  el.innerHTML = still;
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const play = reduced ? "never" : options.play ?? "hover";
  if (play === "never") return () => {};
  const trigger = options.trigger ?? el;
  const gap = 1000 / (options.fps ?? 30);
  let raf = 0;
  let started = 0;
  let last = 0;
  let shown = still;
  const tick = (now: number): void => {
    raf = requestAnimationFrame(tick);
    if (now - last < gap) return;
    last = now;
    const next = g.draw({ ...input, t: g.rest + (now - started) / 1000 });
    if (next !== shown) {
      el.innerHTML = next;
      shown = next;
    }
  };
  const start = (): void => {
    if (raf !== 0) return;
    started = performance.now();
    last = 0;
    raf = requestAnimationFrame(tick);
  };
  const stop = (): void => {
    if (raf === 0) return;
    cancelAnimationFrame(raf);
    raf = 0;
    if (shown !== still) {
      el.innerHTML = still;
      shown = still;
    }
  };
  if (play === "always") {
    start();
    return stop;
  }
  const leave = (): void => {
    if (!trigger.matches(":hover") && !trigger.contains(document.activeElement)) stop();
  };
  trigger.addEventListener("pointerenter", start);
  trigger.addEventListener("focusin", start);
  trigger.addEventListener("pointerleave", leave);
  const blur = (): void => void setTimeout(leave, 0);
  trigger.addEventListener("focusout", blur);
  return () => {
    stop();
    trigger.removeEventListener("pointerenter", start);
    trigger.removeEventListener("focusin", start);
    trigger.removeEventListener("pointerleave", leave);
    trigger.removeEventListener("focusout", blur);
  };
}
