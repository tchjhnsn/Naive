#!/usr/bin/env node
// A stand-in for Jev in tests (MENTURA_TYPE_CMD="node schema/examples/venture-type/jev.mjs"): reads the
// typed request on stdin and answers each type:<id> question yes when the description uses one of that
// type's examples, so the classifier's ranking and its uncertain path can be tested offline.
import { readFileSync } from "node:fs";
let input = "";
for await (const c of process.stdin) input += c;
const req = JSON.parse(input);
const words = req.state.venture.description.toLowerCase();
const types = JSON.parse(readFileSync(new URL("../../venture-types.json", import.meta.url), "utf8")).types;
const answers = Object.fromEntries(types.map((t) => [`type:${t.id}`, { noul: t.examples.some((e) => words.includes(e.toLowerCase())) ? 0.92 : 0.04 }]));
console.log(JSON.stringify({ model: "stand-in", answers }));
