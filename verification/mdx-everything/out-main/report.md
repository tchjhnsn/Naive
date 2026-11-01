# PublicWords

TLC reached 102 states and 317 steps. The chart draws 11 states and 9 arrows.
The chart does not draw 100 steps that stay in one chart state.

## NoInternalWords breaks
The shortest path has 1 step:
0. Field Internal, Variant No variant, Output Nothing published
1. the site build runs: Field Internal, Variant No variant, Output Record's own words published

## GateAcceptsHonestVariant breaks
The shortest path has 2 steps:
0. Field Internal, Variant No variant, Output Nothing published
1. an agent drafts the public variant: Field Internal, Variant Variant drafted, Output Nothing published
2. the site build runs: Field Internal, Variant Variant drafted, Output Record's own words published

## Rules that hold
TypeOK, NoCopiedVariant, OnlyAPersonApproves, NoDeadlock
