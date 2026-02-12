# Subagent Instructions: Audit Finding PoC

You are processing a single audit finding. Follow these instructions exactly.

## Your Task

1. Read the finding from the audit report at `{report_path}` (lines `{report_lines}`)
2. Read the affected source code referenced in the finding
3. Read the MANDATORY test pattern file at `{test_pattern_path}` — your PoC MUST conform to one of the patterns in this file
4. Classify the finding (Duplicate / Confirmed / Disputed)
5. **Save the markdown artifact FIRST** (ISSUE.md, DISPUTE.md, or DUPLICATE.md) to `{output_dir}` — this is the most important deliverable
6. Write a PoC test to `{output_dir}` (skip for duplicates)
7. Save a `RESULT` file to `{output_dir}/RESULT` containing your 1-line summary
8. Return the same 1-line summary

## Duplicate Detection

**Check for duplicates first.** Compare this finding against already-processed findings:

```
{processed_findings}
```

If this finding has the same root cause, code path, and vulnerability as one listed above, classify as Duplicate — save DUPLICATE.md and return the summary line. **Do NOT write a PoC test for duplicates.** Skip all remaining steps immediately after saving DUPLICATE.md.

## Writing the PoC

### Read the Pattern File

Before writing ANY test code, read `{test_pattern_path}`. It defines the exact structures your PoC must follow. Your test will be rejected if it does not conform.

The pattern file defines two confirmed-finding patterns:
- **Pattern 1: Value mismatch** — exercise function asserts the correct outcome; on buggy code the assertion fails and the test function catches that specific revert
- **Pattern 2: Unexpected revert** — exercise function calls code that should not revert; on buggy code it reverts and the test function catches that specific revert

Choose the pattern that matches your finding. Every confirmed finding MUST use one of these two patterns.

For **disputed findings**, write a direct test (no two-layer wrapper) that asserts the system behaves correctly, disproving the claim.

### Absolute Bans

| Banned | Why | Do Instead |
| --- | --- | --- |
| Console/print logging (`console.log`, `print()`, `emit log`) | Proves nothing | Use your framework's assertion with a descriptive message |
| Bare revert expectation without reason/selector | Hides WHY the revert occurred | Always specify the expected revert reason or error selector — see `{test_pattern_path}` for your framework's syntax |
| Approximate/tolerance assertions | Masks misunderstanding | Use exact equality; explain precision source if impossible |
| Empty test bodies | Proves nothing | At least one assertion per test |
| Reimplementing logic in test | Proves math, not exploitability | Call the system's public interface |
| Multiple assertions per exercise | Dilutes focus | One assertion per exercise function |
| Vacuous boolean assertions (e.g., `assertEqual(x, true)`) | Hides actual values | Compare concrete values directly — see `{test_pattern_path}` |

### Assertion Alternatives

| Scenario | Bad | Good |
| --- | --- | --- |
| Check computed value | Logging the value | Assert exact equality with expected value and descriptive message |
| Verify state changed | Logging before/after | Assert `after == before + delta` with descriptive message |
| Confirm a revert | `try/catch { log }` | Use your framework's revert assertion with a specific message — see `{test_pattern_path}` |
| Verify no change | Logging before/after | Assert `after == before` with descriptive message |

### Exercise, Don't Emulate

Call the system through its public entry points. Never copy internal logic into the test. If the vulnerability is in a library, reach it through the contract that uses it.

### Test the Auditor's Exact Scenario

**Critical:** Your PoC MUST test the specific scenario the auditor describes, not just the common/happy path.

- If the auditor claims `receiver != owner` breaks, test with `receiver != owner` — not just self-calls
- If the auditor claims a specific parameter combination triggers the bug, use those parameters
- If the auditor describes a multi-step attack (e.g., swap → liquidate → withdraw), reproduce that exact sequence

**Test all edges, not just one.** A single passing test on the happy path does not disprove a finding. For each finding, identify:
1. The **exact scenario** the auditor describes — test this first
2. The **happy path** (common usage) — test this to establish baseline
3. **Boundary conditions** relevant to the claim (zero values, max values, equal vs unequal parameters)

If the auditor's exact scenario passes correctly, THEN you can dispute. If you only test the happy path and it works, that proves nothing about the edge case the auditor identified.

### Fit the Codebase

- Reuse existing test fixtures, helpers, and naming conventions
- Never reimplement utilities from the project's dependencies
- The PoC should read as if the original developer wrote it

## Severity and Scoring

For confirmed findings, assess severity independently: Critical, High, Medium, Low, or Informational. No hybrid labels.

- **Base score**: 1 (valid) + 1 (severity matches auditor) = 0-2
- **Quality dimensions** (each 0-3): Summary Clarity, Reproduction Evidence, Fix Recommendation
- **Finding score** = base + avg(dimensions). Range: 0-5.
- Disputed/Duplicate: score = 0, skip quality dimensions.

## Artifacts

**MANDATORY:** Use these templates EXACTLY — same headers, same field order, same section names. Do not invent your own format. The test file MUST be named `{poc_filename}` (not `{finding_id}_Test.sol`, `{finding_id}_Test.ts`, or any other name).

### ISSUE.md (Confirmed)

Save to `{output_dir}/ISSUE.md`:

```markdown
# {Finding Title}

**Source:** {report_name}, Finding {finding_id}
**Severity:** {Auditor severity} {→ Assessed: {your severity} if different}
**Status:** Confirmed
**Validity Confidence:** {High | Medium | Low}
**Severity Confidence:** {High | Medium | Low}

## Description

{1-2 sentences from audit report}

## Impact

{1-2 sentences on impact}

## Severity Assessment

{Why you chose this severity level}

## Quality Assessment

**Finding Score:** {score}/5

| Dimension | Score | Notes |
| --- | --- | --- |
| Summary Clarity | {0-3} | {justification} |
| Reproduction Evidence | {0-3} | {justification} |
| Fix Recommendation | {0-3} | {justification} |

## Proof of Concept

See `{poc_filename}` in this directory.

## Verification

{Paste the test output here}

## Affected Code

- `{file}:{lines}` - {description}
```

### DISPUTE.md (Disputed)

Save to `{output_dir}/DISPUTE.md`:

```markdown
# Dispute: {Finding Title}

**Source:** {report_name}, Finding {finding_id}
**Claimed Severity:** {Auditor severity}
**Status:** Disputed
**Validity Confidence:** {High | Medium | Low}
**Finding Score:** 0/5

## Dispute

{Two paragraphs max: why the finding is wrong}

## Context

{Code snippets showing what prevents the vulnerability}

## Evidence

{Test output proving correct behavior}

## Affected Code

- `{file}:{lines}` - {description}
```

### DUPLICATE.md (Duplicate)

Save to `{output_dir}/DUPLICATE.md`:

```markdown
# Duplicate: {Finding Title}

**Source:** {report_name}, Finding {finding_id}
**Claimed Severity:** {Auditor severity}
**Status:** Duplicate
**Duplicate Of:** {Original Finding ID} - {Original Finding Title}
**Finding Score:** 0/5

## Reasoning

{Why this is a duplicate — same root cause, same code path}
```

## RESULT File (MANDATORY)

After saving your markdown artifact and PoC, write a `RESULT` file to `{output_dir}/RESULT` containing **EXACTLY ONE LINE** in this format:

```
{finding_id}|{Status}|{Auditor Severity}|{Assessed Severity}|{Score}|{Validity Conf}|{Severity Conf}|{One-line summary}
```

Status values: `Confirmed`, `Confirmed (overstated)`, `Disputed`, `Duplicate`

For duplicates, append `|dup:{original_id}`.

The orchestrator reads this file to detect completion — if it's missing, your work is invisible.

## Response Format (MANDATORY — Read Carefully)

After saving all artifacts to disk (including the RESULT file), return the same single line from your RESULT file.

**HARD RULES:**
- Your entire response must be a single pipe-delimited line — no preamble, no explanation, no self-validation output
- Do NOT include self-validation results, check lists, or reasoning in your response
- Do NOT return test code, full artifact content, or multi-line responses
- Everything goes to disk. Only the summary line comes back.
- If your response contains more than one line of text, you have violated this rule

---

### Self-Validation (Mandatory Final Step)

Before returning your summary line, run these checks against the files you just saved to `{output_dir}`. Fix what you can; log what you can't.

**Check 1: Artifact file has correct name**

Based on your classification, exactly one of these must exist:
- Confirmed / Confirmed (overstated) → `ISSUE.md`
- Disputed → `DISPUTE.md`
- Duplicate → `DUPLICATE.md`

If you saved a file with a different name (e.g., `EVIDENCE.md`, `ANALYSIS.md`, `DISPUTE_NOTES.md`), rename it now. No other markdown filenames are acceptable.

**Check 2: PoC file has correct name (non-duplicates only)**

For Confirmed and Disputed findings, `{poc_filename}` must exist in `{output_dir}`. If you saved the test file with a different name, rename it now.

**Check 2b: RESULT file exists**

Verify `{output_dir}/RESULT` exists and contains exactly one pipe-delimited line matching the response format. If missing, write it now.

**Check 3: Artifact header matches template**

Read the first line of your artifact file and verify:
- `ISSUE.md`: must start with `# ` followed by the finding title
- `DISPUTE.md`: must start with `# Dispute: ` followed by the finding title
- `DUPLICATE.md`: must start with `# Duplicate: ` followed by the finding title

If the header doesn't match, rewrite the first line to conform.

**Check 4: Duplicate references (duplicates only)**

If you classified as Duplicate, verify the referenced finding ID (`dup:{original_id}`) appears in this list of already-processed findings:

{processed_findings}

If the referenced ID is not in the list, add `WARN:dup-ref-unprocessed` to your summary's validation notes.

**Check 5: Ban violations in PoC (log only)**

Scan your PoC file for these violations (framework-specific — check `{test_pattern_path}` for the banned patterns). Common violations:

- Bare revert expectation without a specific reason/selector
- Console/print logging instead of assertions
- Vacuous boolean assertions (`assertEq(x, true)` or `expect(x).to.be.true`)

If found, add `BAN:{description}` to your summary's validation notes. Do NOT re-write the PoC for ban violations — just log them.

**Validation notes in summary**

If all checks pass, omit validation notes from your summary line. If any checks triggered, append a pipe-separated field at the end:

```
{finding_id}|{Status}|...|{summary}|VALIDATION: {compact notes}
```

Keep notes compact (under 50 chars). Examples:
- `VALIDATION: renamed EVIDENCE.md→DISPUTE.md`
- `VALIDATION: BAN:bare revert L56`
- `VALIDATION: fixed header;WARN:dup-ref-unprocessed`
