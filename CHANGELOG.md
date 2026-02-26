# Changelog

## [1.1.0] - 2026-02-25

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
