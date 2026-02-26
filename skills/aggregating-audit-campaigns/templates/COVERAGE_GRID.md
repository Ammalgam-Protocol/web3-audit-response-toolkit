# Cross-Audit Coverage Grid

**Campaigns:** {total_campaigns}
**Unique Issues:** {total_unique_issues} (after deduplication from {total_raw_findings} raw findings)

---

## Severity Distribution

| Severity | Count | % of Total |
|----------|-------|-----------|
| Critical | {critical_count} | {critical_pct}% |
| High | {high_count} | {high_pct}% |
| Medium | {medium_count} | {medium_pct}% |
| Low | {low_count} | {low_pct}% |
| Informational | {info_count} | {info_pct}% |
| **Total** | **{total_unique_issues}** | **100%** |

---

## Coverage Grid

Each cell shows the campaign's finding ID if they found the issue, `--` if not.

| # | Title | Sev | {campaign_1_name} | {campaign_2_name} | {campaign_N_name} |
|---|-------|-----|{campaign_1_col}---|{campaign_2_col}---|{campaign_N_col}---|
| U01 | {u01_title} | {u01_sev} | {u01_campaign_1} | {u01_campaign_2} | {u01_campaign_N} |
| U02 | {u02_title} | {u02_sev} | {u02_campaign_1} | {u02_campaign_2} | {u02_campaign_N} |
| ... | ... | ... | ... | ... | ... |

**Legend:**
- Finding ID (e.g., `H-01`, `SAVANT_029`) = campaign found this issue
- `--` = campaign did not find this issue
- Bold finding ID = primary source for the unique issue

---

## Campaign Summary

| Campaign | Audited Commit | Total Confirmed | Solo Finds | Shared Finds |
|----------|---------------|-----------------|------------|--------------|
| {campaign_1_name} | `{campaign_1_commit}` | {campaign_1_total} | {campaign_1_solo} | {campaign_1_shared} |
| {campaign_2_name} | `{campaign_2_commit}` | {campaign_2_total} | {campaign_2_solo} | {campaign_2_shared} |
| ... | ... | ... | ... | ... |

---

## Auditor Coverage Overlap Matrix

Shows how many findings each pair of auditors independently identified.

| | {campaign_1_name} | {campaign_2_name} | {campaign_N_name} |
|---|{campaign_1_col}---|{campaign_2_col}---|{campaign_N_col}---|
| {campaign_1_name} | **{campaign_1_total}** | {overlap_1_2} | {overlap_1_N} |
| {campaign_2_name} | {overlap_2_1} | **{campaign_2_total}** | {overlap_2_N} |
| {campaign_N_name} | {overlap_N_1} | {overlap_N_2} | **{campaign_N_total}** |

- **Diagonal** = total confirmed findings per campaign
- **Off-diagonal** = number of unique issues found by both campaigns
- Matrix is symmetric: `overlap(A,B) = overlap(B,A)`

---

## Key Insights

- {insight_1}
- {insight_2}
- {insight_3}
