"use client";

import { useEffect, useRef } from "react";
import { ART_GENERATORS, hashText, mountArt, type ArtPalette } from "../lib/art.ts";

// Black and white, like the site: ink is the card's text colour and the ground is the card itself, so the
// picture follows light and dark mode. The two greys read on both.
const PALETTE: ArtPalette = { ink: "currentColor", ground: "transparent", accents: ["#8f8f8f", "#c8c8c8"] };

/**
 * The picture at the top of a feature card, drawn by code from Virtu's art generators (lib/art.ts, copied from Virtu
 * unchanged). Each card in a row gets the next generator, seeded by its title, so a card keeps its picture. It is a still
 * while the page scrolls and moves while the card is hovered or focused.
 */
export function FeatureArt({ index, title }: { index: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    const g = ART_GENERATORS[index % ART_GENERATORS.length];
    if (g === undefined) return;
    return mountArt(el, g.name, { text: title, palette: PALETTE, seed: hashText(title), font: "inherit" }, { trigger: el.parentElement ?? el });
  }, [index, title]);
  return <div ref={ref} className="naive-feature-art" aria-hidden="true" />;
}
