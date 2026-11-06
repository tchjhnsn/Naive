#!/usr/bin/env node
// A stand-in judge for the frames test (the Jev protocol): reads one request on stdin and answers every
// noul question from the facts it was given, without a model. A premise is unknown (0.5) when a fact it
// could rest on says "not on record", else no (0.1); the trade reads as a sequence.
let input = "";
for await (const c of process.stdin) input += c;
const req = JSON.parse(input);
const unknown = Object.values(req.state.venture ?? {}).some((v) => v === "not on record");
const answers = Object.fromEntries(Object.keys(req.questions).map((k) => [k, { noul: k.startsWith("dichotomy:") ? (k === "dichotomy:sequence" ? 0.9 : 0.1) : k === "premise:needs-outside-money" && unknown ? 0.5 : 0.1 }]));
console.log(JSON.stringify({ model: "stand-in", answers }));
