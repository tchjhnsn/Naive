# The behaviors venture programs must keep (EE-161, Effect runtime plan phase 10): a venture's own TypeScript runs on
# the venture runtime, and a handoff's done-criterion can be one. Run:
# node packages/naive/src/engine/bdd.ts packages/naive/src/engine/features/venture-programs.feature

Feature: Venture programs
  A venture runs on Effect. Its own programs run on the runtime Naive provides, with no build step, and a founder who
  has not learned Effect can write a plain async function instead.

  Rule: naive run runs a program on the venture runtime

    Scenario: An Effect program runs and prints its value
      Given a new venture "kettle"
      And the program "src/hi.ts" exports the Effect that succeeds with "kettle runs"
      When the founder runs "naive run src/hi.ts"
      Then the run exits 0
      And the output says "kettle runs"

    Scenario: A plain async function runs too
      Given a new venture "kettle"
      And the program "src/plain.ts" exports an async function that returns "plain works"
      When the founder runs "naive run src/plain.ts"
      Then the run exits 0
      And the output says "plain works"

    Scenario: A program that fails says why
      Given a new venture "kettle"
      And the program "src/bad.ts" exports the Effect that fails with "no customers yet"
      When the founder runs "naive run src/bad.ts"
      Then the run exits 1
      And the output says "no customers yet"

    Scenario: A program outside the venture is refused
      Given a new venture "kettle"
      When the founder runs "naive run ../elsewhere.ts"
      Then the run exits 1
      And the output says "outside the venture"

  Rule: A done-criterion can be a venture program

    Scenario: An effect criterion that passes is evidence
      Given a new venture "kettle"
      And the program "src/done.ts" exports the Effect that succeeds with passed true
      And a handoff "h1" whose criterion "c1" runs the effect "src/done.ts"
      When the handoff "h1" runs
      Then criterion "c1" passed
      And the evidence keeps the command "src/done.ts"

    Scenario: An effect criterion that returns passed false fails
      Given a new venture "kettle"
      And the program "src/done.ts" exports the Effect that succeeds with passed false
      And a handoff "h1" whose criterion "c1" runs the effect "src/done.ts"
      When the handoff "h1" runs
      Then criterion "c1" failed

    Scenario: Hosted, an effect criterion runs with no sandbox
      Given a new venture "kettle"
      And the program "src/done.ts" exports the Effect that succeeds with passed true
      And a handoff "h1" whose criterion "c1" runs the effect "src/done.ts"
      And Naive is hosted with no sandbox hook
      When the handoff "h1" runs
      Then criterion "c1" passed
