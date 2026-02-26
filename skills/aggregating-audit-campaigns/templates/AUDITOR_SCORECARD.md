# Auditor Scorecard: Cross-Audit Competition Scoring

**Campaigns:** {total_campaigns}
**Unique Issues:** {total_unique_issues}
**Hypothetical Pot:** ${pot_size}
**Scoring Model:** Sherlock/Cantina hybrid — see [SCORING_RULES.md](../SCORING_RULES.md)

---

## Scoring Rules (Quick Reference)

| Component | Formula |
|-----------|---------|
| **Severity** | Critical=20, High=10, Medium=3, Low=1, Info=0.25 |
| **Uniqueness** | `0.9^(n-1) / n` where n = number of auditors who found same bug |
| **Quality** | `quality_score / 5` (default 1.0 if unavailable, noted with *) |
| **Points** | `severity × uniqueness × quality` |
| **Pot share** | `auditor_total / all_totals × pot_size` |

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

## Leaderboard

| Rank | Auditor | Findings | Solo Finds | Critical | High | Med | Low | Info | Total Points | Pot Share ($) | Pot Share (%) |
|------|---------|----------|------------|----------|------|-----|-----|------|-------------|--------------|--------------|
| 1 | {auditor_1_name} | {auditor_1_findings} | {auditor_1_solo} | {auditor_1_crit} | {auditor_1_high} | {auditor_1_med} | {auditor_1_low} | {auditor_1_info} | {auditor_1_points} | ${auditor_1_payout} | {auditor_1_pct}% |
| 2 | {auditor_2_name} | {auditor_2_findings} | {auditor_2_solo} | {auditor_2_crit} | {auditor_2_high} | {auditor_2_med} | {auditor_2_low} | {auditor_2_info} | {auditor_2_points} | ${auditor_2_payout} | {auditor_2_pct}% |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Total** | | **{total_findings_all}** | **{total_solo}** | | | | | | **{total_points}** | **${pot_size}** | **100%** |

---

## Per-Finding Point Allocation

Every calculation shown for verifiability. `points = base_pts × uniq_factor × quality`.

| UID | Title | Sev | Base Pts | n | Uniq Factor | {auditor_1_name} Qual | {auditor_1_name} Pts | {auditor_2_name} Qual | {auditor_2_name} Pts | ... |
|-----|-------|-----|----------|---|-------------|------|------|------|------|-----|
| U01 | {u01_title} | {u01_sev} | {u01_base} | {u01_n} | {u01_uniq} | {u01_a1_qual} | {u01_a1_pts} | -- | -- | |
| U02 | {u02_title} | {u02_sev} | {u02_base} | {u02_n} | {u02_uniq} | -- | -- | {u02_a2_qual} | {u02_a2_pts} | |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | |
| **Totals** | | | | | | | **{a1_total}** | | **{a2_total}** | |

**Notes:**
- `--` = auditor did not find this issue
- `*` after quality score = default (no score available)
- For Informational findings, uniqueness factor is always 1.0

---

## Cross-Dedup Group Detail

For each issue found by multiple auditors, shows how points are split.

### {group_title} (U{NN})

- **Severity:** {severity} ({base_pts} pts)
- **Finders (n={n}):** {finder_list}
- **Uniqueness factor:** 0.9^({n}-1) / {n} = {uniq_factor}

| Auditor | Finding ID | Quality | Points |
|---------|-----------|---------|--------|
| {auditor_a} | {finding_a_id} | {quality_a}/5 | {points_a} |
| {auditor_b} | {finding_b_id} | {quality_b}/5 | {points_b} |

{repeat_for_each_group}

---

## Auditor Overlap Matrix

| | {campaign_1_name} | {campaign_2_name} | {campaign_N_name} |
|---|---|---|---|
| {campaign_1_name} | **{campaign_1_total}** | {overlap_1_2} | {overlap_1_N} |
| {campaign_2_name} | {overlap_2_1} | **{campaign_2_total}** | {overlap_2_N} |
| {campaign_N_name} | {overlap_N_1} | {overlap_N_2} | **{campaign_N_total}** |

---

## Verification

- [ ] Pot shares sum to 100%: {pot_share_sum}%
- [ ] All {total_unique_issues} unique issues accounted for
- [ ] Per-row: `points = base × uniqueness × quality` verified
- [ ] Per-auditor totals match sum of per-finding points
- [ ] Informational findings use uniqueness factor 1.0
