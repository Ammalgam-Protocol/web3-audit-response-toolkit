# Changelog

## [Unreleased]

### Fixed

**Data loss**
- `reviewing-audit-reports` no longer runs `git stash` as its first autonomous
  action. The setup agent now checks `git status --porcelain` and halts with
  `SETUP_BLOCKED|dirty_worktree` if the tree is dirty, instead of silently
  setting the user's uncommitted work aside and never restoring it. The
  orchestrator handles the blocked result and asks the user to resolve their own
  working tree.

**Command injection**
- `aggregating-audit-campaigns` Phase 5 no longer interpolates auditor-supplied
  titles and bodies into double-quoted `gh issue create` arguments. Auditor text
  is third-party prose copied verbatim and may contain backticks, `$()` or
  quotes, all of which the shell would evaluate before `gh` saw them. Issue
  bodies and titles are now written to files and passed with `--body-file` /
  `--title-file`, and labels are passed as separate `--label` flags.

**Path contracts**
- `aggregating-audit-campaigns` wrote every artifact to
  `{output_dir}/cross-audit/...` while `{output_dir}` already defaults to
  `.../cross-audit/`, producing `cross-audit/cross-audit/`. Ten references fixed.
- The dedup agent wrote `{output_dir}/DEDUP_RESULT` while the orchestrator polled
  `{output_dir}/dedup/DEDUP_RESULT_*`, so every 70-89% decision was discarded and
  the pair fell through to auto-merge. Both sides now name the same path.
- `README.md` documented `test/audit_review/{finding_id}/`, omitting the
  `{report_slug}/findings/` levels that all three skills actually use, so the
  review → aggregate → resolve handoff silently found nothing.

**Manifest and documentation consistency**
- `marketplace.json` advertised "Two-skill toolkit" at v1.0.0 while
  `plugin.json` shipped three skills at v1.1.0. Users saw the third skill only
  after installing.
- `README.md` stated severity weight `Low=0`; `reviewing-audit-reports` applies
  `Low=1`. Two readers of this repo computed different audit quality scores.
- `SCORING_RULES.md` claimed "a single Critical finding is worth more than six
  Highs". At Critical=20 and High=10, six Highs score 60. The text now states
  the actual threshold: a Critical ties two Highs and is outweighed by three.
- `README.md` listed Truffle and Brownie as fully supported; no pattern files
  exist for either and framework detection only branches on Foundry, Hardhat and
  Ape. Both are now documented as pattern reuse, with the caveats.
- `README.md` validation table: AI scanner B's Confirmed and Disputed columns
  total 93%, not 100%. The residual is flagged as unexplained rather than
  attributed to a category that was not recorded.
- `README.md` efficacy figures (261 / 439 PoC tests, scorecard values) now
  carry an explicit provenance note: no PoC sources or scorecards are committed
  to this repository, so the numbers are the author's measurements and not
  reproducible from the repo alone.
- `aggregating-audit-campaigns` frontmatter declared `1.0.0` while shipping in
  the 1.1.0 release.
- Fixed dead anchor `#phase-0-setup` → `#phase-0-setup-subagent`.
- `reviewing-audit-reports` referenced a `differential-review` skill that this
  plugin does not ship; replaced with a description of the actual boundary.
- `resolving-audit-findings` marked `superpowers:writing-plans` and
  `superpowers:verification-before-completion` as **REQUIRED SUB-SKILL**, gating
  Phase 1 and the GREEN verification on a plugin that is not a dependency here.
  Both are now optional, with the equivalent steps spelled out for when the
  `superpowers` plugin is absent.

### Changed
- Banned-pattern (`BAN:`) findings are no longer pre-authorised as
  "acceptable" by the orchestrator's checklist. They must be surfaced and
  explicitly waived by the user.
- GitHub-issue publication guidance no longer frames reduced approval prompts as
  a goal. The rationale is restated in terms of round-trips and context cost,
  and the watcher is documented as writing to the session transcript rather than
  running invisibly.
- `.gitignore` now covers `test/audit_review/`. Those artifacts contain
  unpatched vulnerability details and PoC exploit tests, and Phase 5 publishes
  findings publicly, so the local copy should not be committed by accident.

### Added
- `scripts/verify_plugin_consistency.cjs` (`npm run verify`) — fails on manifest
  parse errors, plugin/marketplace version and skill-count drift, a skill whose
  frontmatter version disagrees with its newest CHANGELOG entry, severity-weight
  drift between README and the skills, dead relative links, and dead in-document
  anchors. These are all invisible in Markdown review but break the skills at
  runtime or mislead the reader.

## [1.1.0] - 2026-02-26

### Added

**Cross-Audit Aggregation Skill**
- `aggregating-audit-campaigns` skill: 6-phase cross-campaign workflow (Enumerate, Dedup, Generate, Grid, Score, Publish)
- Root-cause deduplication algorithm weighting function (40%) + root variable (30%) + bug type (20%) + file (10%)
- Dedup agent prompt (DEDUP_PROMPT.md) for 70-89% match score candidate review
- Competition-style auditor scoring (SCORING_RULES.md) using Sherlock/Cantina hybrid formula
- Severity points: Critical=20, High=10, Medium=3, Low=1, Info=0.25
- Uniqueness premium: `0.9^(n-1)/n` — solo finders earn more than shared finders
- Quality factor from per-finding ISSUE.md scores (default 1.0 if unavailable)
- Coverage grid template with severity distribution, NxM coverage matrix, and overlap matrix
- Auditor scorecard template with leaderboard, per-finding point allocation, and verification checklist
- Local-first architecture: all artifacts as files on disk, GitHub publication optional and prompted
- Re-dedup mandate: full dedup re-runs whenever a campaign is added
- Rationalization guards for synthesized content, symptom-based merging, and approximate scoring

**Validation**
- Tested scoring system against 78 unique findings from 6 campaigns (88 finding-auditor associations)
- All verification invariants pass: pot shares sum to 100%, per-row calculations verifiable
- 10 cross-campaign duplicate groups correctly identified and scored

### Changed

**Severity Framework**
- Unified three competing severity frameworks (Cantina matrix, Sherlock thresholds, Immunefi privilege caps) into a single four-layer deterministic framework
- Added step-by-step Decision Procedure (Steps 0-4) that produces exactly one severity per finding — eliminates ambiguity where the same finding could receive different severities depending on which section a subagent read
- Replaced contradictory "Impact over Likelihood" vs "Impact × Likelihood Matrix" principles with five internally consistent principles anchored to the Decision Procedure
- Promoted Impact × Likelihood Matrix to the single classification engine (Layer 1)
- Extracted Sherlock dollar thresholds into standalone Impact Anchors table (Layer 2) with explicit High/Medium/Low definitions
- Added Likelihood Definitions table (Layer 3) with concrete examples for High/Medium/Low
- Restructured Immunefi privilege adjustments as Modifier 1 with trustless-protocol exception
- Added Modifier 2: Cumulative Damage Elevation with three-condition test and worked example
- Added Modifier 3: Protocol Continuity Check with three explicit conditions
- Converted Quick Reference Table to summary view with "source of truth" disclaimer
- Updated Severity Dispute Criteria to reference Decision Procedure steps

**Subagent Integration**
- Updated SUBAGENT_PROMPT.md to reference `{severity_reference_path}` and require subagents to follow the Decision Procedure
- Added `{severity_reference_path}` template variable to Phase 1 dispatch variable list in SKILL.md

## [1.0.0] - 2026-02-11

### Added

**Skills**
- `reviewing-audit-reports` skill: three-phase audit review workflow (Setup, Dispatch & Track, Scorecard)
- `resolving-audit-findings` skill: TDD-based audit remediation (8 phases with manual checkpoints)
- Subagent prompt template (SUBAGENT_PROMPT.md) separating orchestration from per-finding instructions

**Test & Fix Patterns**
- Two-layer PoC test pattern for dual-purpose vulnerability validation
- Framework-specific test patterns for Foundry, Hardhat, and Ape/Brownie
- Fix pattern reference files for Foundry, Hardhat, and Ape (BEFORE/AFTER two-layer conversion)

**Orchestration**
- Report slug namespacing (`{description}-{commit_hash}`) — each report gets its own subdirectory under `audit_review/`, preventing artifact collisions across multiple reviews
- Phase 0 runs in a subagent — keeps orchestrator context empty for Phase 1 dispatch
- Disk-based RESULT file polling — agents write 1-line `RESULT` files, orchestrator reads from disk instead of calling `TaskOutput` (prevents context explosion from agent transcripts)
- Refill-at-2/3 dispatch — when 2 of 3 background agents complete, refill slots immediately without waiting for the slowest agent
- STATE.md protocol for crash-resilient session tracking across context windows
- Post-batch artifact validation — checks RESULT, markdown artifact, and PoC file exist after each batch; logs `MISSING:{filename}` for incomplete agents
- Duplicate detection via processed findings context passed to each subagent
- Grouping rules to avoid file-level write conflicts between concurrent agents

**Assessment**
- Unified severity framework (SEVERITY_REFERENCE.md) synthesized from Sherlock, Cantina, Immunefi, OpenZeppelin, Trail of Bits, and Zellic
- Disputed vs Confirmed (Informational) decision rule — disputed means the auditor's claim is factually wrong; confirmed informational means the behavior exists but has no security impact
- Self-identified invalid findings excluded from quality score in scorecard
- Multi-dimensional finding quality scoring (Summary Clarity, Reproduction Evidence, Fix Recommendation)
- Independent severity assessment with validity and severity confidence ratings
- Structured artifact templates (ISSUE.md, DISPUTE.md, DUPLICATE.md, SCORECARD.md)

**Subagent Prompt**
- "Test the auditor's exact scenario" mandate — PoC must reproduce the specific attack path described, not just the happy path
- "Test all edges" requirement — happy path, auditor's scenario, and boundary conditions for each finding
- Markdown-first artifact ordering — save ISSUE.md/DISPUTE.md before POC to protect the most important deliverable from crashes
- RESULT file as mandatory completion signal — agents write to `{output_dir}/RESULT` before returning
- Hardened response format — HARD RULES enforce single pipe-delimited line response, no preamble or self-validation output
- RESULT file existence added to self-validation checklist (Check 2b)

**Quality**
- Rationalization guards for Phase 0 inline execution, happy-path-only testing, and disputing code quality issues
- Common mistakes table entries for TaskOutput anti-pattern, happy-path testing, and informational classification
- Quality checklist for review completion verification
- Ban list for PoC tests (bare `vm.expectRevert`, console.log, `assertEq(bool, true)`)

**Validation**
- 5 audit reports reviewed (competition, manual audit, 3 AI scanners) producing 439 PoC tests
- Cross-validation of 46 highest-severity findings confirmed reproducibility (84.19/100 re-review score)
