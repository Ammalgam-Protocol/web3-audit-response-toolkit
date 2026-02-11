# Changelog

## [1.0.0] - 2026-02-10

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
- Rolling pool dispatch model — refills agent slots as they complete instead of waiting for fixed batches, keeping all 3 slots occupied even when one finding takes much longer than others
- STATE.md protocol for crash-resilient session tracking across context windows
- Duplicate detection via processed findings context passed to each subagent
- Grouping rules to avoid file-level write conflicts between concurrent agents

**Assessment**
- Unified severity framework (SEVERITY_REFERENCE.md) synthesized from Sherlock, Cantina, Immunefi, OpenZeppelin, Trail of Bits, and Zellic
- Multi-dimensional finding quality scoring (Summary Clarity, Reproduction Evidence, Fix Recommendation)
- Independent severity assessment with validity and severity confidence ratings
- Structured artifact templates (ISSUE.md, DISPUTE.md, DUPLICATE.md, SCORECARD.md)

**Quality**
- Rationalization guards table to prevent common skip/shortcut patterns
- Quality checklist for review completion verification
- Ban list for PoC tests (bare `vm.expectRevert`, console.log, `assertEq(bool, true)`)
