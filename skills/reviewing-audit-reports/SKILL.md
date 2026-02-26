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
  version: "1.1.0"
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
| "I'll run Phase 0 inline to keep it simple"         | Phase 0 reads 100KB+ reports + codebase | Phase 0 runs in a subagent; orchestrator starts empty |
| "The happy path works, so the finding is wrong"     | Edge cases are where bugs hide          | Test the auditor's exact scenario, then all edges     |
| "It's not a real bug, so I'll just dispute it"      | Code quality issues deserve recognition | Use Confirmed (Informational) — see SEVERITY_REFERENCE |

---

## Inputs

| Input                 | Description                                                                            |
| --------------------- | -------------------------------------------------------------------------------------- |
| **Audit report path** | Path to the audit report file. Required — ask if not provided.                         |
| **Commit hash**       | The git commit the audit was performed against. Infer from report; ask only if absent. |
| **Report slug**       | Compact directory name: `{description}-{commit_hash}`. Derived from report filename and audited commit. Examples: `savant-ai-scan-1eb2f41d`, `chainsecurity-manual-e53b22fc`, `cantina-competition-a3f9c01b`. |

---

## Scope

Process **all findings** in the report. One report per session.

| Parameter           | Default     | Description                      |
| ------------------- | ----------- | -------------------------------- |
| **Severity filter** | Two highest | Which severity levels to include |
| **Selection**       | Sequential  | Processing order                 |

---

## Phase 0: Setup (Subagent)

**Phase 0 runs entirely inside a subagent** to keep the orchestrator's context empty for Phase 1 dispatch. The orchestrator dispatches one setup agent and receives back only the path to the initialized STATE.md.

### Setup Agent Instructions

Dispatch a single `general-purpose` agent with this task:

> You are the setup agent for an audit review session. Perform ALL of the following steps, save outputs to disk, and return a 1-line summary.
>
> 1. **Checkout audited commit**: `git stash && git checkout {commit_hash}`
> 2. **Read the full audit report** at `{report_path}`
> 3. **Discover the testing stack** — detect framework, existing test patterns, shared fixtures, build commands. Dispatch up to **2 Explore agents in parallel**: one for source structure + contract architecture, one for test stack + existing fixtures.
> 4. **Select the test pattern file and PoC filename** — match the project's framework:
>    - Foundry/Forge → `test_patterns/foundry.sol`, PoC filename: `POC.sol`
>    - Hardhat → `test_patterns/hardhat.ts`, PoC filename: `POC.ts`
>    - Ape/Brownie → `test_patterns/ape.py`, PoC filename: `POC.py`
> 5. **Verify the test directory** — check build config for where tests live
> 6. **Create finding list** with line offsets for the report file:
>
>    | ID  | Title | Severity | Validity | Affected File(s) | Report Lines  |
>    | --- | ----- | -------- | -------- | ---------------- | ------------- |
>    | ... | ...   | ...      | ...      | ...              | {start}-{end} |
>
> 7. **Derive report slug** — compact directory name from report filename and commit hash: `{description}-{commit_hash}` (e.g., `savant-ai-scan-1eb2f41d`)
> 8. **Create output directory** `{test_dir}/audit_review/{report_slug}/findings/`
> 9. **Initialize STATE.md** — write to `{test_dir}/audit_review/{report_slug}/STATE.md` using the [State Protocol](#state-protocol) format
> 10. **Return** a single line: `SETUP_COMPLETE|{state_md_path}|{framework}|{test_pattern_path}|{poc_filename}|{total_findings}|{report_slug}`

### After Setup Agent Returns

The orchestrator:
1. Parses the 1-line result to extract `state_md_path`, `framework`, `test_pattern_path`, `poc_filename`, `total_findings`, `report_slug`
2. Requests write permissions for `{test_dir}/audit_review/{report_slug}/`
3. Proceeds directly to Phase 1 — **do not re-read the audit report or explore the codebase**

---

## Phase 1: Dispatch and Track

### State Protocol

All session state lives on disk in `{test_dir}/audit_review/{report_slug}/STATE.md`. The orchestrator reads this file at the start of each batch cycle. This keeps orchestrator context flat regardless of how many findings are processed.

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

| ID  | Title | Severity | Validity | Report Lines |
| --- | ----- | -------- | -------- | ------------ |
| ... | ...   | ...      | ...      | ...          |
```

### Dispatch Loop — Background Agents with Disk-Based State

All 3 agents run in **background**. The orchestrator detects completion by reading `RESULT` files from disk — never by calling `TaskOutput` (which dumps agent transcripts into orchestrator context, causing context explosion).

#### Dispatch Cycle

1. **Read STATE.md** — get the current processed/remaining state
2. **Count existing RESULT files** — run `ls findings/*/RESULT 2>/dev/null | wc -l` to establish baseline count before this batch
3. **Mark IN_PROGRESS** — for up to 3 findings from Remaining (respecting grouping rules), move them from the Remaining table to the Processed section with status `IN_PROGRESS`:
   ```
   {ID}|IN_PROGRESS|||||||dispatched
   ```
4. **Dispatch all 3 agents in background** (`run_in_background: true`) — construct each prompt from [SUBAGENT_PROMPT.md](SUBAGENT_PROMPT.md) with template variables:
   - `{test_pattern_path}` → absolute path to the framework's test pattern file
   - `{severity_reference_path}` → absolute path to SEVERITY_REFERENCE.md
   - `{output_dir}` → `{test_dir}/audit_review/{report_slug}/findings/{finding_id}/`
   - `{report_path}` → path to audit report
   - `{report_lines}` → line range for this finding
   - `{finding_id}` → the finding's ID
   - `{report_name}` → name of the audit report
   - `{poc_filename}` → PoC test filename for the detected framework (`POC.sol`, `POC.ts`, or `POC.py`)
   - `{processed_findings}` → pipe-delimited lines from STATE.md (for duplicate detection)
5. **Launch a background file watcher** (`run_in_background: true`) — a single Bash command that exits when 2+ new RESULT files appear:
   ```bash
   target=$((existing + 2))
   while true; do
     current=$(ls findings/*/RESULT 2>/dev/null | wc -l)
     if [ "$current" -ge "$target" ]; then
       echo "READY: $current results (target was $target)"
       break
     fi
     sleep 30
   done
   ```
   Replace `existing` with the actual baseline count. This needs **one** approval per batch, then runs silently.
6. **Do bookkeeping while waiting** — prepare next batch's prompts from STATE.md, pre-create output directories with `mkdir -p`
7. **Wait for watcher** — call `TaskOutput(watcher_task_id, block=true, timeout=600000)`. This blocks until 2+ agents complete. **No approval needed.**
8. **Read new RESULT files** — Glob `findings/*/RESULT`, read each new one, match against IN_PROGRESS entries
9. **Update STATE.md** — replace IN_PROGRESS lines with results, update Processed/Remaining counters
10. **Refill and repeat** — dispatch next batch to refill slots to 3

#### Why This Architecture

| Problem | Old Approach | New Approach |
|---|---|---|
| Context explosion | `TaskOutput` dumps full agent transcripts (compilation logs, bash progress) into orchestrator | Orchestrator reads 1-line RESULT files from disk |
| Idle waiting | Fixed batches wait for slowest agent | Refill at 2/3 completion keeps slots occupied |
| State loss on crash | Agent results only in memory until STATE.md update | RESULT files persist on disk immediately |
| Concurrent writes | N/A | Each agent writes to its own `findings/{id}/RESULT` — no contention |
| Approval-gated polling | Foreground `sleep && ls` needs per-command approval (10-15 per batch) | Single background watcher per batch (1 approval), checked via TaskOutput (0 approvals) |

#### Background File Watcher

Instead of foreground polling (which requires per-poll approval and inflates context), use a **single background bash command** per batch cycle. Launch it with `run_in_background: true` immediately after dispatching agents. Check with `TaskOutput` (no approval needed) after doing bookkeeping.

**Never use foreground `sleep` commands for polling.** Each foreground sleep requires manual approval and adds messages to context. The background watcher is invisible to both.

### Grouping Rules

- Findings touching the **same file** go in **different dispatch slots** (avoid conflicting writes)
- Findings touching **different files** can share concurrent slots
- Never exceed **3 concurrent agents**

### Post-Batch Validation

After collecting RESULT files for each batch, verify artifact completeness on disk:

| Classification | Required Files |
|---|---|
| Confirmed / Confirmed (overstated) | `RESULT` AND `ISSUE.md` AND `POC.{ext}` |
| Disputed | `RESULT` AND `DISPUTE.md` AND `POC.{ext}` |
| Duplicate | `RESULT` AND `DUPLICATE.md` only (no PoC needed) |

**Validation order:** Check `RESULT` first (agent completed), then markdown artifact (most important deliverable), then PoC file. Subagents are instructed to write markdown before PoC, so a missing PoC with a present ISSUE.md/DISPUTE.md is more recoverable than the reverse.

For any missing artifact, append `MISSING:{filename}` to the finding's result line in STATE.md. If more than 2 findings in a batch have missing artifacts, investigate whether the subagent prompt template variables were filled correctly before continuing.

### Context Management

- The orchestrator's context stays flat: it only holds STATE.md contents + the current batch's 1-line results
- Agent results are 1-line summaries — full artifacts are on disk
- If context pressure grows, stop and suggest continuing in a new session with the remaining STATE.md
- If an agent fails, log the failure in STATE.md and continue — do not retry

---

## Phase 2: Final Scorecard

After all findings are processed, generate `{test_dir}/audit_review/{report_slug}/SCORECARD.md`.

Read all result lines from STATE.md. For confirmed findings, read the ISSUE.md to get quality dimension scores.

**Self-identified invalid findings:** If the audit report includes auditor validity labels (e.g., `Validity: Invalid`), findings the auditor self-identified as invalid are **excluded from the quality score** and listed in a separate section. These represent correct self-assessment and should not penalize audit quality. Add a `Self-identified invalid (correct)` row to the category table with the count, split the findings summary into scored and self-identified sections, and compute the score over only the scored findings.

**Scorecard structure:**

```markdown
# Audit Review Scorecard: {Report Name}

**Commit:** {hash}
**Total Findings:** {N} ({scored} scored, {self_invalid} self-identified invalid)
**Audit Quality Score: {XX.XX} / 100** (scored findings only)

| Category                        | Count | Percentage |
| ------------------------------- | ----- | ---------- |
| Confirmed (severity accurate)   | X     | X%         |
| Confirmed (severity overstated) | X     | X%         |
| Disputed                        | X     | X%         |
| Duplicate                       | X     | X%         |
| Self-identified invalid (correct)| X     | —          |

## Scored Findings Summary

Sorted: Disputed first, then confirmed by assessed severity (Critical → Low).
Only includes findings the auditor did not self-identify as invalid.

| ID  | Title | Auditor Severity | Status | Assessed Severity | Finding Score | Validity Confidence | Severity Confidence |
| --- | ----- | ---------------- | ------ | ----------------- | ------------- | ------------------- | ------------------- |
| ... | ...   | ...              | ...    | ...               | ...           | ...                 | ...                 |

## Score Calculation

Severity weights: Critical=8, High=4, Medium=2, Low=1, Info=0.
Weight = max(auditor severity weight, assessed severity weight).
Formula: contribution = (weight / total_weight) × 100 × (score / 5)
Only scored findings are included — self-identified invalid findings are excluded.

| ID        | Severity Weight | Share of 100 | Finding Score | Contribution |
| --------- | --------------- | ------------ | ------------- | ------------ |
| ...       | ...             | ...          | ...           | ...          |
| **Total** | {total}         |              |               | **{final}**  |
```

---

## Output Directory Structure

```
{test_dir}/audit_review/
  {report_slug}/                    ← one directory per report (e.g., savant-ai-scan-1eb2f41d/)
    STATE.md                        ← session state (orchestrator reads/writes)
    SCORECARD.md                    ← final scorecard (Phase 2)
    findings/
      {finding_id}/
        RESULT                      ← 1-line completion signal (agent writes, orchestrator reads)
        POC.{ext}                   ← confirmed AND disputed findings (NOT duplicates)
        ISSUE.md                    ← confirmed findings
        DISPUTE.md                  ← disputed findings
        DUPLICATE.md                ← duplicate findings (no POC needed)
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
| Running Phase 0 inline (context explosion)           | Phase 0 runs in a subagent; orchestrator stays empty |
| Agents returning self-validation in response         | SUBAGENT_PROMPT enforces 1-line; validate on disk    |
| Missing markdown artifacts after agent completes     | Post-batch validation checks files exist on disk     |
| Duplicate findings writing unnecessary PoC tests     | SUBAGENT_PROMPT says "skip all remaining steps"      |
| Calling TaskOutput to check agent status             | Read RESULT files from disk — TaskOutput dumps full transcripts into context |
| Using foreground sleep+poll for RESULT detection     | Launch a single background file watcher per batch; foreground polling requires per-command approval and inflates context |
| Testing only the happy path                          | SUBAGENT_PROMPT requires testing auditor's exact scenario + all edges |
| Disputing code quality issues as false positives     | Use Confirmed (Informational) for real quality issues with no security impact |

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
