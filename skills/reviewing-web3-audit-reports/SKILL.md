---
name: reviewing-web3-audit-reports
description: >
  Validates smart contract audit report findings by creating PoC tests that confirm or dispute
  each claimed vulnerability. Produces structured artifacts (ISSUE.md/DISPUTE.md + PoC test)
  per finding and a final scorecard grading the audit. Triggers on smart contract audit report
  review, finding triage, PoC creation, severity assessment, or audit dispute.
license: MIT
metadata:
  author: Ammalgam-Protocol
  version: "1.0.0"
---

# Reviewing Web3 Audit Reports

Every finding gets a PoC test. The test determines truth, not the auditor's claims.

This skill is **language/framework agnostic** — it adapts to whatever smart contract testing framework and language the project uses. It **validates findings only** — it never proposes or implements fixes.

## When to Use

- Reviewing a smart contract audit report against the audited codebase
- Creating PoC tests for smart contract audit findings
- Disputing findings or severity classifications
- Triaging smart contract audit results with structured artifacts
- Producing a scorecard grading audit accuracy

## When NOT to Use

- Implementing fixes for findings (use `fix-review` after fixes are applied)
- Initial security review without an existing smart contract audit report (use `differential-review`)
- Code quality or gas optimization review

## Contents

- [Rationalizations](#rationalizations-do-not-skip) — common shortcuts to resist
- [Inputs](#inputs) / [Scope](#scope) — required inputs and processing scope
- [Decision Flowchart](#decision-flowchart) — classification logic at a glance
- [Test Quality Requirements](#test-quality-requirements) — assertions, patterns, anti-patterns
- [Phase 0: Setup and Plan](#phase-0-setup-and-plan) — checkout, discover stack, plan findings
- [Phase 1: Process Findings](#phase-1-process-findings) — per-finding workflow (Steps 1-9)
- [Phase 2: Final Scorecard](#phase-2-final-scorecard) — generate and save scorecard
- [Artifact Templates](TEMPLATES.md) — ISSUE.md, DISPUTE.md, SCORECARD.md templates
- [Output Directory Structure](#output-directory-structure) — where files go
- [Common Mistakes](#common-mistakes) / [Quality Checklist](#quality-checklist)
- Reference files: [SEVERITY_REFERENCE.md](SEVERITY_REFERENCE.md), [test_patterns/](test_patterns/)

---

## Rationalizations (Do Not Skip)

| Rationalization                                     | Why It's Wrong                                  | Required Action                                       |
| --------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| "The auditor is reputable, so the finding is valid" | Reputation does not equal correctness           | Write a PoC test — let code decide                    |
| "This finding looks right from the description"     | Prose can be convincing but wrong               | Reproduce the exact code path claimed                 |
| "I'll accept the severity as stated"                | Auditors have incentive to inflate severity     | Assess independently using rubric                     |
| "The test is too hard to write"                     | Hard-to-test claims are often wrong             | Simplify setup; if still impossible, flag explicitly  |
| "I already know this is valid/invalid"              | Prior belief is not evidence                    | Write the test regardless                             |
| "I'll batch the artifacts and present later"        | Artifacts may be lost if session fails          | Save artifacts to disk immediately after each finding |
| "This finding is low severity, I'll skip the PoC"   | Every finding gets a PoC, no exceptions         | Write the PoC                                         |
| "The test failed, so maybe I should fix the code"   | This skill validates only — never fix           | Report the finding status; stop there                 |
| "I'll process all reports at once"                  | Multi-report sessions exhaust context           | One report per session; defer the rest                |
| "The agent can return the full test code"           | Full code in responses causes context explosion | Agents save to disk, return compact summary only      |

---

## Inputs

Two required inputs. If either is missing, ask the user before proceeding.

| Input                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| **Audit report path** | Path to the audit report file (PDF, MD, HTML, JSON) |
| **Commit hash**       | The git commit the audit was performed against      |

---

## Scope

Process **one report per session**. If multiple reports exist, process the first and defer the rest.

| Parameter           | Default     | Description                                                             |
| ------------------- | ----------- | ----------------------------------------------------------------------- |
| **Severity filter** | Two highest | Which severity levels to include                                        |
| **Selection**       | Random      | How to pick findings within filter (random, sequential, user-specified) |

Process **all findings** in the report. Use the severity filter and selection method to determine processing order. Present the full finding list for user approval before proceeding.

---

## Decision Flowchart

```
Read finding → Write PoC test → Run test
  ├─ PASSES (vulnerability exists) → Confirmed
  │    └─ Assess severity → Assign confidence → Score quality → ISSUE.md
  └─ FAILS
       ├─ Vulnerability absent → Disputed → Score = 0 → DISPUTE.md
       └─ Setup/test error → Debug → Re-run
```

---

## Test Quality Requirements

### Assertions Only — Never Logs

Tests validate via assertions, never logging. Every test must prove its claim through the framework's assertion primitives. If the test produces no assertion failure on the wrong behavior, it proves nothing. Every assertion should include a descriptive failure message.

### Fit the Codebase

Before writing any test, study the project's existing tests:

- **Reuse patterns** — naming conventions, fixtures, helpers, setup idioms. The PoC should read as if the original developer wrote it.
- **Reuse libraries** — never reimplement utility functions that already exist in the project's dependencies (e.g., don't write `ceilDiv()` when the project imports a math library that provides one).
- **DRY** — extract shared setup into helpers when multiple tests need it. Be as concise as possible without sacrificing clarity.

### PoC Polarity

- **PoC for vulnerability**: Test PASSES on the vulnerable (audited) commit, FAILS after the fix is applied. See "Two-Layer Test Pattern" below for the recommended structure that simplifies post-fix verification.
- **PoC for dispute**: Test PASSES showing correct behavior exists, disproving the claimed vulnerability

### Two-Layer Test Pattern

Separate the behavior exercise from the test expectation so PoCs are dual-purpose — they pass on vulnerable code, and are easily convertible to verify fixes by removing the `expectRevert` wrapper.

See the [test_patterns/](test_patterns/) folder for canonical reference implementations:
- [foundry.sol](test_patterns/foundry.sol) — Foundry/Forge (Solidity)
- [hardhat.ts](test_patterns/hardhat.ts) — Hardhat + ethers.js + Chai (also applicable to Truffle)
- [ape.py](test_patterns/ape.py) — Ape Framework + pytest (also applicable to Brownie)

- **Exercise function** (e.g., `exerciseValidateFinding`): Contains the actual behavior — calls the system under test and makes a single assertion about the expected correct outcome. On buggy code, this assertion reverts.
- **Test function** (e.g., `testValidateFinding`): Wraps the exercise call with `vm.expectRevert` using the **specific expected revert message**. On vulnerable code, the exercise function's assertion reverts with that message, and the test passes.

**How it works:**

| Scenario                     | Exercise function         | Test function                              |
| ---------------------------- | ------------------------- | ------------------------------------------ |
| Vulnerable code (before fix) | Reverts (assertion fails) | Expects specific revert → test passes      |
| After fix applied            | Passes directly           | Remove expect-revert wrapper → test passes |

**This pattern works for all bug types** — whether the bug causes a wrong value, missing state update, or incorrect accounting. The exercise function always asserts the CORRECT outcome. On buggy code, the assertion fails with a predictable message. The test function catches that specific failure.

Each framework catches the failure differently:
- **Foundry**: `assertEq` reverts with `"<description>: <expected> != <actual>"` — caught by `vm.expectRevert("message")`
- **Hardhat**: `expect(x).to.equal(y)` throws a JS `AssertionError` — caught by `expect(fn()).to.be.rejectedWith("message")`
- **Ape/pytest**: `assert x == y` raises `AssertionError` — caught by `pytest.raises(AssertionError, match="message")`

**Foundry example:**

```solidity
import {Test} from "forge-std/Test.sol";

contract FindingPoC is Test {
    function testValidateFinding() public {
        vm.expectRevert("Expected and actual values do not match: 1 != 5");
        exerciseValidateFinding();
    }

    function exerciseValidateFinding() public pure {
        uint256 expected = 1;
        uint256 actual = 5;
        assertEq(expected, actual, "Expected and actual values do not match");
    }
}
```

**Naming:** Use camelCase with `exercise` and `test` prefixes — e.g., `exerciseValidateFinding`, `testValidateFinding`. No underscores between prefix and name.

**Applicability:** Confirmed vulnerability PoCs use the two-layer pattern. Dispute PoCs (proving correct behavior) use a single-layer test since no fix-conversion is needed.

**Common mistakes with this pattern:**

- Using bare `vm.expectRevert()` without a specific message — this hides whether the test fails for the right reason. Always specify the expected revert message.
- Logging values instead of asserting — `emit log_uint(x)` proves nothing. Use `assertEq`.
- Putting setup inside the exercise function that should be in `setUp()` — the exercise function should contain only the action and assertion, not fixture initialization.

### Test Structure

- **Naming**: Follow the project's existing test naming convention. Describe the scenario or property, not the bug ID.
- **State capture**: Record measurable state BEFORE the action, assert the expected delta AFTER
- **Specificity**: Revert assertions should target a specific error selector or message, not a bare revert
- **Single assertion per PoC**: Each exercise function should contain one assertion that captures the crux of the issue. Multiple assertions dilute focus and make it unclear what the PoC actually proves. If a finding has multiple facets, write separate exercise/test pairs.
- **Exact assertions only** (`assertEq`): Always use exact equality assertions. Approximate assertions and tolerances are **never** acceptable without first:
  1. Investigating and understanding the specific source of the precision error
  2. Demonstrating to the user why exact equality is impossible
  3. Receiving explicit user consent to use a tolerance

  If you cannot explain the error source, the tolerance is masking a misunderstanding.

### Exercise, Don't Emulate

A PoC must exercise the actual vulnerable code path through the system's public interface. Never reimplement or emulate the buggy logic in the test itself — that proves the math is wrong in isolation but does not prove the system is exploitable.

- **Good**: Call the system's entry point and assert observable state change (balances, ownership, reverts)
- **Bad**: Copy the internal formula into the test, run it with hand-picked inputs, and assert the math is wrong

If the vulnerability is in an internal or library function, the test must reach it through the system's external entry point. Direct calls to internal helpers are acceptable only as a supplementary test alongside an integration test, never as the sole proof.

### Don't Mutate What You're Measuring

When a bug manifests under specific pool/system conditions (e.g., saturation thresholds, utilization ratios), adding test actors between phases can disturb those conditions — causing cascading failures unrelated to the finding. If adding a third party to observe the impact keeps breaking the test, **compute the impact mathematically from observable state instead**:

1. Capture system state (assets, shares, ratios) before and after the vulnerable operation
2. Derive the components of the state change (e.g., penalty assets, interest) from the actual delta
3. Recompute what correct code would have produced using the same components
4. Assert the actual state differs from the correct state

This still exercises the real code path — it just avoids needing a second actor whose presence changes the conditions under test.

### Anti-Patterns

In addition to the patterns covered above (assertions only, exact equality, single assertion, two-layer pattern, exercise don't emulate, don't mutate what you're measuring):

- Empty test bodies or tests with no assertions
- Tests that call functions without checking return values or state changes
- Hardcoded magic numbers without comments explaining their derivation

---

## Phase 0: Setup and Plan

1. **Checkout audited commit**: `git stash && git checkout {commit_hash}`
2. **Read the full audit report**
3. **Discover the project's testing stack** — detect language, framework, existing test patterns, shared fixtures, build commands
4. **Verify the test directory** — check the build config (e.g. `foundry.toml`, `hardhat.config.*`, `package.json`) to confirm where tests live. Usually `./test/` but may differ. All artifacts (PoC tests + markdown) will be saved to `{test_dir}/audit_review/{finding_id}/` so everything lives together.
5. **Create a numbered finding list**:

   | ID  | Title | Severity | Affected File(s) | Vulnerability Type |
   | --- | ----- | -------- | ---------------- | ------------------ |
   | ... | ...   | ...      | ...              | ...                |

6. **Identify dependencies** between findings (shared code paths)
7. **Request write permissions** — Ask the user to grant blanket write access to `{test_dir}/audit_review/` before processing begins. This prevents per-file approval prompts for the 2-3 files created per finding. Example: "I'll be writing ~{N\*2} files to `test/audit_review/`. Please grant write access to that directory so processing can run uninterrupted."
8. **Dispatch in batches of 2-3** — group findings by affected file/code path. Process each batch in parallel. After each batch completes, compact summaries into a running tally before dispatching the next batch. Never exceed 3 concurrent agents.
9. **Present the plan** to user for approval before proceeding

---

## Phase 1: Process Findings

Process highest severity first. Dispatch findings in **batches of 2-3 agents in parallel**. Group findings that share no code paths into the same batch (findings touching the same file should be in different batches to avoid conflicting writes). After each batch completes, compact the summaries into a running tally and discard agent output before dispatching the next batch.

### Per-Finding Workflow

**Step 1: Understand the claim**
Read finding. Identify the code path, preconditions, and attack vector. Determine if there is an easy way to disprove it.

**Step 2: Write PoC test (TDD)**
**REQUIRED SUB-SKILL:** `superpowers:test-driven-development`

- Test PASSES if the vulnerability EXISTS
- Test FAILS if the vulnerability does NOT exist
- Follow existing test patterns in the project (naming, fixtures, imports)

**Step 3: Run test, classify result**

| Outcome                           | Classification | Next Step                                                                     |
| --------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| Test passes                       | **Confirmed**  | Proceed to severity assessment                                                |
| Test fails (vulnerability absent) | **Disputed**   | Create dispute artifact                                                       |
| Test fails (setup/test error)     | **Debug**      | **REQUIRED SUB-SKILL:** `superpowers:systematic-debugging` — fix test, re-run |

**Step 4: Assess severity**
For confirmed findings, evaluate whether the auditor's severity is appropriate. Read [SEVERITY_REFERENCE.md](SEVERITY_REFERENCE.md) for the rubric. **You must pick exactly one of: Critical, High, Medium, Low, Informational.** Hybrid labels (e.g., "Low-Medium") are not allowed — commit to a discrete level. If severity is overstated, flag as **Severity Overstated**.

**Step 5: Assign confidence scores**

Assign two confidence dimensions for each finding:

**Validity confidence** (is this finding real?):

- **High**: PoC test clearly passes/fails as expected, code path matches the finding exactly, no ambiguity in setup or interpretation
- **Medium**: PoC test result is clear but setup required assumptions, or the code path is close but not an exact match to the finding's description
- **Low**: PoC test is inconclusive, the finding's described scenario couldn't be fully reproduced, or the test required significant interpretation of the claim

**Severity confidence** (is the assessed severity correct?):

- **High**: Impact is clearly quantifiable, preconditions are well-understood, severity rubric maps unambiguously
- **Medium**: Impact depends on deployment context or parameter values, or preconditions are partially uncertain
- **Low**: Impact is speculative, multiple severity levels could reasonably apply, or the rubric doesn't cleanly fit

**Step 6: Score finding quality**

For confirmed findings, evaluate the auditor's work product on three quality dimensions. For disputed findings (false positives), the finding score is 0 — skip quality assessment.

**Base score (0-2):**

- **1 point**: Finding is valid (confirmed)
- **+1 point**: Auditor's severity matches assessed severity

**Quality dimensions (each 0-3, bonus = average):**

_Summary Clarity_ — Is the finding's description clear and accurate?

- 0 = Incoherent or misleading | 1 = Vague, requires significant interpretation | 2 = Clear but missing context or ambiguous in places | 3 = Precise, unambiguous, accurately describes the issue

_Reproduction Evidence_ — Can you reproduce the issue from what's provided?

- 0 = No PoC or reproduction guidance | 1 = Prose-only attack scenario, no concrete steps | 2 = Accurate step-by-step reproduction steps, or PoC included but has issues compiling, running, or capturing the issue | 3 = Working executable PoC that reproduces the issue

_Fix Recommendation_ — Is the suggested fix coherent and viable? (Evaluate quality only — do not validate the fix.)

- 0 = No recommendation | 1 = Incoherent or impractical | 2 = Coherent and practical but incomplete or partially inaccurate | 3 = Coherent, practical, accurate, and viable

**Finding score** = base + avg(summary_clarity, reproduction_evidence, fix_recommendation). Range: 0-5.

**Severity weights for final report score:**

| Severity            | Weight |
| ------------------- | ------ |
| Critical            | 8      |
| High                | 4      |
| Medium              | 2      |
| Low / Informational | 0      |

**Step 7: Verify results**
**REQUIRED SUB-SKILL:** `superpowers:verification-before-completion`

- Re-read the original finding
- Confirm the test exercises the exact code path claimed
- Run the test one final time
- Verify test output matches the expected classification

**Step 8: Create and save artifacts to disk**
Save all artifacts to the same directory per finding:

- `./test/audit_review/{finding_id}/POC.{ext}` — PoC test (test runner discovers these)
- `./test/audit_review/{finding_id}/ISSUE.md` or `DISPUTE.md` — markdown artifact

| Classification                  | Artifacts                                                |
| ------------------------------- | -------------------------------------------------------- |
| Confirmed (severity accurate)   | ISSUE.md + PoC test file                                 |
| Confirmed (severity overstated) | ISSUE.md (with severity dispute section) + PoC test file |
| Disputed                        | DISPUTE.md + proof-of-valid-functioning test file        |

### Agent Response Format (Mandatory)

Each agent saves test files and artifacts to disk directly, then returns **ONLY** this compact summary:

```
FINDING: {ID} - {Title}
STATUS: Confirmed | Confirmed (severity overstated) | Disputed
AUDITOR_SEVERITY: {severity}
ASSESSED_SEVERITY: {Critical | High | Medium | Low | Informational}
VALIDITY_CONFIDENCE: High | Medium | Low
SEVERITY_CONFIDENCE: High | Medium | Low
FINDING_SCORE: {0-5}
SUMMARY_CLARITY: {0-3}
REPRODUCTION_EVIDENCE: {0-3}
FIX_RECOMMENDATION: {0-3}
TEST_FILE: {path}
ARTIFACT: {path}
TEST_RESULT: PASS | FAIL
ONE_LINE: {Single sentence summary}
```

For disputed findings, omit `SUMMARY_CLARITY`, `REPRODUCTION_EVIDENCE`, and `FIX_RECOMMENDATION` — the `FINDING_SCORE` is 0.

This prevents context explosion. Agents write to disk, return summaries only.

### After Each Finding

**Step 9: Save artifacts and continue**
Collect the compact summary from the agent. Save artifacts to disk immediately. No approval gate — proceed to the next finding. The final scorecard serves as the review surface.

Dispatch next finding.

---

## Context Budget

One report per session. Batch and compact per Phase 1 rules. Additionally:

- If context pressure is high after a batch, stop and suggest continuing in a new session with remaining findings
- If an agent fails, log the failure summary and continue — do not retry

---

## Multi-Report Workflow

When an audit scope includes multiple reports, process them in separate sessions:

1. Complete one report per session (all phases through scorecard)
2. At session end, output a ready-to-paste command for the next report:
   ```
   Review the smart contract audit report at {next_report_path} against commit {hash}
   ```
3. Each session starts fresh — no dependency on prior session context
4. After all reports are processed, a final session can compare scorecards across reports

---

## Phase 2: Final Scorecard

After all findings are processed, generate the scorecard and save to `./test/audit_review/SCORECARD.md`.

---

## Artifact Templates

See [TEMPLATES.md](TEMPLATES.md) for ISSUE.md, DISPUTE.md, and SCORECARD.md templates. Agents must follow these templates exactly when creating artifacts.

---

## Output Directory Structure

All artifacts live in a single directory tree under the project's test directory. This keeps PoCs discoverable by the test runner and markdown artifacts co-located with the tests they describe.

**During Phase 0**, verify the project's test directory (usually `./test/` — check the build config, e.g. `foundry.toml`, `hardhat.config.*`, `truffle-config.js`, `package.json`). If the project uses a non-standard test directory, adapt accordingly.

```
./test/audit_review/
  SCORECARD.md
  {finding_id}/
    POC.{ext}                     ← test runner discovers these
    ISSUE.md or DISPUTE.md        ← co-located with PoC
```

Benefits:

1. `forge test --match-path "test/audit_review/**"` runs all PoCs without config changes
2. Each finding is self-contained in one directory
3. Single permission grant covers all writes

---

## Common Mistakes

| Mistake                                                  | Consequence                                   | Prevention                                                      |
| -------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Writing a PoC that tests something adjacent to the claim | False confirmation or false dispute           | Re-read finding after writing test; confirm exact code path     |
| Accepting severity without independent assessment        | Missing overstated findings                   | Always read SEVERITY_REFERENCE.md and assess independently      |
| Assigning High confidence without strong evidence        | Misleads reviewers into skipping verification | Confidence must be justified by PoC clarity and code path match |
| Proposing fixes alongside validation                     | Scope creep; fixes may be wrong               | This skill validates only — stop at classification              |
| Skipping low-severity findings                           | Incomplete audit review                       | Every finding gets a PoC regardless of severity                 |
| Debugging the protocol code instead of the test          | Modifying audited code                        | Only debug the PoC test itself; never touch protocol code       |
| Processing multiple reports in one session               | Context exhaustion before completion          | One report per session; use Multi-Report Workflow               |
| Agents returning full code in responses                  | Context overflow; no budget for save steps    | Agents save to disk, return compact summary only                |
| Batching multiple findings per agent                     | Massive result payloads overflow context      | One finding per agent — max 3 agents per parallel batch         |
| Skipping artifact save after finding                     | Zero structured artifacts despite work done   | Agents save directly; verify files exist after each finding     |
| Deleting artifacts on user rejection                     | Lost work that could be refined               | Refine classification based on feedback; never delete           |
| Using logs instead of assertions in PoC tests            | Test appears to pass but proves nothing       | Every test must validate via assertions, never console.log      |

---

## Quality Checklist

Before completing each finding:

- [ ] PoC test exercises the exact code path from the finding
- [ ] Test result matches classification (passes = confirmed, fails = disputed)
- [ ] Severity assessed independently using SEVERITY_REFERENCE.md
- [ ] Artifacts follow templates exactly
- [ ] Confidence scores reflect actual PoC quality — not inflated
- [ ] Quality dimensions scored against rubric with justifications
- [ ] Finding score computed correctly (base + avg of quality dimensions)
- [ ] Verification step completed (test re-run, output captured)

Before completing the review:

- [ ] All findings processed — none skipped
- [ ] SCORECARD.md generated with accurate counts
- [ ] Score calculation table shows correct severity weights and contributions
- [ ] Audit Quality Score computed correctly (sum of contributions)
- [ ] Output directory structure matches specification
