# Scoring Rules

Deterministic competition-style scoring for cross-audit aggregation. Based on Sherlock/Cantina hybrid formulas — severity-weighted, uniqueness-incentivized, quality-adjusted.

Every calculation is transparent and verifiable. Auditors can check the math.

---

## Severity Points

| Severity | Points | Rationale |
|----------|--------|-----------|
| Critical | 20 | Direct fund loss or protocol compromise |
| High | 10 | Significant impact requiring specific conditions |
| Medium | 3 | Limited impact or unlikely conditions |
| Low | 1 | Minor issues, best practices |
| Informational | 0.25 | Code quality, documentation, design suggestions |

Follows Cantina's 20/10/3 nonlinear scale. The exponential ratio reflects the exponential difference in exploit value between severity levels. A single Critical finding is worth more than six Highs — this matches real-world economics where critical vulnerabilities have outsized impact.

**Severity source:** Use the canonical assessed severity from DEDUP_GROUPS.md, not individual auditor assessments. When auditors disagree on severity, the independently-assessed severity from the review process takes precedence.

---

## Uniqueness Premium

Unique discoveries are worth more than shared ones. The formula penalizes redundant findings to incentivize auditors to dig deeper rather than report obvious issues.

### Formula (Sherlock/Cantina)

```
uniqueness_factor(n) = 0.9^(n-1) / n
```

Where `n` = number of auditors who independently found the same bug (after deduplication).

### Reference Table

| Finders (n) | Factor per Auditor | Total Distributed | Explanation |
|-------------|-------------------|-------------------|-------------|
| 1 (solo) | 1.000 | 100% | Full credit — only you found it |
| 2 | 0.450 | 90% | Each gets less than half; 10% "evaporates" |
| 3 | 0.270 | 81% | Each gets ~27%; finding was less unique |
| 4 | 0.182 | 72.9% | Diminishing returns per additional finder |
| 5 | 0.131 | 65.6% | Common finding — minimal per-auditor credit |

**Key insight:** Two auditors sharing a find each earn **less than half** of what a solo finder earns. This incentivizes unique discoveries over obvious-to-everyone findings.

### Informational Exception

Informational findings always use `uniqueness_factor = 1.0` regardless of finder count. Rationale: Info findings are already minimally scored (0.25 points); applying uniqueness penalties would make shared Info findings effectively worth zero, which doesn't reflect the value of consistent code quality observations.

---

## Quality Factor

Quality reflects how well the finding is documented — clear description, working PoC, precise root cause identification, actionable fix recommendation.

### Formula

```
quality_factor = quality_score / 5    (if quality score exists in ISSUE.md)
quality_factor = 1.0                  (default, if no score — noted with * in output)
```

Quality scores come from the `Finding Score: X/5` field in each campaign's ISSUE.md, as assigned during the `reviewing-audit-reports` process.

### Multi-Finder Quality

For issues found by multiple auditors, each auditor uses their **own** quality score. This means the same unique issue can generate different point values for different auditors based on how well each documented it.

**Example:** Auditor A finds bug with quality 5/5 → gets full points. Auditor B finds same bug with quality 3/5 → gets 60% of the points for that finding.

---

## Final Formula

### Per-Finding Points

```
points(issue, auditor) = severity_points × uniqueness_factor(n) × quality_factor(auditor)
```

### Per-Auditor Total

```
total_score(auditor) = Σ points(issue, auditor)  for all issues the auditor found
```

### Pot Share

```
pot_share(auditor) = (total_score(auditor) / Σ total_score(all auditors)) × pot_size
```

### Worked Example

Given: A Critical finding (20 pts) found by 2 auditors. Auditor A has quality 5/5, Auditor B has quality 4/5.

```
Auditor A: 20 × 0.450 × 1.0 = 9.00 points
Auditor B: 20 × 0.450 × 0.8 = 7.20 points
```

Compare to a solo Critical with quality 5/5: `20 × 1.000 × 1.0 = 20.00 points` — more than both shared finders combined.

---

## Edge Cases

| Case | Rule | Rationale |
|------|------|-----------|
| **Severity disagreement** | Use canonical assessed severity from DEDUP_GROUPS.md | Independent assessment prevents inflation |
| **Merged duplicates** | Merger becomes additional finder (n increments) | Cross-campaign duplicates are treated as shared finds |
| **Internal campaign duplicates** | Already collapsed during review; no double credit | Dedup within campaign happens in `reviewing-audit-reports` |
| **Zero confirmed findings** | Score = 0, payout = $0 | No contribution = no reward |
| **Missing quality score** | Default to 1.0, noted with `*` in output | Assume competent quality when score unavailable |
| **Design/mitigated findings** | Scored as Informational (0.25 pts) | Acknowledged but minimal impact |
| **Disputed by one, confirmed by another** | Only the confirmed instance counts | Disputed findings are not valid finds |

---

## Verification Invariants

After computing all scores, verify these properties hold. If any fails, there is a calculation error.

1. **Pot shares sum to 100%** — within rounding tolerance of 0.01%
2. **Every finding appears once per auditor** — no double-counting, no omissions
3. **Per-row verification** — `points = severity_points × uniqueness_factor × quality_factor` for every row
4. **Per-auditor sum** — auditor total = sum of all per-finding points for that auditor
5. **Uniqueness factors use correct n** — n must match the actual finder count in DEDUP_GROUPS.md
6. **Info exception applied** — all Informational findings use factor 1.0

---

## Output Format

The AUDITOR_SCORECARD.md generated in Phase 4 should include:

1. **Scoring rules summary** — link to this file, brief formula recap
2. **Severity grid** — count by severity level (from COVERAGE_GRID.md)
3. **Leaderboard** — auditors ranked by total points:
   ```
   | Rank | Auditor | Findings | Solo Finds | Total Points | Pot Share ($) | Pot Share (%) |
   ```
4. **Per-finding point allocation** — every intermediate calculation:
   ```
   | UID | Title | Sev | Base Pts | n | Uniq Factor | {Auditor1} Qual | {Auditor1} Pts | {Auditor2} Qual | {Auditor2} Pts | ... |
   ```
5. **Cross-dedup group detail** — for multi-finder groups, show the split
6. **Auditor overlap matrix** — NxN shared find counts
