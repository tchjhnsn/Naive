<!-- Placement: tchjhnsn/Naive docs/design/BLACKBOARD_STORAGE_COST_2026-11-02.md. Original research date: 2 November 2026 (America/Chicago). Moved from a box working note on 26 November 2026. Box-local paths were rewritten. Docs only. No secrets were added or removed. A path that matches exactly one current file now names that file, and line numbers stay as of the research date. Any other path that no longer resolves is marked on that claim. -->

# Storage cost of the blackboard method

Prepared Nov 2, 2026, about 12:50 AM CST, for Torian. Research and a cost model only. Nothing in the repo or any account was changed.

Design target: platform scale (a portfolio of many ventures, later nation scale, millions of decisions). Current-scale numbers are shown too, but nothing is sized by them.

Model and measurement scripts: a local cost-model script not kept in the repo (`blackboard-model/model.py` (as of 2026-11-02; since moved/removed)). Measurements were made on files read remotely from `tchjhnsn/everything-ecosystem` at `main` on Nov 2, 2026 [1].

## 1. Short answer

1. **Storage is not material next to compute, at any scale.**
   - Keeping every decision's full record for 10 years costs about the same as 9 Sonnet 5.5 input tokens on S3 Standard, or about 640 tokens on Neon Postgres. That is $0.000018 or $0.0013 per decision [4][5][12].
   - A coordination swarm spends roughly 15 times the tokens of a single chat [14]. One decision handled that way plausibly costs $0.18 (Section 6).
   - Even keeping everything hot in Postgres for 10 years is under 1% of swarm compute. On object storage it is under 0.01%.
2. **What does matter, in order:**
   - (a) **Read amplification.** Every time an agent reads a record into its context, that costs tokens, not storage. At portfolio scale, uncached reads cost about $7.2M a month, against about $56 a month for S3 storage in year 1.
   - (b) **Per-object request fees.** Writing each record as its own object costs about $2,500 a month in PUTs at portfolio scale. That is about 45 times the storage bill.
   - (c) **Git stops working as the store** somewhere between early ventures and portfolio scale.
   - (d) **"All hot in Postgres forever"** costs about 20 times a tiered layout.
3. **One current-scale issue is near.** The venture provenance log grew about 31.6 KB a day while it was active. At that rate it passes GitHub's recommended 1 MB maximum for a single object in about a month [1][3].

## 2. Bytes per record, measured from the repo

All sizes are bytes of the real files or lines [1].

| Record | Source in repo | Bytes |
| --- | --- | --- |
| Provenance chain entry (one line of `provenance.jsonl`) | `instance/ventures/everything-ecosystem/provenance.jsonl` (as of 2026-11-02; since moved/removed), 127 lines | mean 539, median 530, min 435, max 1,489 |
| Gate sidecar line, admit | Shape from `interface/provenance.mjs` (as of 2026-11-02; since moved/removed) (merged in PR #150), simulated with a real package hash | 405 |
| Gate sidecar line, reject with disposition | Same, with the `judgment.disposition` block from `packages/naive/src/records/provenance-entry.schema.json` | 554 |
| Handoff package with ontology block (fixture) | `schema/fixtures/ontology-gate/*.json`, 6 files | 576 to 1,317 (`pricing-admit.json` 599) |
| Handoff package, real | `operations/handoffs/naive-packages-and-design-additions.json` (as of 2026-11-02; since moved/removed) | 4,517 |
| Decision record (question and answer) | 13 files in `instance/ventures/everything-ecosystem/decisions/` (as of 2026-11-02; since moved/removed) | median 448, largest 2,632 |
| Gate result (evidence of done criteria) | `evidence/results/naive-packages-and-design-additions-20261029005843.json` | 4,351 |

No `<id>.provenance.jsonl` gate sidecar exists on `main` yet. The sidecar sizes above are built from the code that writes them, not read from a stored file.

**Lines per record.** Each record that was written produced 1.74 provenance lines on average (106 non-baseline lines across 61 entities) [1].

**Bundle per decision.** This is what one decision writes. These are my assumptions, built from the measured pieces:

| Bundle | Contents | Raw bytes | Rows |
| --- | --- | --- | --- |
| Lean (fixture-sized) | median decision + fixture package + 2 admit gate lines + 5 provenance lines | 4,552 | 9 |
| Rich (real-handoff-sized), used for sizing | largest decision + real handoff + gate result + 2 admit + 1 reject gate line + 9 provenance lines | 17,715 | 15 |

## 3. Overheads

**Hash chain.** Each provenance line carries three 64-character hex SHA-256 strings (`sha256`, `prev`, `hash`) [1].
- With their keys, they average 223.6 bytes per line, which is 41% of the log's bytes.
- They are 58% of its tokens, measured with the o200k tokenizer [22].
- Stored as binary, the same three hashes are 96 bytes.
- The chain itself is cheap to store. It is expensive only when an agent reads it.

**Bitemporal versioning.** R-12 in the repo adopts valid time plus transaction time, and a correction adds a line instead of rewriting [1].
- Assumption: three more time fields per row (valid_from, valid_to, recorded_to). At the measured 31 bytes per `"at"` field, plus key overhead, that adds about 111 bytes per row.
- Assumption: 10% of rows are later corrected by a new row.
- Together these take the rich bundle from 17,715 to 21,318 logical bytes.

**Postgres rows and indexes.**
- Each heap row has a 23-byte header (padded to 24) plus a 4-byte item pointer. Each 8 kB page has a 24-byte header [11].
- Assumption: indexes add 50% of table bytes.
- Result: 32,670 bytes per rich decision in Postgres.

**Replication.**
- Neon includes multi-AZ storage on every plan [4].
- S3 Glacier Deep Archive stores data across at least three Availability Zones, at the listed price [8].
- So the base prices already include single-region redundancy.
- A second-region copy doubles storage and adds inter-region transfer of $0.02 per GB from US East (N. Virginia) to US West (Oregon) [6].

**Compression**, measured on real files with xz (preset 9) and zstd (level 19):
- The provenance log compresses 5.9x (68,459 to 11,602 bytes).
- Four documents together compress 3.5x (12,098 to 3,446 bytes).
- The model uses 3x for object storage to stay conservative.
- Single lines compress poorly on their own (gzip: 539 to 372 bytes). Compressing in batches is what makes the ratio.

## 4. Volume scenarios

| Scenario | Decisions per day | Basis |
| --- | --- | --- |
| Current | 25 | Measured range: 6 per day (13 decision-tagged provenance lines in 2.17 days [1]) to 23 merges per day (Task 3 Actions report [21]) |
| Early ventures | 250 | Assumption: 10 ventures at today's rate |
| Musk-portfolio scale | 1,000,000 | Assumption: about 1 recorded decision per person per day, across a portfolio of several Tesla-sized companies. Tesla alone had 134,785 employees on Dec 31, 2025 [15] |
| Nation scale | 20,000,000 | Assumption: about 10 recorded decisions per person per day across 2,190,219 permanent, non-postal US federal executive-branch employees (OPM, Sep 30, 2025) [16] |

Records per decision: 15 rows in the rich bundle, 9 in the lean one (Section 2).

Data growth per year for the rich bundle (GiB, 2^30 bytes, the unit S3 bills in [5]):

| Scenario | Logical | In Postgres | In object storage, compressed |
| --- | --- | --- | --- |
| Current | 0.18 | 0.28 | 0.06 |
| Early ventures | 1.8 | 2.8 | 0.6 |
| Musk-portfolio | 7,247 | 11,106 | 2,416 |
| Nation | 144,934 | 222,112 | 48,311 |

## 5. Cost by storage option

**Prices**, fetched Nov 2, 2026. AWS figures are for US East (N. Virginia), from the AWS price list published 2026-10-15 [5][6].
- Neon: $0.35 per GB-month storage; instant restore $0.20 per GB-month; 500 GB of egress per project included, then $0.10 per GB [4].
- S3 Standard: $0.023 per GB-month for the first 50 TB, $0.022 for the next 450 TB, $0.021 over 500 TB.
- S3 Glacier Instant Retrieval: $0.004 per GB-month.
- S3 Glacier Deep Archive: $0.00099 per GB-month [7].
- S3 requests: PUT $0.005 per 1,000; GET $0.0004 per 1,000.
- S3 egress to the internet: $0.09 per GB for the first 10 TB tier, after 100 GB free per month [5][6].
- Cloudflare R2: $0.015 per GB-month Standard and $0.01 Infrequent Access; Class A $4.50 and Class B $0.36 per million requests; egress free [9].
- Backblaze B2: $6.95 per TB-month; egress free up to 3x stored, then $0.01 per GB; Class A, B and C calls free [10].

**Cumulative cost if the rate stays flat and everything is kept:**

| Scenario | Neon Postgres | S3 Standard | R2 Standard | B2 | S3 Glacier IR | S3 Deep Archive |
| --- | --- | --- | --- | --- | --- | --- |
| Current, 1 / 5 / 10 yr | $0.63 / $15 / $59 | $0.009 / $0.21 / $0.84 | $0.006 / $0.14 / $0.55 | $0.003 / $0.06 / $0.25 | $0.002 / $0.04 / $0.15 | under $0.04 at 10 yr |
| Early ventures | $6.31 / $148 / $588 | $0.09 / $2.12 / $8.40 | $0.06 / $1.38 / $5.48 | $0.03 / $0.62 / $2.48 | $0.02 / $0.37 / $1.46 | $0.36 at 10 yr |
| Musk-portfolio | $25,251 / $592,437 / $2.35M | $361 / $8,468 / $33,594 | $235 / $5,523 / $21,909 | $107 / $2,499 / $9,913 | $63 / $1,473 / $5,842 | $16 / $364 / $1,446 |
| Nation | $505,028 / $11.8M / $47.0M | $7,219 / $169,359 / $671,883 | $4,708 / $110,451 / $438,184 | $2,130 / $49,976 / $198,267 | $1,255 / $29,454 / $116,849 | $311 / $7,290 / $28,920 |

**Monthly bill at month 12:**

| Scenario | Neon Postgres | S3 Standard | S3 Deep Archive |
| --- | --- | --- | --- |
| Current | $0.10 | $0.0014 | under $0.001 |
| Musk-portfolio | $3,887 | $56 | $2.39 |
| Nation | $77,739 | $1,111 | $48 |

Monthly bills grow linearly while everything is kept: month 120 is ten times month 12. The model prices S3 Standard at the first-tier $0.023 throughout, so nation-scale S3 figures are slightly high once stored data passes 50 TB.

Neon also bills compute, which is not storage. Its published typical cost for a small database is $15 a month on Launch [4].

**Git repo as the store.** GitHub sells no storage line, but it publishes limits [3]:
- on-disk `.git` size: recommended at most 10 GB;
- single object: recommended at most 1 MB, enforced at 100 MB;
- pushes: recommended at most 6 per minute;
- merged pull requests: recommended at most 1 per minute;
- directory width: recommended at most 3,000 entries.

The repo is 15,708 KB today, six days after it was created [2].

| Scenario | Days until blackboard records alone reach 10 GB (logical, before git compression) | Fits within 1 merge per minute? |
| --- | --- | --- |
| Current | about 18,800 | yes |
| Early ventures | about 1,900 | yes |
| Musk-portfolio | about half a day | no: about 694 decisions per minute |
| Nation | about 35 minutes | no |

The nearer limit is the single object. One `provenance.jsonl` per venture reaches the 1 MB recommendation in about 32 days at the rate the current log grew.

**Reads.** The blackboard is read a lot. Assumption: each record is read 20 times over its life.

| Scenario | GiB read per month | S3 egress if reads leave AWS | S3 GET, one per row | R2 Class B | Same bytes as Sonnet 5.5 input | Same, prompt-cached |
| --- | --- | --- | --- | --- | --- | --- |
| Current | 0.30 | $0 (inside 100 GB free) | $0.09 | $0.08 | $180 | $9 |
| Musk-portfolio | 12,071 | $1,077 (first-tier rate; the tiered rate is lower) | $3,648 | $3,283 | $7.2M | $360,037 |
| Nation | 241,424 | $21,719 at first-tier rate | $72,960 | $65,664 | $144M | $7.2M |

Token figures use Sonnet 5.5 at $2 per million input tokens and $0.10 per million cache-read tokens [12]. They use the measured 3.6 characters per token on records, against OpenAI's rule of thumb of about 4 for English [13]. Egress is $0 on R2 [9], and on B2 up to 3x stored [10].

**Writes.**
- One object per row costs $2,508 a month on S3 and $2,257 on R2 at portfolio scale, and $50,160 on S3 at nation scale.
- Batching rows into 8 MiB segments cuts portfolio-scale PUTs to about $0.13 a month.
- Batching is also required for the cold tiers. Glacier Instant Retrieval bills at least 128 KB per object. Deep Archive adds 40 KB of metadata per object and has a 180-day minimum duration [5].

## 6. Compared with the coordination-swarm alternative

The token rates are measured [12]. The baseline T is an assumption, and the model holds T at one read of the bundle.

- **Swarm.** Anthropic measured multi-agent systems using about 15 times the tokens of chat [14].
  - Assumption: a single-agent pass over one rich decision reads its bundle once, which is 5,922 tokens.
  - 15 times that is about 88,800 tokens, or $0.18 at Sonnet 5.5 input rates.
- **Blackboard compute.** 20 uncached full reads of the same bundle cost $0.24. With caching they cost $0.012.
  - Reading summaries and pointers instead of whole records (Section 7) cuts this further.
- **Blackboard storage.** One decision kept for 10 years:
  - S3 Standard $0.000018 (about 9 input tokens);
  - R2 $0.000012 (about 6);
  - B2 $0.0000055 (about 3);
  - Deep Archive $0.0000008 (under 1);
  - Neon $0.0013 (about 640).

**So storage is immaterial against compute.** At portfolio scale the swarm would cost about $5.4M a month (1M decisions a day at $0.18). The largest storage line, everything hot in Postgres, is $3,887 a month in year 1 and $38,870 in year 10, under 1% of that. On object storage, storage is under 0.01%.

The blackboard's real cost risk is read amplification. Whether the blackboard beats the swarm depends on how agents read, not where bytes sit.

## 7. Mitigations

1. **Segment the log and add Merkle checkpoints.**
   - Close each venture's log monthly or at about 1 MB. Make the first line of each new segment carry the previous segment's final hash.
   - Publish a Merkle tree head per segment in the style of Certificate Transparency [17]. A consistency proof between two heads has at most ceil(log2 n) + 1 nodes, so a billion entries need about 31 hashes, or 992 bytes at 32 bytes each (computed).
   - Verifiers then check from the last checkpoint instead of from genesis.
2. **Content-addressed dedup.** The chain already stores the SHA-256 of each body [1]. Storing bodies by that hash means identical packages, gate results and repeated attachments are kept once. Gate lines then point to the hash.
3. **Pointer records instead of copies.** Packets and gate lines should carry hashes and paths, not copies. The current sidecar already does this: it stores the package's sha256, not the package [1].
4. **Agent views without hashes.** Hashes are 58% of provenance tokens. Render a view for agents with hashes stripped, store hashes as binary in the database, and keep the hex form for audit export.
5. **Compression in batches.** Measured 3.5x to 5.9x on the repo's JSON with zstd and xz. Single lines gain little, so compress segments.
6. **Tiered retention by impact tier.**
   - One-way-door records (and finance and legal ones) are kept in full forever: hot index plus cold copy.
   - Low-tier detail stays hot through its time-to-detect window. Assumption: 90 days.
   - After that, keep a hash and a summary hot and move the full detail to Deep Archive.
   - Modeled 10-year cost with 90 days hot in Neon and everything archived in Deep Archive: about $116,000 at portfolio scale and $2.3M at nation scale, against $2.35M and $47.0M all-Neon. That is about 20 times less.
7. **Legal and audit retention.** Not legal advice.
   - US auditors must keep audit and review records for 7 years [18].
   - The IRS period of limitations is 3 years in general, 6 or 7 in some cases, and indefinite for fraud or no return; employment tax records are kept at least 4 years [19].
   - A default 7-year floor for finance-tier detail covers both.
   - GDPR Article 17 gives a right to erasure, with exceptions including legal obligations and legal claims [20].
   - An append-only chain cannot erase in place. Keep personal data out of chained bodies, or encrypt it under per-person keys and destroy the key on erasure, so the chain still verifies over ciphertext. This crypto-shredding pattern is a design suggestion, not a sourced legal ruling.

## 8. Decisions for Torian

**Decision 1. Where should the blackboard's records live as Naive grows?**
- (a) Keep git now, but segment the log now. Move to Postgres (Neon) as the hot index and object storage (R2) as the batched archive when the first trigger fires: `.git` over 1 GB, any record file over 1 MB, or more than 1 merge per minute.
- (b) Move to Postgres and object storage now.
- (c) Stay in git.
- **Recommendation: (a).** Storage cost does not force the move; GitHub's limits do [3]. Segmenting now fixes the 1 MB issue that is about a month away.

**Decision 2. How long do we keep record detail?**
- (a) By impact tier. One-way-door, finance and legal records are kept in full forever. Low-tier detail is compacted to hash plus summary after its time-to-detect window, with the full copy in Deep Archive for at least 7 years.
- (b) Keep everything hot forever.
- (c) Delete low-tier detail after the window.
- **Recommendation: (a).** It is about 20 times cheaper than (b) at scale, keeps the 7-year audit floor [18], and keeps every hash, so the chain still verifies.

**Decision 3. What do agents read from the blackboard?**
- (a) Views: summaries and pointers with hashes stripped, prompt-cached, and full records fetched on demand.
- (b) Raw records.
- **Recommendation: (a).** Reads into context are the only cost here that matters. Hashes alone are 58% of provenance tokens, and cached reads are 20 times cheaper on Sonnet 5.5 [12].

## Sources

1. tchjhnsn/everything-ecosystem at `main`, read Nov 2, 2026 via the GitHub API (private repo): `instance/ventures/everything-ecosystem/provenance.jsonl` (as of 2026-11-02; since moved/removed), `interface/provenance.mjs` (as of 2026-11-02; since moved/removed), `packages/naive/src/records/provenance-entry.schema.json`, `schema/fixtures/ontology-gate/` (as of 2026-11-02; since moved/removed), `instance/ventures/everything-ecosystem/operations/handoffs/naive-packages-and-design-additions.json` (as of 2026-11-02; since moved/removed), `instance/ventures/everything-ecosystem/evidence/results/naive-packages-and-design-additions-20261029005843.json` (as of 2026-11-02; since moved/removed), `instance/ventures/everything-ecosystem/decisions/` (as of 2026-11-02; since moved/removed), `docs/design/NAIVE_SYSTEMS_2026-11-01.md` (R-12 bitemporal), PR #150 file list. https://github.com/tchjhnsn/everything-ecosystem
2. GitHub REST API, repository object for tchjhnsn/everything-ecosystem: `size` 15,708 (KB), `created_at` 2026-10-26T21:45:56Z.
3. GitHub Docs, "Repository limits." https://docs.github.com/en/repositories/creating-and-managing-repositories/repository-limits
4. Neon, "Pricing" (last updated 2026-10-31). https://neon.com/pricing
5. AWS, "Amazon S3 pricing," and the AWS price list file for S3 (publication 2026-10-15). https://aws.amazon.com/s3/pricing/ and https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/s3/USD/current/s3.json
6. AWS price list file for data transfer, US East (N. Virginia). https://b0.p.awsstatic.com/pricing/2.0/meteredUnitMaps/datatransfer/USD/current/datatransfer.json
7. AWS, "Amazon S3 Glacier storage classes." https://aws.amazon.com/s3/storage-classes/glacier/
8. AWS, "Amazon S3 Glacier Deep Archive general availability" (2019). https://aws.amazon.com/about-aws/whats-new/2019/03/S3-glacier-deep-archive/
9. Cloudflare, "R2 pricing" (last updated Oct 30, 2026). https://developers.cloudflare.com/r2/pricing/
10. Backblaze, "B2 Cloud Storage pricing." https://www.backblaze.com/cloud-storage/pricing
11. PostgreSQL 18 docs, "Database Page Layout." https://www.postgresql.org/docs/current/storage-page-layout.html
12. Anthropic, "Pricing" (Sonnet 5.5: input $2, cache read $0.10, output $10 per million tokens). https://www.anthropic.com/pricing
13. OpenAI Help Center, "Understanding and counting tokens." https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them
14. Anthropic Engineering, "How we built our multi-agent research system" (Jun 13, 2025). https://www.anthropic.com/engineering/multi-agent-research-system
15. Tesla, Form 10-K for fiscal 2025, Human Capital Resources. https://www.sec.gov/Archives/edgar/data/1318605/000162828026003952/tsla-20251231.htm
16. US OPM, "FY25 Federal Equal Opportunity Recruitment Program Annual Report." https://www.opm.gov/about-us/reports-publications/agency-reports/fy25-federal-equal-opportunity-recruitment-program-feorp-annual-report.pdf
17. IETF RFC 9162, "Certificate Transparency Version 2.0." https://www.rfc-editor.org/rfc/rfc9162.html
18. 17 CFR 210.2-06, "Retention of audit and review records." https://www.ecfr.gov/current/title-17/chapter-II/part-210/subject-group-ECFR4fd1bf0b2cdf3d8/section-210.2-06
19. IRS, "How long should I keep records?" https://www.irs.gov/businesses/small-businesses-self-employed/how-long-should-i-keep-records
20. GDPR Article 17, "Right to erasure." https://gdpr-info.eu/art-17-gdpr/
21. Task 3 report, the companion Mentura3 research note `docs/mentura/research/ACTIONS_USAGE_2026-11-01.md` (as of 2026-11-02; since moved/removed) (23.0 merges per day, Oct 27 to Nov 1, 2026).
22. OpenAI tiktoken, `o200k_base` encoding, used to count tokens locally. https://github.com/openai/tiktoken

Computed, not sourced: compression ratios, token counts and bundle sizes (measured with a local cost-model script not kept in the repo (`blackboard-model/model.py` (as of 2026-11-02; since moved/removed)) and the commands in this run), the days-to-limit figures, the Merkle proof size, and all scenario costs.
