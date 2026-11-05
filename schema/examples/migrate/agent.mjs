#!/usr/bin/env node
// A stand-in for the migrate agent in tests (MENTURA_AGENT_CMD="node schema/examples/migrate/agent.mjs"):
// reads the prompt on stdin and answers the way claude -p --output-format json does, with one product
// record from the source's notes/plan.md and everything else left behind.
let prompt = "";
for await (const c of process.stdin) prompt += c;
const files = JSON.parse(prompt.slice(prompt.lastIndexOf("Files: ") + 7));
const answer = {
  items: "notes/plan.md" in files ? [{ route: "product/kettle", from: ["notes/plan.md"], record: { id: "kettle", name: "Kettle", description: files["notes/plan.md"].split("\n").filter((l) => l && !l.startsWith("#"))[0] }, reshaping: "the plan's first line became the product description", confidence: 0.8 }] : [],
  left_behind: Object.keys(files).filter((f) => f !== "notes/plan.md").map((f) => ({ from: f, why: "no record says what this file says" })),
};
console.log(JSON.stringify({ type: "result", is_error: false, result: JSON.stringify(answer) }));
