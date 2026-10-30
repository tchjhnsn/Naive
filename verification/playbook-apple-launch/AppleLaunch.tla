---- MODULE AppleLaunch ----
\* The apple-launch playbook (packages/marketing/playbooks/apple-launch.md).
\* States are the founder's records as the template steps run.
\* Each action is one step. The comment names the route and the action the router offers
\* (node interface/router.mjs). marketing/content has no write action: the narrative and the
\* demo are files under operations/marketing/content/, which that route then reads, and which
\* operations/marketing/public checks.

VARIABLES
    product,       \* "absent" | "thin" | "ready". The venture provides the card, or does not.
    brand,         \* "absent" | "present". The venture provides marketing/brand, or does not.
    pricing,       \* "absent" | "present". The venture provides validation/pricing, or does not.
    sawProduct,    \* product/[id] has been read
    sawInputs,     \* marketing/design-system/inputs has been run
    sawBrand,      \* marketing/brand has been read (not-found counts)
    sawPricing,    \* validation/pricing has been read (not-found counts)
    narrative,     \* "none" | "clean" | "gate" | "voice" | "mark"
    demo,          \* "none" | "clean" | "gate" | "voice" | "mark" | "unsupported"
    sitemap,       \* "none" | "pointed"
    publicCheck,   \* "none" | "pass" | "fail"   operations/marketing/public
    voiceCheck,    \* "none" | "pass" | "fail"   marketing/voice result.ok (the process still exits 0)
    supportCheck,  \* "none" | "pass" | "fail"   beat fields against the product card and pricing
    markCheck      \* "none" | "pass" | "fail"   Apple, iPhone, iPod, Think different

vars == <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing,
          narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

Init ==
    /\ product \in {"absent", "thin", "ready"}
    /\ brand \in {"absent", "present"}
    /\ pricing \in {"absent", "present"}
    /\ sawProduct = FALSE /\ sawInputs = FALSE /\ sawBrand = FALSE /\ sawPricing = FALSE
    /\ narrative = "none" /\ demo = "none" /\ sitemap = "none"
    /\ publicCheck = "none" /\ voiceCheck = "none" /\ supportCheck = "none" /\ markCheck = "none"

\* product/[id] read, and the venture has no card. The read is not-found. It does not invent one.
ReadMissing ==
    /\ product = "absent" /\ ~sawProduct
    /\ sawProduct' = TRUE
    /\ UNCHANGED <<product, brand, pricing, sawInputs, sawBrand, sawPricing, narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* product/[id] read. "thin" is a card with no job. "ready" has a job and an audience field.
ReadProduct ==
    /\ product \in {"thin", "ready"} /\ ~sawProduct
    /\ sawProduct' = TRUE
    /\ UNCHANGED <<product, brand, pricing, sawInputs, sawBrand, sawPricing, narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* marketing/design-system/inputs run. It reads the product the venture already provided. It copies nothing.
ReadInputs ==
    /\ sawProduct /\ product = "ready" /\ ~sawInputs
    /\ sawInputs' = TRUE
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawBrand, sawPricing, narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* marketing/brand read. not-found when brand = "absent". No voice rule is invented.
ReadBrand ==
    /\ sawInputs /\ ~sawBrand
    /\ sawBrand' = TRUE
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawPricing, narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* validation/pricing read. not-found when pricing = "absent". No price is invented.
ReadPricing ==
    /\ sawBrand /\ ~sawPricing
    /\ sawPricing' = TRUE
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, narrative, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* File operations/marketing/content/launch-narrative.mdx, then marketing/content read.
\* "gate" fails the public gate. "voice" uses an avoid-phrase, and only when the brand was read and is present.
\* "mark" uses an Apple mark from the trademark list.
WriteNarrative ==
    /\ sawPricing /\ narrative = "none"
    /\ narrative' \in (IF brand = "present" THEN {"clean", "gate", "mark", "voice"} ELSE {"clean", "gate", "mark"})
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing, demo, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* File operations/marketing/content/launch-demo.mdx, then marketing/content read.
\* The demo is written only after the narrative. One defect at a time, so each failed check has its own end state.
\* "unsupported" is a beat whose field the product card does not have, or a price beat when pricing was not-found.
WriteDemo ==
    /\ narrative = "clean" /\ demo = "none"
    /\ demo' \in (IF brand = "present" THEN {"clean", "gate", "unsupported", "mark", "voice"} ELSE {"clean", "gate", "unsupported", "mark"})
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing, narrative, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

WriteDemoAfterDefect ==
    /\ narrative \in {"gate", "voice", "mark"} /\ demo = "none"
    /\ demo' = "clean"
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing, narrative, sitemap, publicCheck, voiceCheck, supportCheck, markCheck>>

\* marketing/sitemap read, then marketing/sitemap write. Both content files already exist.
WriteSitemap ==
    /\ demo # "none" /\ sitemap = "none"
    /\ sitemap' = "pointed"
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing, narrative, demo, publicCheck, voiceCheck, supportCheck, markCheck>>

\* The four checks. Public gate failure is the router's ok: false.
\* Voice failure is result.ok false while the process still exits 0 (schema/brand.mjs voice).
RunChecks ==
    /\ sitemap = "pointed" /\ publicCheck = "none"
    /\ publicCheck' = IF narrative = "gate" \/ demo = "gate" THEN "fail" ELSE "pass"
    /\ voiceCheck' = IF narrative = "voice" \/ demo = "voice" THEN "fail" ELSE "pass"
    /\ supportCheck' = IF demo = "unsupported" THEN "fail" ELSE "pass"
    /\ markCheck' = IF narrative = "mark" \/ demo = "mark" THEN "fail" ELSE "pass"
    /\ UNCHANGED <<product, brand, pricing, sawProduct, sawInputs, sawBrand, sawPricing, narrative, demo, sitemap>>

\* End states. A stutter so NoDeadlock holds. The chart hides these.
StopNoProduct == product = "absent" /\ sawProduct /\ UNCHANGED vars
StopThin == product = "thin" /\ sawProduct /\ UNCHANGED vars
Done == publicCheck # "none" /\ UNCHANGED vars

Next == ReadMissing \/ ReadProduct \/ ReadInputs \/ ReadBrand \/ ReadPricing
    \/ WriteNarrative \/ WriteDemo \/ WriteDemoAfterDefect \/ WriteSitemap \/ RunChecks
    \/ StopNoProduct \/ StopThin \/ Done

Spec == Init /\ [][Next]_vars

TypeOK ==
    /\ product \in {"absent", "thin", "ready"}
    /\ brand \in {"absent", "present"}
    /\ pricing \in {"absent", "present"}
    /\ sawProduct \in BOOLEAN /\ sawInputs \in BOOLEAN /\ sawBrand \in BOOLEAN /\ sawPricing \in BOOLEAN
    /\ narrative \in {"none", "clean", "gate", "voice", "mark"}
    /\ demo \in {"none", "clean", "gate", "voice", "mark", "unsupported"}
    /\ sitemap \in {"none", "pointed"}
    /\ publicCheck \in {"none", "pass", "fail"}
    /\ voiceCheck \in {"none", "pass", "fail"}
    /\ supportCheck \in {"none", "pass", "fail"}
    /\ markCheck \in {"none", "pass", "fail"}

\* No step reads a record that no earlier step, or the venture, provides.
\* A narrative exists only after the product, the inherited inputs, the brand, and pricing were read,
\* and only when the venture's card is ready. The demo exists only after the narrative.
\* The sitemap exists only after both files. The checks run only after the sitemap.
\* A voice defect exists only after a brand record that is actually there was read.
NoReadBeforeProvided ==
    /\ sawInputs => sawProduct /\ product = "ready"
    /\ sawBrand => sawInputs
    /\ sawPricing => sawBrand
    /\ narrative # "none" => sawPricing /\ product = "ready"
    /\ demo # "none" => narrative # "none"
    /\ sitemap = "pointed" => demo # "none"
    /\ publicCheck # "none" => sitemap = "pointed"
    /\ (narrative = "voice" \/ demo = "voice") => brand = "present" /\ sawBrand

\* A missing brand does not grow a voice rule.
NoInventedVoice == (narrative = "voice" \/ demo = "voice") => brand = "present"

\* Each check agrees with the records. A pass is not given to a broken draft, and a fail is not given to a clean one.
PublicAgrees ==
    /\ publicCheck = "pass" => narrative # "gate" /\ demo # "gate"
    /\ publicCheck = "fail" => narrative = "gate" \/ demo = "gate"

VoiceAgrees ==
    /\ voiceCheck = "pass" => narrative # "voice" /\ demo # "voice"
    /\ voiceCheck = "fail" => (narrative = "voice" \/ demo = "voice") /\ brand = "present"

SupportAgrees ==
    /\ supportCheck = "pass" => demo # "unsupported"
    /\ supportCheck = "fail" => demo = "unsupported"

MarkAgrees ==
    /\ markCheck = "pass" => narrative # "mark" /\ demo # "mark"
    /\ markCheck = "fail" => narrative = "mark" \/ demo = "mark"

\* The four checks run together, so a founder does not see one and miss the others.
ChecksTogether ==
    /\ (publicCheck = "none") <=> (voiceCheck = "none")
    /\ (publicCheck = "none") <=> (supportCheck = "none")
    /\ (publicCheck = "none") <=> (markCheck = "none")

\* Scope bound, not a rule about a real launch: the model injects one defect at a time,
\* so the chart can show which check fails. Two defects at once are left out. The replay says so.
OneDefect ==
    /\ narrative \in {"gate", "voice", "mark"} => demo \in {"none", "clean"}
    /\ demo \in {"gate", "voice", "mark", "unsupported"} => narrative = "clean"
====
