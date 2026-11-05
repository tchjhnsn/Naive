# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# A value is a Claude Code model and effort. The adapter at docs/harness/claude-code.md maps `opus xhigh` to model opus and effort xhigh, and `opus high` to model opus and effort high.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit Agent `model`). Alias entries in a panel list still count toward its fan-out.
# This file is the committed default. Torian can change any line. Claude Code also loads ~/.claude/rules/pstack-models.md when that file exists. That path is not in git.
# budget: large (xhigh)
feature, refactoring: opus high
bug-fix: opus high
perf-issue: opus high
hillclimb: opus high
judgment and prose: opus xhigh
hardest tasks: opus xhigh
how explorer: opus high
how explainer: opus xhigh
why investigators: opus high
why synthesizer: opus xhigh
reflect tooling: opus high
reflect judgment, divergent, synthesizer: opus xhigh
arena runners: opus xhigh
arena cross-judge pool: opus xhigh
swarm workers: opus high
architect runners: opus xhigh
interrogate reviewers: opus xhigh
