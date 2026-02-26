---
name: aggregating-audit-campaigns
description: >
  Use when combining findings from multiple audit campaigns into a single deduplicated
  coverage grid with competition-style auditor scoring. Creates local artifacts first;
  optionally publishes to GitHub. Consumes artifacts from reviewing-audit-reports sessions.
license: MIT
metadata:
  author: Ammalgam-Protocol
  version: "1.0.0"
---

# Aggregating Audit Campaigns

Multiple audits, one truth. Deduplicate, visualize coverage, score auditors, optionally publish.

This skill is the capstone of the web3-audit-response-toolkit. It consumes the per-campaign artifacts produced by `reviewing-audit-reports` and produces a single deduplicated view across all campaigns with competition-style auditor scoring.

## When to Use

- Combining findings from 2+ audit campaigns into a single view
- Building a cross-auditor coverage grid
- Scoring auditors with competition-style pot-split calculations
- Creating GitHub issues from deduplicated findings

## When NOT to Use

- Reviewing a single audit report (use `reviewing-audit-reports`)
- Implementing fixes for findings (use `resolving-audit-findings`)
- Initial security review without existing reports

## Contents

- [Inputs](#inputs)
- [Phase 0: Campaign Enumeration & Parsing](#phase-0-campaign-enumeration--parsing-subagent)
- [Phase 1: Cross-Campaign Deduplication](#phase-1-cross-campaign-deduplication)
- [Phase 2: Unique Issue Generation](#phase-2-unique-issue-generation)
- [Phase 3: Coverage Grid & Severity Summary](#phase-3-coverage-grid--severity-summary)
- [Phase 4: Auditor Scoring](#phase-4-auditor-scoring-competition-style)
- [Phase 5: GitHub Publication (Optional)](#phase-5-github-publication-optional)
- [Dedup Agent Prompt](DEDUP_PROMPT.md) — per-pair comparison agent
- [Scoring Rules](SCORING_RULES.md) — deterministic competition scoring reference
- [Common Mistakes](#common-mistakes) / [Quality Checklist](#quality-checklist)

---

## Rationalizations (Do Not Skip)

| Rationalization | Why It's Wrong | Required Action |
|----------------|----------------|-----------------|
| "I'll synthesize a summary for the issue body" | Summaries lose auditor precision that developers need | Use original ISSUE.md content verbatim |
| "These two findings look the same" | Same symptom ≠ same bug | Match on root cause + affected function, not symptoms |
| "I'll just include the campaigns I can see" | Missing campaigns invalidate dedup and scoring | Enumerate ALL campaigns; ask user to confirm completeness |
| "I'll skip re-dedup after adding a campaign" | Late duplicates get missed across campaign boundaries | Re-run dedup whenever any campaign is added |
| "I can batch the GitHub ops inline" | GitHub ops are optional and can fail mid-batch | Create ALL local artifacts first; prompt before any GitHub action |
| "The scoring is approximate enough" | Auditors will verify the math and dispute errors | Show every intermediate calculation; verify invariants |

---

## Inputs

| Input | Description |
|-------|-------------|
| **Campaign directories** | Paths to `{test_dir}/audit_review/{report_slug}/` directories from previous review sessions. Minimum 2 required. |
| **Output directory** | Where to write cross-audit artifacts. Default: `{test_dir}/audit_review/cross-audit/` |
| **Hypothetical pot size** | Dollar amount for pot-split calculations. Default: $100,000. |

### Campaign Discovery

Before proceeding, the skill MUST:

1. List all directories matching `{test_dir}/audit_review/*/STATE.md`
2. Present the full list to the user with: campaign name, audited commit, confirmed finding count
3. Ask: **"Are these ALL campaigns? Any in other directories, branches, or worktrees?"**
4. Wait for explicit confirmation before proceeding

**Why this matters:** A whole campaign can be missed because it lives in a different location. Missing campaigns invalidate deduplication and distort scoring.

---

## Phase 0: Campaign Enumeration & Parsing (Subagent)

**Phase 0 runs entirely inside a subagent** to keep the orchestrator's context empty for subsequent phases. The orchestrator dispatches one setup agent and receives back only the path to the initialized STATE.md.

### Setup Agent Instructions

Dispatch a single `general-purpose` agent with this task:

> You are the setup agent for a cross-audit aggregation session. Perform ALL of the following steps, save outputs to disk, and return a 1-line summary.
>
> 1. **Enumerate campaigns** — For each path in `{campaign_paths}`:
>    a. Read `STATE.md` to get campaign name, audited commit, framework, total findings
>    b. Read `SCORECARD.md` to get confirmed/disputed/duplicate counts
>    c. Glob `findings/*/RESULT` to get per-finding status lines
>    d. For each confirmed finding, read `findings/{id}/ISSUE.md` first 10 lines to extract:
>       - Title
>       - Severity (auditor-assessed and independently-assessed)
>       - Affected files and functions
>       - Quality score (from `Finding Score: X/5` field, default 5 if absent)
>
> 2. **Build normalized finding list** — Write to `{output_dir}/cross-audit/PARSED_FINDINGS.md`:
>    ```
>    CAMPAIGN|FINDING_ID|TITLE|SEVERITY|AFFECTED_FILE|AFFECTED_FUNCTION|QUALITY_SCORE|ISSUE_MD_PATH|POC_PATH
>    ```
>    One line per confirmed finding across all campaigns.
>
> 3. **Initialize STATE.md** — Write to `{output_dir}/cross-audit/STATE.md`:
>    ```markdown
>    # Cross-Audit Aggregation State
>
>    ## Campaign Summary
>
>    | Campaign | Findings | Commit |
>    |----------|----------|--------|
>    | {name}   | {count}  | {hash} |
>    ...
>
>    ## Phase Progress
>
>    | Phase | Task | Status | Notes |
>    |-------|------|--------|-------|
>    | 0 | Campaign enumeration | COMPLETE | {N} campaigns, {M} confirmed findings |
>    | 1 | Cross-campaign dedup | PENDING | |
>    | 2 | Unique issue generation | PENDING | |
>    | 3 | Coverage grid | PENDING | |
>    | 4 | Auditor scoring | PENDING | |
>    | 5 | GitHub publication | PENDING | |
>    ```
>
> 4. **Return**: `SETUP_COMPLETE|{state_path}|{total_campaigns}|{total_findings}`

### After Setup Agent Returns

The orchestrator:
1. Parses the 1-line result to extract `state_path`, `total_campaigns`, `total_findings`
2. Reads the initialized STATE.md to confirm campaign list
3. Proceeds to Phase 1

---

## Phase 1: Cross-Campaign Deduplication

### Dedup Algorithm

For each pair of findings **across different campaigns**, compute a match score:

| Signal | Weight | How to Check |
|--------|--------|-------------|
| Same affected function | 40% | Extract function name from `## Affected Code` section of ISSUE.md |
| Same root cause variable | 30% | Extract the variable/expression that causes the bug |
| Same bug type | 20% | Classify: div-by-zero, overflow, access-control, DoS, state-corruption, logic-error |
| Same file | 10% | Compare affected file paths |

**Score thresholds:**
- **>= 90%**: Auto-merge — group findings, log rationale
- **70-89%**: Dispatch dedup agent ([DEDUP_PROMPT.md](DEDUP_PROMPT.md)) for detailed comparison
- **< 70%**: Distinct — no further action

### Critical Rule: Same Symptom ≠ Same Bug

Three div-by-zero bugs in three different functions are **THREE separate bugs**. The dedup algorithm weights *function* (40%) and *root variable* (30%) heavily to prevent symptom-based false merges. Bug *type* alone (20%) is never sufficient for a merge.

### Dedup Agent Dispatch

For candidate pairs (70-89%), dispatch `general-purpose` agents using [DEDUP_PROMPT.md](DEDUP_PROMPT.md) with template variables filled. Agents write results to `{output_dir}/cross-audit/dedup/DEDUP_RESULT_{finding_a}_{finding_b}`.

### Re-Dedup on Campaign Addition

**Whenever a campaign is added after initial dedup**, re-run the full dedup algorithm. This is not optional — late-arriving campaigns routinely surface cross-campaign duplicates that were not visible in the original set.

Steps:
1. Re-read PARSED_FINDINGS.md (now includes new campaign)
2. Run pairwise scoring for all new-campaign findings against all existing findings
3. Dispatch dedup agents for any 70-89% candidates
4. Update DEDUP_GROUPS.md with revised groups

### Cluster Analysis (Verification)

After all pairwise comparisons, group findings by affected contract file and check for missed merges:
1. Group all findings touching the same file
2. Within each group, verify no pairs score >= 70% that were missed
3. For any scores >= 70%, dispatch dedup agent

### Output

Generate `{output_dir}/cross-audit/DEDUP_GROUPS.md`:

```markdown
# Dedup Groups

## Unique Issues: {N}

### Cross-Campaign Groups ({M} groups)

**Group G01: {Title}**
- Canonical severity: {severity}
- Findings: {campaign_a}/{finding_a} + {campaign_b}/{finding_b}
- Rationale: {why these are the same bug}

...

### Solo Findings ({K} findings)

| Campaign | Finding ID | Title | Severity |
|----------|-----------|-------|----------|
| ...      | ...       | ...   | ...      |
```

Update STATE.md Phase 1 status to COMPLETE.

---

## Phase 2: Unique Issue Generation

After dedup, assign unique IDs (U01, U02, ...) to each deduplicated group or solo finding.

### UID Assignment Order

1. **By severity** — Critical first, then High, Medium, Low, Informational
2. **Within severity, by finder count** — More finders first (cross-campaign groups before solo)
3. **Within same finder count** — Alphabetical by title

### For Each Unique Issue

1. **Select primary finding** — The finding with:
   - Most detailed ISSUE.md (longest description)
   - Has a PoC file
   - Highest independent severity assessment
2. **Generate composite ISSUE.md** at `{output_dir}/cross-audit/issues/U{NN}/ISSUE.md`:
   - Title: `U{NN}: {Primary finding title}`
   - All source findings listed under `## Source Findings`
   - Primary ISSUE.md content as the body — **use original auditor text, never synthesize**
   - `## Auditor Descriptions` section with each campaign's description (for multi-finder issues)
   - Severity: Highest assessed severity across all source findings
3. **Copy primary PoC file** to `{output_dir}/cross-audit/issues/U{NN}/POC.{ext}`
4. **Generate ISSUE_MAPPING.sh** — mapping of UIDs to source campaign files:
   ```
   UID|GH_NUM|TYPE|FINDING1_ISSUE|FINDING1_POC|FINDING2_ISSUE|FINDING2_POC|...
   ```
   Where TYPE is `single` (one campaign) or `multi` (cross-campaign group)

Update STATE.md Phase 2 status to COMPLETE.

---

## Phase 3: Coverage Grid & Severity Summary

Build: `{output_dir}/cross-audit/COVERAGE_GRID.md`

### Severity Grid

Count unique issues by severity level:

```markdown
## Severity Distribution

| Severity | Count | % of Total |
|----------|-------|-----------|
| Critical | X | X% |
| High | X | X% |
| Medium | X | X% |
| Low | X | X% |
| Informational | X | X% |
| **Total** | **X** | **100%** |
```

### Coverage Grid

Matrix of unique issues vs. campaigns. Each cell shows the campaign's finding ID if they found it, `--` if not.

```markdown
## Coverage Grid

| # | Title | Sev | {Campaign1} | {Campaign2} | ... |
|---|-------|-----|-------------|-------------|-----|
| U01 | {title} | Crit | {finding_id} | -- | ... |
| U02 | {title} | High | -- | {finding_id} | ... |
```

### Auditor Coverage Overlap Matrix

NxN matrix showing how many findings each pair of auditors share:

```markdown
## Auditor Overlap

| | {Campaign1} | {Campaign2} | ... |
|---|-------------|-------------|-----|
| {Campaign1} | {total} | {shared} | ... |
| {Campaign2} | {shared} | {total} | ... |
```

Diagonal = total findings per campaign. Off-diagonal = shared finds between pairs.

Update STATE.md Phase 3 status to COMPLETE.

---

## Phase 4: Auditor Scoring (Competition-Style)

Apply the formulas from [SCORING_RULES.md](SCORING_RULES.md) to all unique issues. Generate: `{output_dir}/cross-audit/AUDITOR_SCORECARD.md`

### Scorecard Contents

1. **Scoring Rules Summary** — brief inline explanation linking to SCORING_RULES.md
2. **Severity Grid** — same as Phase 3 (included for standalone readability)
3. **Leaderboard** — auditors ranked by total points with pot share:
   ```
   | Rank | Auditor | Findings | Solo | Points | Pot Share |
   ```
4. **Per-Finding Point Allocation** — every intermediate calculation visible:
   ```
   | UID | Title | Sev | Points | n | Uniq Factor | {Auditor1} Qual | {Auditor1} Pts | ... |
   ```
5. **Cross-Dedup Group Detail** — for each multi-finder group, show how points are split
6. **Auditor Overlap Matrix** — same as Phase 3

### Verification

Before declaring Phase 4 complete, verify all invariants from SCORING_RULES.md:
- [ ] Pot shares sum to 100% (within rounding tolerance of 0.01%)
- [ ] Every confirmed finding appears once per auditor who found it
- [ ] `points = severity × uniqueness × quality` is verifiable per row
- [ ] Per-auditor total = sum of per-finding points

Update STATE.md Phase 4 status to COMPLETE.

---

## Phase 5: GitHub Publication (Optional)

**All local artifacts must be complete before this phase.** This phase is always prompted — never automatic.

### Prompt the User

> "All artifacts are ready locally:
> - `COVERAGE_GRID.md` — severity grid + coverage matrix + overlap
> - `AUDITOR_SCORECARD.md` — leaderboard + per-finding points
> - `issues/U{NN}/` — {N} unique issue files
>
> Would you like to publish to GitHub?"
> 1. **Create parent issue + sub-issues** — Full publication with linked sub-issues
> 2. **Create parent issue only** — Summary grid as a single issue
> 3. **Skip** — Keep everything local

### If Option 1: Full Publication

**Required inputs:** `--repo {owner/repo}` and optionally `--parent {issue_number}`

1. **Create parent issue** (if not provided):
   ```bash
   gh issue create --repo {repo} --title "Cross-Audit Aggregation: {N} Unique Issues from {M} Campaigns" \
     --body "{severity_grid + coverage_grid + leaderboard + overlap_matrix + key_insights}"
   ```

2. **Create sub-issues** — dispatch parallel agents (batches of 5):
   For each unique issue U{NN}:
   a. Read `issues/U{NN}/ISSUE.md` for body content
   b. Create issue:
      ```bash
      gh issue create --repo {repo} --title "U{NN}: {title}" --body "{body}" \
        --label "audit-finding,severity: {sev}"
      ```
   c. Link as sub-issue via GraphQL:
      ```graphql
      mutation { addSubIssue(input: { issueId: "{parent_node_id}", subIssueId: "{child_node_id}" }) { ... } }
      ```
   d. Write result: `U{NN}|#{num}|OK`

3. **Update parent issue body** with final coverage grid (including issue links)

4. **Log results** to `{output_dir}/cross-audit/CREATED_ISSUES.md`:
   ```markdown
   | Unique ID | GitHub Issue | Severity |
   |-----------|-------------|----------|
   | U01 | {url} | Critical |
   ```

### If Option 2: Parent Issue Only

Create a single issue with the coverage grid, severity summary, leaderboard, and overlap matrix as the body. No sub-issues.

### If Option 3: Skip

Do nothing. All artifacts remain local.

Update STATE.md Phase 5 status to COMPLETE (or SKIPPED).

---

## Output Directory Structure

```
{output_dir}/cross-audit/
  STATE.md                        ← session state (orchestrator reads/writes)
  PARSED_FINDINGS.md              ← normalized finding list from all campaigns
  DEDUP_GROUPS.md                 ← dedup results with groups and rationale
  COVERAGE_GRID.md                ← severity grid + coverage matrix + overlap
  AUDITOR_SCORECARD.md            ← competition scoring with full calculations
  ISSUE_MAPPING.sh                ← UID → campaign file mapping
  CREATED_ISSUES.md               ← GitHub issue log (only if published)
  dedup/                          ← dedup agent results (intermediate)
    DEDUP_RESULT_{a}_{b}
  issues/
    U{NN}/
      ISSUE.md                    ← composite issue using original auditor text
      POC.{ext}                   ← primary PoC from best source finding
```

---

## Common Mistakes

| Mistake | Prevention |
|---------|-----------|
| Synthesizing issue bodies instead of using originals | ISSUE.md content must be verbatim from the campaign's finding |
| Merging findings with same symptom but different root cause | Weight function (40%) + root variable (30%) heavily; bug type alone is insufficient |
| Missing a campaign in a different directory or worktree | Enumerate ALL campaigns upfront; ask user to confirm completeness |
| Skipping re-dedup when a campaign is added late | Re-run full dedup whenever any campaign is added |
| Running GitHub ops before local artifacts are complete | Create ALL local files first; GitHub is always Phase 5 |
| Approximate or unverifiable scoring calculations | Show every intermediate value; verify invariants before completing |
| Running Phase 0 inline (context explosion) | Phase 0 runs in a subagent; orchestrator stays empty |
| Agents returning full content in responses | Agents save to disk, return 1-line summary only |
| Not reading STATE.md before each phase | Always read STATE.md at the start of each phase |
| Wrong source-to-content mapping in batch operations | Verify source file paths resolve correctly before any batch write |
| Assuming campaign finding IDs map to obvious content | Read and verify — non-obvious ID-to-content mappings cause wrong descriptions |

---

## Quality Checklist

Before completing the aggregation:

- [ ] All campaigns confirmed by user — none missing
- [ ] PARSED_FINDINGS.md includes all confirmed findings from all campaigns
- [ ] DEDUP_GROUPS.md accounts for every finding (grouped or solo)
- [ ] Every raw finding maps to exactly one unique issue
- [ ] No unique issue has zero source findings
- [ ] Unique issue ISSUE.md files use original auditor text (never synthesized)
- [ ] COVERAGE_GRID.md row count matches unique issue count
- [ ] Severity grid percentages sum to 100%
- [ ] Overlap matrix is symmetric and diagonal counts match campaign totals
- [ ] AUDITOR_SCORECARD.md pot shares sum to 100%
- [ ] Per-finding points are verifiable: `severity × uniqueness × quality`
- [ ] Per-auditor totals equal sum of per-finding points
- [ ] STATE.md reflects current phase status for all phases
- [ ] If GitHub publication chosen: all sub-issues linked to parent, CREATED_ISSUES.md complete
