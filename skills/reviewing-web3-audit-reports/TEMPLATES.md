# Artifact Templates

## ISSUE.md (Confirmed findings)

```markdown
# {Finding Title}

**Source:** {Audit Report Name}, Finding {ID}
**Severity:** {Auditor's severity} {→ Assessed: {proposed severity} if overstated}
**Status:** Confirmed
**Validity Confidence:** {High | Medium | Low}
**Severity Confidence:** {High | Medium | Low}

## Description

{Vulnerability description from audit report}

## Impact

{Impact assessment}

## Severity Assessment

{If overstated: rationale with rubric reference from SEVERITY_REFERENCE.md}
{If accurate: brief confirmation}

## Quality Assessment

**Finding Score:** {score}/5

| Dimension             | Score | Notes                 |
| --------------------- | ----- | --------------------- |
| Summary Clarity       | {0-3} | {brief justification} |
| Reproduction Evidence | {0-3} | {brief justification} |
| Fix Recommendation    | {0-3} | {brief justification} |

## Proof of Concept

See `POC.{ext}` in this directory
{Run command for the project's test framework}

## Verification

{Test output evidence}

## Affected Code

- `{file_path}:{line_numbers}` - {brief description}
```

## DISPUTE.md (Disputed findings)

```markdown
# Dispute: {Finding Title}

**Source:** {Audit Report Name}, Finding {ID}
**Claimed Severity:** {Auditor's severity}
**Status:** Disputed
**Validity Confidence:** {High | Medium | Low}
**Finding Score:** 0/5

## Dispute

{Two paragraphs max capturing the flaw in the finding's claim}

## Context

{In-depth explanation including code snippets showing what the finding missed.
Reference specific lines, functions, and invariants that prevent the claimed
vulnerability from manifesting.}

## Proof of Valid Functioning

See `POC.{ext}` in this directory
{Run command showing the test passes, proving correct behavior}

## Affected Code

- `{file_path}:{line_numbers}` - {brief description}
```

## SCORECARD.md

```markdown
# Audit Review Scorecard: {Audit Report Name}

**Commit:** {hash}
**Total Findings:** {N}
**Audit Quality Score: {XX.XX} / 100**

| Category                        | Count | Percentage |
| ------------------------------- | ----- | ---------- |
| Confirmed (severity accurate)   | X     | X%         |
| Confirmed (severity overstated) | X     | X%         |
| Disputed (not confirmed)        | X     | X%         |

## Findings Summary

Sorted: Disputed findings first, then confirmed findings by assessed severity (Critical → Low).

| ID  | Title | Auditor Severity | Status | Assessed Severity | Finding Score | Validity Confidence | Severity Confidence |
| --- | ----- | ---------------- | ------ | ----------------- | ------------- | ------------------- | ------------------- |
| ... | ...   | ...              | ...    | ...               | ...           | ...                 | ...                 |

## Score Calculation

Severity weights: Critical=8, High=4, Medium=2, Low/Info=0.
Formula: finding_contribution = (severity_weight / total_weight) * 100 * (finding_score / 5)

| ID        | Severity Weight | Share of 100 | Finding Score | Contribution      |
| --------- | --------------- | ------------ | ------------- | ----------------- |
| ...       | ...             | ...          | ...           | ...               |
| **Total** | {total_weight}  |              |               | **{final_score}** |
```
