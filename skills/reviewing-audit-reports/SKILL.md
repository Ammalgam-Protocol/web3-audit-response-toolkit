---
name: reviewing-audit-reports
description: >
  Validates smart contract audit report findings by creating PoC tests that confirm or dispute
  each claimed vulnerability. Produces structured artifacts per finding — ISSUE.md with PoC test
  for confirmed vulnerabilities, DISPUTE.md for false positives, DUPLICATE.md for duplicates —
  and a final scorecard grading the audit. Triggers on smart contract audit report review,
  finding triage, PoC creation, severity assessment, or audit dispute.
license: MIT
metadata:
  author: Ammalgam-Protocol
  version: "1.0.0"
---

# Reviewing Web3 Audit Reports

Every finding gets a PoC test. The test determines truth, not the auditor's claims.

This skill orchestrates auditing review sessions. Subagents do the per-finding work — the orchestrator sets up, dispatches, tracks state, and generates the final scorecard.

## When to Use

- Reviewing a smart contract audit report against the audited codebase
- Creating PoC tests for smart contract audit findings
- Producing a scorecard grading audit accuracy

## When NOT to Use

- Implementing fixes for findings (use `resolving-audit-findings`)
- Initial security review without an existing report (use `differential-review`)
- Code quality or gas optimization review

## Contents

- [Inputs](#inputs) / [Scope](#scope)
- [Phase 0: Setup](#phase-0-setup)
- [Phase 1: Dispatch and Track](#phase-1-dispatch-and-track) — batching, STATE.md protocol
- [Phase 2: Final Scorecard](#phase-2-final-scorecard)
- [Subagent Prompt](SUBAGENT_PROMPT.md) — passed verbatim to each agent
- [Test Patterns](test_patterns/) — canonical PoC structures per framework
- [Severity Reference](SEVERITY_REFERENCE.md)
- [Common Mistakes](#common-mistakes) / [Quality Checklist](#quality-checklist)

---

## Rationalizations (Do Not Skip)

| Rationalization                                     | Why It's Wrong                         | Required Action                                      |
| --------------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| "The auditor is reputable, so the finding is valid" | Reputation ≠ correctness               | Write a PoC — let code decide                        |
| "I'll accept the severity as stated"                | Auditors inflate severity              | Assess independently using rubric                    |
| "The test is too hard to write"                     | Hard-to-test claims are often wrong    | Simplify setup; flag for manual review if impossible |
| "I already know this is valid/invalid"              | Prior belief is not evidence           | Write the test regardless                            |
| "I'll batch the artifacts and present later"        | Artifacts may be lost if session fails | Save to disk immediately                             |
| "The agent can return the full test code"           | Full code causes context explosion     | Agents save to disk, return 1-line summary only      |

---

## Inputs

| Input                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Audit report path** | Path to the audit report file. Required — ask if not provided.                         |
| **Commit hash**       | The git commit the audit was performed against. Infer from report; ask only if absent. |

---

## Scope

Process **all findings** in the report. One report per session.

| Parameter           | Default     | Description                      |
| ------------------- | ----------- | -------------------------------- |
| **Severity filter** | Two highest | Which severity levels to include |
| **Selection**       | Sequential  | Processing order                 |

---

## Phase 0: Setup

1. **Checkout audited commit**: `git stash && git checkout {commit_hash}`
2. **Read the full audit report**
3. **Discover the testing stack** — detect framework, existing test patterns, shared fixtures, build commands
4. **Select the test pattern file and PoC filename** — match the project's framework:
   - Foundry/Forge → `test_patterns/foundry.sol`, PoC filename: `POC.sol`
   - Hardhat → `test_patterns/hardhat.ts`, PoC filename: `POC.ts`
   - Ape/Brownie → `test_patterns/ape.py`, PoC filename: `POC.py`
5. **Verify the test directory** — check build config for where tests live
6. **Create finding list** with line offsets for the report file:

   | ID  | Title | Severity | Affected File(s) | Report Lines  |
   | --- | ----- | -------- | ---------------- | ------------- |
   | ... | ...   | ...      | ...              | {start}-{end} |

7. **Request write permissions** — blanket access to `{test_dir}/audit_review/`
8. **Initialize STATE.md** — see [State Protocol](#state-protocol)

---

## Phase 1: Dispatch and Track

### State Protocol

All session state lives on disk in `{test_dir}/audit_review/STATE.md`. The orchestrator reads this file at the start of each batch cycle. This keeps orchestrator context flat regardless of how many findings are processed.

**STATE.md format:**

```markdown
# Session State

**Report:** {report_path}
**Commit:** {hash}
**Test Pattern:** {test_pattern_path}
**Framework:** {Foundry | Hardhat | Ape}
**Total Findings:** {N}
**Processed:** {count}
**Remaining:** {count}

## Processed Findings

{ID}|{Status}|{Auditor Severity}|{Assessed Severity}|{Score}|{Validity Conf}|{Severity Conf}|{Summary}[|{validation notes if any}]
...

## Remaining Findings

| ID  | Title | Severity | Report Lines |
| --- | ----- | -------- | ------------ |
| ... | ...   | ...      | ...          |
```

### Dispatch Loop — Rolling Pool

Maintain a **rolling pool of up to 3 concurrent agents**. Instead of dispatching fixed batches and waiting for all 3 to finish, dispatch replacements as agents complete:

1. **Read STATE.md** — get the current processed/remaining state
2. **Fill the pool to 3** — dispatch agents for findings from Remaining (respecting grouping rules), constructing each prompt from [SUBAGENT_PROMPT.md](SUBAGENT_PROMPT.md) with template variables:
   - `{test_pattern_path}` → absolute path to the framework's test pattern file
   - `{output_dir}` → `{test_dir}/audit_review/{finding_id}/`
   - `{report_path}` → path to audit report
   - `{report_lines}` → line range for this finding
   - `{finding_id}` → the finding's ID
   - `{report_name}` → name of the audit report
   - `{poc_filename}` → PoC test filename for the detected framework (`POC.sol`, `POC.ts`, or `POC.py`)
   - `{processed_findings}` → pipe-delimited lines from STATE.md (for duplicate detection)
3. **When any agent completes** — collect its 1-line result, update STATE.md immediately, then dispatch the next finding to refill the pool
4. **Repeat** until Remaining is empty and all agents have returned

**Why rolling, not fixed batches:** A single complex finding (e.g., integration test with full complex setup) can take 6+ minutes while simpler library-level tests finish in 90 seconds. Fixed batches force the orchestrator to idle until the slowest agent completes. Rolling dispatch keeps all 3 slots occupied.

**Practical implementation:** If the orchestrator's tooling doesn't support waiting on individual agents (e.g., only blocking `TaskOutput` calls), fall back to fixed batches of 3 — but when a batch completes with mixed timing, note which findings were slow and avoid grouping multiple slow-looking findings (integration tests, liquidation flows) in the same batch.

### Grouping Rules

- Findings touching the **same file** go in **different dispatch slots** (avoid conflicting writes)
- Findings touching **different files** can share concurrent slots
- Never exceed **3 concurrent agents**

### Context Management

- The orchestrator's context stays flat: it only holds STATE.md contents + the current batch's 1-line results
- Agent results are 1-line summaries — full artifacts are on disk
- If context pressure grows, stop and suggest continuing in a new session with the remaining STATE.md
- If an agent fails, log the failure in STATE.md and continue — do not retry

---

## Phase 2: Final Scorecard

After all findings are processed, generate `{test_dir}/audit_review/SCORECARD.md`.

Read all result lines from STATE.md. For confirmed findings, read the ISSUE.md to get quality dimension scores.

**Scorecard structure:**

```markdown
# Audit Review Scorecard: {Report Name}

**Commit:** {hash}
**Total Findings:** {N}
**Audit Quality Score: {XX.XX} / 100**

| Category                        | Count | Percentage |
| ------------------------------- | ----- | ---------- |
| Confirmed (severity accurate)   | X     | X%         |
| Confirmed (severity overstated) | X     | X%         |
| Disputed                        | X     | X%         |
| Duplicate                       | X     | X%         |

## Findings Summary

Sorted: Disputed first, then confirmed by assessed severity (Critical → Low).

| ID  | Title | Auditor Severity | Status | Assessed Severity | Finding Score | Validity Confidence | Severity Confidence |
| --- | ----- | ---------------- | ------ | ----------------- | ------------- | ------------------- | ------------------- |
| ... | ...   | ...              | ...    | ...               | ...           | ...                 | ...                 |

## Score Calculation

Severity weights: Critical=8, High=4, Medium=2, Low=1, Info=0.
Weight = max(auditor severity weight, assessed severity weight).
Formula: contribution = (weight / total_weight) _ 100 _ (score / 5)

| ID        | Severity Weight | Share of 100 | Finding Score | Contribution |
| --------- | --------------- | ------------ | ------------- | ------------ |
| ...       | ...             | ...          | ...           | ...          |
| **Total** | {total}         |              |               | **{final}**  |
```

---

## Output Directory Structure

```
{test_dir}/audit_review/
  STATE.md                        ← session state (orchestrator reads/writes)
  SCORECARD.md                    ← final scorecard (Phase 2)
  {finding_id}/
    POC.{ext}                     ← confirmed findings only
    ISSUE.md                      ← confirmed findings
    DISPUTE.md                    ← disputed findings
    DUPLICATE.md                  ← duplicate findings
```

---

## Common Mistakes

| Mistake                                              | Prevention                                           |
| ---------------------------------------------------- | ---------------------------------------------------- |
| Not reading STATE.md each iteration                  | Always read STATE.md before dispatching              |
| Keeping agent results in orchestrator memory         | Append to STATE.md, discard from context             |
| Processing multiple reports in one session           | One report per session                               |
| Agents returning full code in responses              | Agents save to disk, return 1-line summary           |
| Batching multiple findings per agent                 | One finding per agent                                |
| Not filling template variables in SUBAGENT_PROMPT.md | Check all `{variables}` are resolved before dispatch |
| Skipping duplicate detection context                 | Always pass processed findings to agents             |

---

## Quality Checklist

Before completing the review:

- [ ] STATE.md reflects all findings processed
- [ ] All findings processed — none skipped
- [ ] Each finding directory has the correct artifact (ISSUE.md, DISPUTE.md, or DUPLICATE.md)
- [ ] Confirmed findings have POC.{ext} files
- [ ] SCORECARD.md generated with accurate counts
- [ ] Score calculations use correct severity weights
- [ ] Audit Quality Score computed correctly
- [ ] All agent summaries include self-validation results (no agents skipped it)
- [ ] No agents reported artifact naming fixes (if any did, investigate prompt clarity)
- [ ] Ban violations reviewed (acceptable or noted for skill improvement)
