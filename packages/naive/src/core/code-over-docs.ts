// The rule every instruction file Naive writes carries (EE-225): when the documentation and the code disagree, the
// code wins and the agent names each mismatch. Xu and Wu (2026, arXiv 2610.30571) found coding agents follow a stale
// AGENTS.md or CLAUDE.md over the existing code in nine choices of ten, even when they notice the conflict, because
// the file reaches the model as an instruction and the code only as tool output. Stating the rule as an instruction
// reversed it. The sentence is the paper's, word for word, so the measured effect carries over.

export const CODE_OVER_DOCS = "When a repository's documentation and its existing code disagree, follow the conventions used in the existing code, and in your final reply point out each inconsistency you found between the documentation and the code.";
