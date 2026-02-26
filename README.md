# Web3 Audit Response Toolkit

A set of skills for the full audit response lifecycle: **review** findings with PoC tests, **resolve** confirmed vulnerabilities using TDD, and **aggregate** multiple campaigns into a deduplicated view with competition-style scoring.

| Skill | Purpose | Trigger |
|-------|---------|---------|
| `reviewing-audit-reports` | Validate findings, produce ISSUE.md/DISPUTE.md + PoC, grade audit | "Review the audit report..." |
| `resolving-audit-findings` | Convert PoC to regression test, fix the bug via RED/GREEN/REFACTOR | "Fix finding CS-AMMALGAM-002..." |
| `aggregating-audit-campaigns` | Deduplicate across campaigns, build coverage grid, score auditors | "Aggregate findings from all audit campaigns..." |

### Pipeline

```
reviewing-audit-reports → aggregating-audit-campaigns → resolving-audit-findings
```

The review skill processes one report at a time. Run it for each campaign, then use the aggregation skill to deduplicate, score, and prioritize. Finally, use the resolve skill to fix findings one at a time using TDD — it accepts both per-campaign findings and aggregated unique issues (`U{NN}`).

## Install

```bash
# Add the marketplace
/plugin marketplace add Ammalgam-Protocol/web3-audit-response-toolkit

# Install the plugin (gets all skills)
/plugin install web3-audit-response-toolkit@web3-audit-response-toolkit
```

## Usage

### Reviewing: Validate Findings

```
Review the smart contract audit report at ./audits/report.pdf against commit abc1234
```

The review skill validates every finding with a PoC test, classifies each as Confirmed or Disputed, assesses severity independently, and produces a scorecard grading audit quality.

**Output:**
```
test/audit_review/
  SCORECARD.md
  {finding_id}/
    POC.sol              # Two-layer PoC (passes on vulnerable code)
    ISSUE.md or DISPUTE.md
```

### Resolving: Fix Confirmed Findings

```
Fix finding CS-AMMALGAM-002 using the PoC in test/audit_review/CS-AMMALGAM-002/
```

The resolve skill picks up where review leaves off. It converts the two-layer PoC into a failing regression test (RED), implements the minimal fix (GREEN), refactors if needed, and creates a structured bugfix branch with separate commits for fix and cleanup.

**Workflow:**
1. Read ISSUE.md + PoC, verify bug still exists
2. Plan the fix (user approval checkpoint)
3. RED: Convert two-layer PoC → single-layer test (test FAILS)
4. GREEN: Implement fix (test PASSES, full suite passes)
5. REFACTOR: Clean up (optional, user approval)
6. Branch + commit (separate fix and refactor commits)
7. GitHub issue + PR (optional, user approval)
8. CI monitoring

### Aggregating: Cross-Campaign Analysis

```
Aggregate findings from all audit campaigns in test/audit_review/
```

After reviewing multiple reports, the aggregation skill combines all confirmed findings into a single deduplicated set. It builds a coverage grid showing which auditors found what, scores auditors using competition-style formulas (severity x uniqueness x quality), and optionally publishes everything to GitHub as linked sub-issues.

**Output:**
```
test/audit_review/cross-audit/
  COVERAGE_GRID.md           # Severity grid + NxM coverage matrix + overlap
  AUDITOR_SCORECARD.md       # Leaderboard + per-finding point allocation
  DEDUP_GROUPS.md            # Cross-campaign duplicate groups with rationale
  issues/U{NN}/ISSUE.md      # Deduplicated unique issues
```

**Key features:**
- **Root-cause deduplication** — matches on affected function + root variable, not symptoms
- **Competition scoring** — Sherlock/Cantina hybrid: `points = severity x uniqueness_factor(n) x quality`
- **Local-first** — all artifacts are files on disk; GitHub publication is optional and prompted
- **Re-dedup on addition** — re-runs full dedup whenever a campaign is added

## The Two-Layer Bridge

The two-layer test pattern connects the skills. During review, the `vm.expectRevert` wrapper makes the PoC pass on buggy code. During resolution, removing that wrapper converts it to a failing test — the RED step that starts TDD.

```solidity
// REVIEW output: passes on vulnerable code
function testValidateFinding() public {
    vm.expectRevert("...");     // ← remove this wrapper
    exerciseValidateFinding();  // ← rename to testValidateFinding
}

// RESOLVE input: fails on vulnerable code (RED), passes after fix (GREEN)
function testValidateFinding() public {
    // ... same assertions, no wrapper
}
```

## Supported Frameworks

| Framework     | Language   | Review Pattern                  | Fix Pattern    |
| ------------- | ---------- | ------------------------------- | -------------- |
| Foundry/Forge | Solidity   | `vm.expectRevert` + `assertEq` | Remove wrapper |
| Hardhat       | TypeScript | `rejectedWith` + `expect`      | Remove wrapper |
| Truffle       | TypeScript | `rejectedWith` + `expect`      | Remove wrapper |
| Ape           | Python     | `pytest.raises` + `assert`     | Remove wrapper |
| Brownie       | Python     | `pytest.raises` + `assert`     | Remove wrapper |

## Why I Built This

After going through an audit competition with Cantina, I was told our competition had the highest number of submissions they had ever seen. I wasn't sure what that meant. There was a lot of AI slop, and I found myself wondering if AI was taking or giving me more of my time back. Our judges often were not sure if some results were valid or not and I ended up doing a lot of the reviews confirming and rejecting issues.

Then multiple teams offered for me to test their scanner, and my reaction to each report was, here we go again, more of my time that I have to spend invalidating false positives to perhaps find one or two nuggets of value underneath it all.

I got a report this week with hundreds of findings after the team was recommended by two people I trust and I about lost it. The review skill was born out of absolute necessity — I needed a faster way to cut through the noise to find the diamonds in the rough. The resolve skill is the natural next step: once you know what's real, fix it systematically.

This wasn't just a few sessions of AI to build this. I used all of our reports and findings to calibrate and improve it, testing it on manual audits, competitions, and scanners. My hope is that both projects and security products can find value from my trials and tribulations.

**If you are getting audit scans or manual reviews**, check out the toolkit and let me know how it did.

**If you have an AI scanner**, let me know if you want me to measure its performance on our codebase, if I haven't already.

**If you're curious to see how various scanners have performed**, DM me.

## Validation

The review skill was validated against three completed smart contract audit reports where we already knew the correct outcomes — a competitive audit, a manual audit from a professional firm, and one AI-powered scanner. In each case, the team had already reviewed every finding manually before running the skill, so the skill's results could be compared against known ground truth. Two additional AI scanner reports (B and C) were processed without prior manual review — manual verification of the skill's results is currently in progress for those.

| Report Type         | Confirmed | Severity Accurate | Severity Overstated | Disputed |
| ------------------- | :-------: | :---------------: | :-----------------: | :------: |
| Competition         |   100%    |        90%        |         10%         |    0%    |
| Manual audit        |   100%    |        80%        |         20%         |    0%    |
| AI scanner A (beta) |    33%    |        17%        |         17%         |   67%    |
| AI scanner B        |    22%    |        12%        |         10%         |   71%    |
| AI scanner C (beta)†|    11%    |        2.5%       |        8.5%         |  77.5%   |

†80 findings scored. 97 additional findings were self-identified as invalid by the auditor — all correctly identified (0 confirmed vulnerabilities). 11% of scored findings were duplicates. Audit quality score: 6.73/100.

### Key Observations

**The skill matched our independent results.** Across the three validated reports, the skill's confirmations and disputes aligned with what we had already determined through manual review. This wasn't the skill discovering unknowns — it was reproducing known outcomes, which is what gave us confidence it was working correctly.

**High-quality reports produce high confirmation rates.** The competition had a 100% confirmation rate and the manual audit had 100% — zero disputed findings in either. The skill confirmed what good auditors found and only flagged severity disagreements where warranted.

**The skill reliably identifies false positives.** The AI scanners had dispute rates of 67%, 71%, and 77.5% — the skill flagged findings where the scanners misunderstood protocol-specific protections, cited unreachable preconditions, or described vulnerabilities that existing safeguards already prevented. One issue was improperly invalidated during manual review and the tool helped to demonstrate the issue.

**The skill scales to large reports.** The 254-finding AI scanner report was processed across multiple sessions using the STATE.md crash-resilience protocol. The skill maintained consistency throughout, processing all findings and producing 261 PoC tests with structured artifacts for each.

**Cross-validation confirms reproducibility.** The 46 highest-severity confirmed findings from the 254-finding report were independently re-reviewed in a separate session. The re-review produced consistent results: it confirmed 39 findings, identified 4 duplicates the original review missed, and disputed 3 findings the original had confirmed. The re-review also improved severity calibration, reassessing 17 findings (12 upgraded, 5 downgraded) for an audit quality score of 84.19/100.

**Every finding — confirmed or disputed — has an executable PoC.** Across all five reviews plus the re-review, 439 PoC tests were written and all pass. No finding is accepted or rejected based on claims alone.

## How It Works

The core insight: every smart contract audit finding is a testable hypothesis. Instead of reading claims and making a judgment call, you write a PoC test that either confirms or disproves the vulnerability. The test is the source of truth.

Key design principles:

- **Every finding gets a PoC** — no exceptions, regardless of severity
- **Exercise, don't emulate** — tests call the actual contract, never reimplement logic
- **Two-layer test pattern** — separates behavior exercise from expectation, making PoCs dual-purpose (validates vulnerability now, verifies fix later)
- **Assertions only** — no logging, no console output. If there's no assertion failure, it proves nothing

## Scoring

Each confirmed finding is scored 0-5:

- **Zero** for false positives and duplicates
- **Base (0-2):** 1 point if valid + 1 point if severity matches
- **Quality bonus (0-3 avg):** Summary Clarity + Reproduction Evidence + Fix Recommendation

Disputed findings (false positives) score 0. The final scorecard weights findings by severity (Critical=8, High=4, Medium=2, Low/Info=0) to produce an overall audit quality score out of 100.

## Cross-Platform

This toolkit follows the [Agent Skills](https://agentskills.io) open standard and works across:

- Claude Code
- Cursor
- GitHub Copilot
- Windsurf

## License

MIT
