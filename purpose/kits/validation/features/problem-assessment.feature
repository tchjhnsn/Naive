# The behaviors the lean problem assessment must keep (EE-050). Each scenario runs as a test:
# node packages/naive/src/engine/bdd.mjs purpose/kits/validation/features/problem-assessment.feature
# Step definitions: problem-assessment.steps.mjs beside this file.

Feature: Problem assessment
  A founder learns what their evidence is strong enough for, without being told a good idea is
  not viable because the evidence is not in yet, and without being told to charge or raise on
  evidence that only suggests the problem.

  Rule: It asks before it runs when the record is incomplete

    Scenario: A record with missing fields asks to fill them in or run as is
      Given a problem record with a statement and a segment only
      When the founder runs the assessment
      Then it does not assess yet
      And it lists "why_now" as missing
      And it lists "cost or workarounds" as missing
      And it offers to fill them in or to run as is

    Scenario: No problem record at all
      Given a venture with no problem record
      When the founder runs the assessment
      Then it lists "purpose/validation/problem.json" as missing
      And it offers to fill them in or to run as is

    Scenario: A problem stored where the foundation/problem route writes it is still the problem
      Given a problem record with a statement and a segment only, at foundation/problem.json
      When the founder runs the assessment
      Then it does not assess yet
      And it lists "cost or workarounds" as missing
      And it does not list "purpose/validation/problem.json" as missing

    Scenario: A complete problem at foundation/problem.json is assessed
      Given a complete problem record at foundation/problem.json
      When the founder runs the assessment
      Then it assesses
      And the evidence supports "prototype"

    Scenario: Running as is assesses and still names what was missing
      Given a problem record with a statement and a segment only
      When the founder runs the assessment as is
      Then it assesses
      And the evidence supports "explore"
      And it reports that it ran as is

    Scenario: A complete record runs without asking
      Given a complete problem record
      When the founder runs the assessment
      Then it assesses
      And it does not report that it ran as is

  Rule: It never turns missing evidence into a verdict against the idea

    Scenario: No evidence means unknown or assumed, not invalid
      Given a problem record with a statement and a segment only
      When the founder runs the assessment as is
      Then "exists" is "assumed"
      And "why-now" is "unknown"
      And no assumption is "contradicted"
      And the result never says "not viable"

    Scenario: Competitors with paying customers count for the problem
      Given a complete problem record
      And a reported item that competitors have paying customers, bearing on "exists"
      When the founder runs the assessment
      Then "exists" is "inferred"
      And no assumption is "contradicted"

    Scenario: Evidence against from outside the segment does not contradict
      Given a complete problem record
      And a reported item that competitors have paying customers, bearing on "exists"
      And an item against "exists" from the wrong audience
      When the founder runs the assessment
      Then "exists" is "inferred"

    Scenario: Contradicted needs evidence against from the segment at least as strong
      Given a complete problem record
      And first-hand behavior from 8 people in the segment, bearing on "hurts"
      And first-hand behavior from 8 people in the segment against "hurts"
      When the founder runs the assessment
      Then "hurts" is "contradicted"
      And the evidence supports "explore"
      And the result never says "not viable"

  Rule: It never lets inferred evidence carry a commitment that needs demonstrated evidence

    Scenario: Desk research and competitors support prototyping, not charging
      Given a complete problem record
      And a reported item that competitors have paying customers, bearing on "exists"
      And a reported item that people pay for workarounds, bearing on "hurts"
      When the founder runs the assessment
      Then the evidence supports "prototype"
      And to reach "charge" it needs "segment" demonstrated
      And to reach "charge" it needs "hurts" demonstrated

    Scenario: A vendor's self-reported customer count cannot demonstrate
      Given a complete problem record
      And behavior from 10000 people in the segment reported by a vendor, bearing on "hurts"
      When the founder runs the assessment
      Then "hurts" is "inferred"

    Scenario: First-hand behavior from the segment demonstrates
      Given a complete problem record
      And first-hand behavior from 8 people in the segment, bearing on "hurts"
      Then "hurts" is "demonstrated" when assessed

    Scenario: Fewer than five people infer but do not demonstrate
      Given a complete problem record
      And first-hand behavior from 3 people in the segment, bearing on "hurts"
      Then "hurts" is "inferred" when assessed

    Scenario: Charging needs the segment and the cost demonstrated
      Given a complete problem record
      And a reported item that competitors have paying customers, bearing on "exists"
      And first-hand behavior from 8 people in the segment, bearing on "segment"
      And first-hand behavior from 8 people in the segment, bearing on "hurts"
      When the founder runs the assessment
      Then the evidence supports "charge"

  Rule: A root problem can take several forms, each assessed on its own

    Scenario: A form's evidence is assessed on its own and counts for the root
      Given a complete problem record
      And the forms "traction" and "skill-gaps"
      And first-hand behavior from 8 people in the segment, bearing on "hurts" for the form "traction"
      When the founder runs the assessment
      Then the form "traction" has "hurts" "demonstrated"
      And the form "skill-gaps" has "hurts" "assumed"
      And "hurts" is "demonstrated"

    Scenario: A dropped form is not assessed
      Given a complete problem record
      And the forms "traction" and "skill-gaps"
      And the form "skill-gaps" is dropped
      When the founder runs the assessment
      Then only the form "traction" is assessed

  Rule: The problem statement is the founder's to settle

    Scenario: An agent's write to the problem record is a draft for the founder to accept
      Given the example venture "tandem"
      When an agent writes the problem record through the router
      Then the write is a draft waiting for a person to accept it

  Rule: Every result says what to do next

    Scenario: The result names the cheapest test for each blocking assumption
      Given a problem record with a statement and a segment only
      When the founder runs the assessment as is
      Then every blocking assumption has a test

  Rule: Every interface asks the same way before it runs

    Scenario: The router asks before running
      Given the example venture "tandem"
      When an agent runs "purpose/validation/assess" through the router
      Then the router answers with needs_input listing what is missing
      And running it again with as_is assesses

    Scenario: The CLI asks before running
      Given the example venture "tandem"
      When the founder runs "purpose/validation/assess" through the CLI
      Then the CLI prints the question and both choices
      And running it again with --as-is assesses

    Scenario: The MCP server asks before running
      Given the example venture "tandem"
      When an agent calls mentura_run for "purpose/validation/assess" through MCP
      Then the tool result tells the agent to ask the person and lists what is missing
      And calling it again with as_is assesses

    Scenario: The API asks before running
      Given the example venture "tandem"
      When a client posts to "purpose/validation/assess/run" through the API
      Then the API answers with needs_input listing what is missing
      And posting again with as_is assesses

    Scenario: The skill tells the agent to ask before running
      Given the problem-validation skill
      Then it tells the agent to show what is missing and ask whether to fill it in or run as is
