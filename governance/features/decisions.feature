# The behaviors decisions as a file type must keep (EE-054, EE-057): where a decision lives, what
# holds it, and when it renders. Run: node schema/bdd.mjs governance/features/decisions.feature

Feature: Decisions
  Every decision a venture owes sits beside what it decides. A venture fails closed, so open
  decisions above hold the ones below; a product fails open. A decision renders when it is
  needed, not before, and while the venture is in Discovery a decided one is still a working draft.

  Rule: A boundary holds everything under it

    Scenario: Under an open fail-closed decision, a child waits
      Given the example venture "tandem"
      And an open decision "pricing-model" that fails closed
      And an open decision "launch-price" under "pricing-model"
      When the founder asks for the decisions
      Then "launch-price" renders "waiting"
      And "pricing-model" renders "now"

    Scenario: A decision about a product fails open
      Given the example venture "tandem"
      And an open decision "shop-app-scope" about the product "shop-app"
      And an open decision "shop-app-icon" under "shop-app-scope"
      When the founder asks for the decisions
      Then "shop-app-scope" fails open
      And "shop-app-icon" renders "now"

    Scenario: A product without a venture fails open
      Given the example venture "tandem"
      And the workspace is a product without a venture
      When the founder asks for the decisions
      Then "foundation" fails open

    Scenario: An agent's write under an open fail-closed decision is a draft
      Given the example venture "tandem"
      And an open decision "shop-app-scope" about the product "shop-app" that fails closed
      When an agent writes the product "shop-app"
      Then the product write is a draft held by "shop-app-scope"

  Rule: A decision renders when it is needed

    Scenario: A decision needed in a later phase is held back
      Given the example venture "tandem"
      And an open decision "series-a" needed in "scale"
      When the founder asks for the decisions
      Then "series-a" renders "later"

    Scenario: A decision with a deadline is never held back, and is overdue once it passes
      Given the example venture "tandem"
      And it is now "2026-10-30T00:00:00Z"
      And an open decision "series-a" needed in "scale" and due at "2026-11-30T00:00:00Z"
      And an open decision "demo-scope" due at "2026-10-29T22:00:00Z"
      When the founder asks for the decisions
      Then "series-a" renders "now"
      And "demo-scope" renders "overdue"

    Scenario: A decision made before its parent changed is stale
      Given the example venture "tandem"
      And a decision "pricing-model" decided at "2026-10-20T00:00:00Z"
      And a decision "launch-price" under "pricing-model" decided at "2026-10-01T00:00:00Z"
      When the founder asks for the decisions
      Then "launch-price" renders "stale"

    Scenario: In Discovery a decided decision is still a working draft
      Given the example venture "tandem"
      And the venture is in "discovery"
      And a decision "pricing-model" decided at "2026-10-20T00:00:00Z"
      When the founder asks for the decisions
      Then "pricing-model" is "working"

  Rule: The docket ranks what matters most now

    Scenario: An overdue decision comes first, then one that others wait on
      Given the example venture "tandem"
      And it is now "2026-10-30T00:00:00Z"
      And an open decision "pricing-model" that fails closed
      And an open decision "launch-price" under "pricing-model"
      And an open decision "logo" that fails open
      And an open decision "demo-scope" due at "2026-10-29T22:00:00Z"
      When the founder asks for the decisions
      Then the first ranked decisions are "demo-scope", "pricing-model"
      And "pricing-model" ranks above "logo" because "1 decision wait on it"

  Rule: Every decision carries its provenance (EE-058)

    Scenario: An agent's wording is not a decision until a person approves it
      Given the example venture "tandem"
      And an agent's wording for an open decision "pricing-model"
      When the founder asks for the decisions
      Then "pricing-model" renders "now"
      And "pricing-model" awaits approval

    Scenario: An approved decision says who approved it and in which phase
      Given the example venture "tandem"
      And a decision "pricing-model" decided at "2026-10-20T00:00:00Z"
      When the founder asks for the decisions
      Then "pricing-model" was approved by "Founder" in "discovery"

    Scenario: An outcome marked met or missed records what actually happened
      Given the example venture "tandem"
      And a decision "pricing-model" with the outcome "ten-shops" marked "met" and no actual outcome
      When the decisions are checked
      Then the check fails naming "records no actual outcome"

  Rule: Agents propose decisions; people make them (EE-058)

    Scenario: An agent proposes a decision and it waits for a person
      Given the example venture "tandem"
      When an agent proposes the decision "launch-date" with the answer "Launch on Friday"
      Then the proposal is accepted
      And "launch-date" awaits approval

    Scenario: An agent cannot propose a decision as already decided
      Given the example venture "tandem"
      When an agent proposes the decision "launch-date" as decided
      Then the proposal is refused

    Scenario: A person decides it, and provenance says who, how and in which phase
      Given the example venture "tandem"
      And an agent proposes the decision "launch-date" with the answer "Launch on Friday"
      When "Founder" decides "launch-date" by typing "launch-date"
      And the founder asks for the decisions
      Then "launch-date" renders "done"
      And "launch-date" was approved by "Founder" in "validation"

    Scenario: A route a pending decision unlocks is closed to agents until it is decided
      Given the example venture "tandem"
      And an agent proposes the decision "ship-app" that unlocks "purpose/product/*"
      When an agent writes the product "shop-app"
      Then the product write is refused as locked by "ship-app"
      When "Founder" decides "ship-app" by typing "ship-app"
      And an agent writes the product "shop-app"
      Then the product write goes through

  Rule: The foundation and the matrix stay consistent

    Scenario: A decision record that settles a foundation statement stands in for it
      Given the example venture "tandem"
      And a deferred decision "vision" for the statement "vision"
      When the founder asks for the decisions
      Then "vision" renders "deferred"
      And there is no decision "foundation-vision"

    Scenario: A decision under an unknown parent fails the check
      Given the example venture "tandem"
      And an open decision "launch-price" under "nowhere"
      When the decisions are checked
      Then the check fails naming "unknown parent nowhere"

    Scenario: A decided decision names who decided
      Given the example venture "tandem"
      And a decision "pricing-model" decided at "2026-10-20T00:00:00Z" by nobody
      When the decisions are checked
      Then the check fails naming "names no one who decided"

    Scenario: A decision about a foundation record waits on that statement, not the whole foundation
      Given a new venture "kept"
      And an open decision "problem-scope" about the problem record
      When the founder asks for the decisions
      Then "problem-scope" renders "waiting"
      And "problem-scope" is held by "foundation-problem"
      And "foundation-problem" says to "write purpose/validation/problem"

    Scenario: A new venture asks Naive's product questions first, and they fail closed
      Given a new venture "kept"
      When the founder asks for the decisions
      Then "product-exists" renders "now"
      And "core-product" renders "waiting"
      And "flagship" renders "waiting"
      And "product-exists" says to "mentura decide product-exists --venture kept"

    Scenario: The founder answers Naive's product question in their own words
      Given a new venture "kept"
      When "Founder" answers "product-exists" with "No: it is still an idea"
      Then "product-exists" was approved by "Founder" in "discovery"
      And "product-exists" was worded by the founder
      And "core-product" renders "now"
