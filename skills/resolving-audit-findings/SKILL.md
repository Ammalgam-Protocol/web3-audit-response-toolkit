---
name: resolving-audit-findings
description: >
  Use when fixing a confirmed audit finding, converting a validation PoC into a regression test,
  creating a bugfix branch for an audit vulnerability, implementing a fix for a reviewed finding
  with an existing ISSUE.md and POC, or resolving audit remediation items using TDD. Picks up
  where reviewing-audit-reports leaves off — takes confirmed findings and resolves them.
license: MIT
metadata:
  author: Ammalgam-Protocol
  version: "1.0.0"
---

# Resolving Audit Findings

One confirmed finding. One fix. TDD all the way through.

This skill is the companion to `reviewing-audit-reports`. The review skill validates findings and produces ISSUE.md + two-layer PoC tests. This skill converts those PoCs into regression tests and implements fixes using RED/GREEN/REFACTOR.

This skill is **language/framework agnostic** — it adapts to whatever smart contract testing framework and language the project uses.

## When to Use

- Fixing a confirmed audit finding that has an existing ISSUE.md and PoC
- Converting a two-layer validation PoC into a single-layer regression test
- Creating a bugfix branch for an audit vulnerability
- Implementing audit remediation items using TDD

## When NOT to Use

- Validating findings (use `reviewing-audit-reports` first)
- Finding has no existing PoC or ISSUE.md (run review skill first)
- Multiple findings at once (one finding per session)
- Code quality or gas optimization work unrelated to audit findings

## Prerequisites

Before this skill can run, the following must exist:

1. **ISSUE.md** — Confirmed finding artifact from the review skill
2. **POC test file** — Two-layer PoC that passes on vulnerable code
3. **Audited source code** — The codebase containing the bug

If any prerequisite is missing, **STOP** and direct the user to run `reviewing-audit-reports` first.

## Contents

- [Rationalizations](#rationalizations-do-not-skip) — common shortcuts to resist
- [The Two-Layer Conversion](#the-two-layer-conversion) — core mechanic
- [Phase 0: Review and Understand](#phase-0-review-and-understand-read-only) — read-only prerequisite check
- [Phase 1: Plan the Fix](#phase-1-plan-the-fix-manual-checkpoint) — TDD plan with user approval
- [Phase 2: RED](#phase-2-red--convert-poc-to-failing-test) — convert PoC to failing test
- [Phase 3: GREEN](#phase-3-green--fix-the-code) — implement minimal fix
- [Phase 4: REFACTOR](#phase-4-refactor-manual-checkpoint) — clean up with test safety net
- [Phase 5: Branch and Commit](#phase-5-branch-and-commit-manual-checkpoint) — structured git workflow
- [Phase 6: GitHub Integration](#phase-6-github-integration-manual-checkpoint) — issues and PRs
- [Phase 7: CI/CD Monitoring](#phase-7-cicd-monitoring) — watch and fix CI
- [Common Mistakes](#common-mistakes) / [Quality Checklist](#quality-checklist)
- Reference files: [fix_patterns/](fix_patterns/)

---

## Rationalizations (Do Not Skip)

| Rationalization | Why It's Wrong | Required Action |
| --- | --- | --- |
| "The auditor's recommended fix looks right, I'll just apply it" | Auditor fixes are suggestions, not verified code | Analyze independently; auditor fix is one input, not the answer |
| "I'll skip the RED step since I know the test should fail" | RED proves the test actually catches the bug | Run the test and verify the failure message matches |
| "The fix is obvious, I don't need a plan" | Obvious fixes break adjacent invariants | Write the plan; use `superpowers:writing-plans` |
| "I'll fix multiple findings while I'm in this file" | Cross-finding fixes create tangled commits | One finding per session; one fix per branch |
| "I'll refactor while implementing the fix" | Refactoring during fix obscures what changed | Separate commits: fix first, refactor second |
| "The full test suite is slow, I'll just run the PoC" | Fix may break other invariants | Full suite must pass at GREEN and after REFACTOR |
| "I'll commit the fix and refactor together" | Reviewers can't distinguish fix from cleanup | Separate commits with clear messages |
| "I don't need user approval for this plan" | User may have context about constraints you lack | Every plan gets explicit approval at the checkpoint |
| "The CI failure is unrelated to my fix" | Assumptions about CI are often wrong | Investigate and fix; push corrections |
| "I'll modify the PoC assertions to make it pass" | Weakening assertions hides the bug | Assertions are sacred — only remove the expectRevert wrapper |

---

## The Two-Layer Conversion

This is the core mechanic that bridges review and resolution. The review skill produces a two-layer test. This skill converts it to a single-layer regression test.

### Conversion Steps

| Step | Action | What Changes |
| --- | --- | --- |
| 1 | Delete the test wrapper function | Remove `testValidateFinding` (the one with `vm.expectRevert`) |
| 2 | Rename exercise → test | `exerciseValidateFinding` → `testValidateFinding` |
| 3 | Keep assertions untouched | The assertion already checks the CORRECT outcome |
| 4 | Run the test | It FAILS (RED) because the bug still exists |
| 5 | Fix the bug in source code | Make the minimal change per the approved plan |
| 6 | Run the test again | It PASSES (GREEN) because the fix is correct |

### Before vs After

**Foundry example:**

```solidity
// BEFORE (review skill output — passes on vulnerable code)
function testValidateFinding() public {
    vm.expectRevert("Expected and actual values do not match: 1 != 5");
    exerciseValidateFinding();
}

function exerciseValidateFinding() public {
    uint256 expected = 1;
    uint256 actual = contract.computeValue(); // returns 5 (buggy)
    assertEq(expected, actual, "Expected and actual values do not match");
}

// AFTER (resolution conversion — fails on vulnerable code, passes after fix)
function testValidateFinding() public {
    uint256 expected = 1;
    uint256 actual = contract.computeValue(); // returns 1 (fixed)
    assertEq(expected, actual, "Expected and actual values do not match");
}
```

See the [fix_patterns/](fix_patterns/) folder for framework-specific examples:
- [foundry.sol](fix_patterns/foundry.sol) — Foundry/Forge (Solidity)
- [hardhat.ts](fix_patterns/hardhat.ts) — Hardhat + ethers.js + Chai
- [ape.py](fix_patterns/ape.py) — Ape Framework + pytest

### Rules

- **Never weaken assertions.** The exercise function's assertion checks the correct outcome. Do not change it.
- **Never add tolerances.** If the test doesn't pass with exact equality after the fix, the fix is incomplete.
- **Preserve git diff clarity.** The conversion should show a clean diff: wrapper removed, exercise renamed. The assertion line should be unchanged.

---

## Phase 0: Review and Understand (read-only)

This phase is **read-only**. Do not modify any files.

1. **Read ISSUE.md** — understand the finding, severity, impact, affected code
2. **Read the PoC test** — understand the two-layer structure and what it asserts
3. **Read affected source code** — understand the buggy code path
4. **Read the audit report finding** (if available) — understand the auditor's recommended fix
5. **Run the existing PoC** — confirm the bug still exists on current code
   - If the PoC **passes**: bug exists, proceed to Phase 1
   - If the PoC **fails**: STOP — either the bug was already fixed or the PoC is broken. Investigate before proceeding.
6. **Summarize understanding** — present to user:
   - What the bug is
   - What the PoC proves
   - What the auditor recommends (if anything)
   - What you think the fix should be (high-level)

---

## Phase 1: Plan the Fix (MANUAL CHECKPOINT)

**REQUIRED SUB-SKILL:** `superpowers:writing-plans`

1. **Analyze the auditor's recommended fix** — evaluate feasibility, correctness, side effects
2. **Consider alternatives** — is there a simpler, safer, or more idiomatic fix?
3. **Write a TDD plan** with these sections:
   - **RED**: Exact conversion steps (which function to delete, which to rename)
   - **GREEN**: Minimal fix description (which file, which function, what changes)
   - **REFACTOR**: Anticipated cleanup (or "none expected")
   - **Risk assessment**: What could break? Which invariants are adjacent?
4. **Present plan to user** — **wait for explicit approval before proceeding**

Do NOT proceed to Phase 2 without user approval.

---

## Phase 2: RED — Convert PoC to Failing Test

1. **Delete the test wrapper** — remove the function that contains `vm.expectRevert` (or framework equivalent)
2. **Rename the exercise function** — change prefix from `exercise` to `test` (Foundry) or equivalent
3. **Keep assertions untouched** — do not modify the assertion in any way
4. **Run the converted test** — it must FAIL
5. **Verify failure reason** — the failure message should match what `expectRevert` was catching
   - If the failure reason is different: STOP and investigate. The conversion may be wrong.

After RED: you have a failing test that proves the bug exists. The test will pass when the bug is fixed.

---

## Phase 3: GREEN — Fix the Code

1. **Implement the minimal fix** per the approved plan
2. **Run the converted test** — it must PASS
3. **Run the full test suite** — all tests must pass
   - If other tests break: the fix has side effects. Analyze and adjust.
4. **REQUIRED SUB-SKILL:** `superpowers:verification-before-completion`
   - Re-read the ISSUE.md
   - Confirm the fix addresses the exact vulnerability described
   - Verify no assertions were weakened or removed

After GREEN: the bug is fixed and all tests pass.

---

## Phase 4: REFACTOR (MANUAL CHECKPOINT)

Present refactoring opportunities to the user. The user may skip this phase entirely.

Potential refactoring areas:
- DRY: extract duplicated logic
- Gas efficiency: optimize if straightforward
- Code clarity: improve naming, add NatSpec where missing on changed functions
- Formatting: run the project's formatter

**Rules:**
- Each refactoring step must be verified with the full test suite
- If any test fails after a refactor step, revert that step
- Do not refactor code unrelated to the fix

---

## Phase 5: Branch and Commit (MANUAL CHECKPOINT)

1. **Create branch:** `bugfix/{finding_id}/{short-description}`
   - Example: `bugfix/CS-AMMALGAM-002/fix-deposit-accounting`
2. **Commit the fix** (RED + GREEN changes):
   - Message: `fix({finding_id}): {short description of what was fixed}`
   - Body: reference the finding ID and one-line summary
3. **Commit the refactor** (if Phase 4 produced changes):
   - Message: `refactor({finding_id}): {short description of cleanup}`
4. **Present commits to user** for review before any push

---

## Phase 6: GitHub Integration (MANUAL CHECKPOINT)

Ask the user for each of these decisions:

- [ ] **Create GitHub issue** for this finding?
  - If yes: create issue with finding summary, link to ISSUE.md
  - Amend the fix commit message with `fixes #N`
- [ ] **Push and create PR?**
  - If yes: which target branch?
  - Use `gh pr create` with finding summary in body

PR body template:

```markdown
## Summary

Fixes {finding_id}: {finding title}

**Severity:** {assessed severity}
**Source:** {audit report name}

## What Changed

{1-3 bullet points describing the fix}

## Test Plan

- [ ] Converted PoC passes (RED → GREEN verified)
- [ ] Full test suite passes
- [ ] No assertions weakened or removed

## Audit Artifacts

- ISSUE.md: `test/audit_review/{finding_id}/ISSUE.md`
- PoC: `test/audit_review/{finding_id}/POC.{ext}`
```

---

## Phase 7: CI/CD Monitoring

After push:

1. **Watch CI:** `gh pr checks --watch`
2. **If CI fails:** investigate, fix, push corrections, re-monitor
3. **If CI passes:** notify user — the fix is ready for review

---

## Common Mistakes

| Mistake | Consequence | Prevention |
| --- | --- | --- |
| Modifying assertions during conversion | Test passes but doesn't prove the fix | Assertions are sacred — only remove the expectRevert wrapper |
| Adding tolerance to make the test pass | Masks an incomplete fix | Exact equality only; if it doesn't pass, the fix is wrong |
| Skipping the RED step | No proof the test catches the bug | Always run the converted test before fixing |
| Fixing multiple findings in one branch | Tangled commits, harder review | One finding per session, one finding per branch |
| Committing fix and refactor together | Can't distinguish fix from cleanup | Separate commits always |
| Not running full test suite at GREEN | Fix breaks adjacent invariants | Full suite must pass before moving to REFACTOR |
| Applying auditor's fix blindly | Auditor's fix may be incomplete or wrong | Analyze independently; the fix must pass YOUR test |
| Skipping Phase 1 approval | User may know about constraints you don't | Always wait for explicit approval |
| Pushing without presenting commits | User may want to adjust messages or squash | Present before push |
| Weakening the PoC to match a partial fix | Declares victory without actually winning | The original assertion is the spec; fix the code, not the test |

---

## Quality Checklist

### PoC Conversion
- [ ] Test wrapper (expectRevert) deleted
- [ ] Exercise function renamed to test function
- [ ] Assertions completely unchanged from review skill output
- [ ] Converted test FAILS on vulnerable code (RED verified)
- [ ] Failure message matches what expectRevert was catching

### Fix Quality
- [ ] Fix is minimal — no unnecessary changes
- [ ] Fix addresses the exact vulnerability in ISSUE.md
- [ ] Converted test PASSES after fix (GREEN verified)
- [ ] Full test suite passes after fix
- [ ] No assertions weakened, removed, or given tolerances

### Test Suite
- [ ] All existing tests still pass
- [ ] No new test failures introduced
- [ ] Converted PoC serves as permanent regression test

### Git / GitHub
- [ ] Branch named `bugfix/{finding_id}/{short-description}`
- [ ] Fix commit references finding ID
- [ ] Refactor commit (if any) is separate from fix commit
- [ ] Commits presented to user before push
- [ ] PR body includes finding summary and test plan

### Checkpoints
- [ ] Phase 1: Plan approved by user
- [ ] Phase 4: Refactor approved or skipped by user
- [ ] Phase 5: Commits reviewed by user
- [ ] Phase 6: GitHub actions approved by user
