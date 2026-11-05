# The behaviors strategic foundation must keep (EE-051): the records a founder keeps in front of
# them, framed by the Five Ws and How plus whether. Run: node schema/bdd.mjs purpose/features/strategic-foundation.feature

Feature: Strategic foundation
  The founder always sees what they do, who they serve, why, how, when, where and whether, and
  which of those statements are truly theirs. Changing one is deliberate.

  Rule: The founder sees every foundation statement and whose it is

    Scenario: The report answers each question of the frame
      Given the example venture "tandem"
      When the founder asks for the strategic foundation
      Then it answers "why", "what", "who", "how", "when", "where", "whether" and "brand"
      And "whether-review" is "planned"

    Scenario: A statement an agent wrote is not the founder's yet
      Given the example venture "tandem"
      And an agent writes the venture record
      When the founder asks for the strategic foundation
      Then "mission" is "agent"

  Rule: Confirming or accepting a foundation statement is deliberate

    Scenario: Typing the statement's name confirms it
      Given the example venture "tandem"
      And an agent writes the venture record
      When the founder confirms "mission" by typing "mission"
      And the founder asks for the strategic foundation
      Then "mission" is "confirmed"
      And "competence" is "agent"

    Scenario: The wrong confirmation changes nothing
      Given the example venture "tandem"
      And an agent writes the venture record
      When the founder confirms "mission" by typing "yes"
      Then the command is refused
      And the founder asks for the strategic foundation
      And "mission" is "agent"

    Scenario: An agent's later write undoes the confirmation
      Given the example venture "tandem"
      And an agent writes the venture record
      And the founder confirms "mission" by typing "mission"
      And an agent writes the venture record
      When the founder asks for the strategic foundation
      Then "mission" is "agent"

    Scenario: An agent's write to the ICP is a draft
      Given the example venture "tandem"
      When an agent writes an ICP for "tandem"
      Then the ICP write is a draft
      And the founder asks for the strategic foundation
      And "icp" is "draft"

    Scenario: Accepting a draft that changes a foundation statement shows the change and needs its name typed
      Given the example venture "tandem"
      And an agent writes an ICP for "tandem"
      When the founder accepts "foundation/icp/owners" by typing "yes"
      Then the command is refused
      And the founder accepts "foundation/icp/owners" by typing "foundation/icp/owners"
      And the founder asks for the strategic foundation
      And "icp" is "confirmed"

  Rule: Strategic foundation agree with each other

    Scenario: Promised-to shows the ICP's short form and takes its status
      Given the example venture "tandem"
      And an agent writes an ICP for "tandem"
      When the founder asks for the strategic foundation
      Then "promised-to" is "draft"
      And the founder accepts "foundation/icp/owners" by typing "foundation/icp/owners"
      And the founder asks for the strategic foundation
      And "promised-to" is "confirmed"
      And "promised-to" shows "Owners of small service shops"

    Scenario: A hand-written promised-to that differs from the ICP fails the check
      Given the example venture "tandem"
      And an ICP for "tandem" that names no problem form
      When the strategic foundation are checked
      Then the check fails naming "promised_to"

    Scenario: An ICP that names a problem form the problem record lacks fails the check
      Given the example venture "tandem"
      And an ICP for "tandem" that names the problem form "nope"
      When the strategic foundation are checked
      Then the check fails naming "nope"
