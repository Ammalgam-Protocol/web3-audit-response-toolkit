# Deduplication Review Agent Prompt

You are comparing two audit findings to determine if they describe the **same underlying bug**.

## Finding A

- **Campaign:** {campaign_a}
- **ID:** {finding_a_id}
- **Title:** {finding_a_title}
- **File:** {finding_a_file}
- **Function:** {finding_a_function}
- **ISSUE.md path:** {finding_a_issue_path}
- **POC path:** {finding_a_poc_path}

## Finding B

- **Campaign:** {campaign_b}
- **ID:** {finding_b_id}
- **Title:** {finding_b_title}
- **File:** {finding_b_file}
- **Function:** {finding_b_function}
- **ISSUE.md path:** {finding_b_issue_path}
- **POC path:** {finding_b_poc_path}

## Instructions

### Step 1: Read Source Material

Read both ISSUE.md files **completely**. If PoC files exist, read those too. Do not skim — the difference between a duplicate and a distinct finding is often in the details.

### Step 2: Extract Root Cause

For each finding, identify:
- **Root cause**: The actual code defect (not the symptom or impact)
- **Affected function(s)**: The specific function(s) where the bug lives
- **Root variable/expression**: The specific variable or expression that causes the defect
- **Trigger conditions**: What input or state triggers the bug
- **Impact/consequences**: What happens when the bug is triggered
- **Proposed fix**: What code change resolves the issue

### Step 3: Compare

Evaluate on these dimensions:

| Dimension | Same? | Notes |
|-----------|-------|-------|
| Root cause (the actual code defect) | | |
| Affected function(s) | | |
| Root variable/expression | | |
| Trigger conditions | | |
| Impact/consequences | | |
| Proposed fix | | |

### Step 4: Apply the Critical Rule

**Same symptom ≠ same bug.**

Three div-by-zero bugs in three different functions are **THREE separate bugs**, even if they all manifest as division-by-zero errors. The question is: does fixing the bug in one place fix it in the other? If not, they are distinct.

Ask yourself:
- Would a single code change fix both findings?
- Do they share the exact same root cause in the same function?
- Or do they merely share symptoms (same error type, same impact category)?

### Step 5: Classify

- **MERGE**: Same root cause, same function, same fix needed. These are the same bug reported by different auditors. A single code change would resolve both.
- **RELATED**: Same subsystem or same contract file, but different root causes or different functions affected. Keep separate, but note the relationship.
- **DISTINCT**: No meaningful technical relationship beyond surface-level similarity (e.g., both involve the same contract but different functions/variables).

### Step 6: Write Result

Write a single line to `{output_dir}/DEDUP_RESULT`:

```
{finding_a_id}|{finding_b_id}|{MERGE|RELATED|DISTINCT}|{one-line rationale}
```

**Examples:**
```
SAVANT_029|M-04|MERGE|Both describe missing slippage check in swapExactXForY — same function, same root cause, same fix
SAVANT_200|AUDIT-017|RELATED|Both in LiquidityManager but different functions (addLiquidity vs removeLiquidity) — distinct root causes
H-01|V-04|DISTINCT|Both mention reentrancy but in completely different contracts and call paths
```

### Rules

- When in doubt, classify as DISTINCT. False merges lose information; false distinctions are harmless.
- The rationale must reference the specific function and root cause, not just symptoms.
- Do not suggest merging findings that would require two different code changes to fix.
