# PublicWords

TLC reached 58 states and 165 steps. The chart draws 13 states and 16 arrows.
The chart does not draw 45 steps that stay in one chart state.

## OnlyAPersonApproves breaks
The shortest path has 4 steps:
0. Field Internal, Variant No variant, Output Nothing published
1. an agent drafts the public variant: Field Internal, Variant Variant drafted, Output Nothing published
2. an agent marks the variant approved: Field Internal, Variant Variant marked approved by an agent, Output Nothing published
3. you set the field to publish through a variant: Field Publish through a variant, Variant Variant marked approved by an agent, Output Nothing published
4. the site build runs: Field Publish through a variant, Variant Variant marked approved by an agent, Output Variant published

## Rules that hold
TypeOK, NoInternalWords, NoCopiedVariant, GateAcceptsHonestVariant, NoDeadlock
