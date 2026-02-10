# Reviewing Web3 Audit Reports

A Claude Code skill that validates smart contract audit findings by creating PoC tests that confirm or dispute each claimed vulnerability. Every finding gets a test. The test determines truth, not the auditor's claims.

Produces structured artifacts (ISSUE.md / DISPUTE.md + executable PoC) per finding and a final scorecard grading the audit's accuracy.

## Install

```bash
# Add the marketplace
/plugin marketplace add Ammalgam-Protocol/reviewing-web3-audit-reports

# Install the plugin
/plugin install reviewing-web3-audit-reports@reviewing-web3-audit-reports
```

## Usage

```
Review the smart contract audit report at ./audits/report.pdf against commit abc1234
```

The skill activates automatically when you ask Claude Code to review a smart contract audit report, triage findings, create PoCs, assess severity, or dispute findings.

## What It Does

**Phase 0 — Setup:** Checks out the audited commit, discovers the project's testing stack, builds a numbered finding list, and presents a plan for approval.

**Phase 1 — Process Findings:** For each finding, dispatched in parallel batches of 2-3:

1. Understands the claim and identifies the code path
2. Writes a PoC test (passes if vulnerability exists, fails if it doesn't)
3. Classifies the result: Confirmed, Disputed, or Debug
4. Assesses severity independently against a unified rubric
5. Assigns validity and severity confidence scores
6. Scores the finding's quality across three dimensions
7. Saves artifacts to disk immediately

**Phase 2 — Scorecard:** Aggregates all findings into a weighted scorecard that grades audit quality on a 0-100 scale.

## Output

```
test/audit_review/
  SCORECARD.md                    # Overall audit grade
  finding-1/
    POC.sol                       # Executable PoC (test runner discovers these)
    ISSUE.md or DISPUTE.md        # Structured assessment
  finding-2/
    POC.sol
    DISPUTE.md
  ...
```

## Supported Frameworks

| Framework | Language | Test Patterns |
|-----------|----------|---------------|
| Foundry/Forge | Solidity | `vm.expectRevert` + `assertEq` |
| Hardhat | TypeScript | Chai `expect` + `rejectedWith` |
| Truffle | TypeScript | Chai `expect` + `rejectedWith` |
| Ape | Python | `pytest.raises` + `assert` |
| Brownie | Python | `pytest.raises` + `assert` |

The skill is language/framework agnostic and adapts to whatever smart contract testing stack the project uses.

## Why I Built This

After going through an audit competition with Cantina, I was told our competition had the highest number of submissions they had ever seen. I wasn't sure what that meant. There was a lot of AI slop, and I found myself wondering if AI was taking or giving me more of my time back. Our judges often were not sure if some results were valid or not and I ended up doing a lot of the reviews confirming and rejecting issues.

Then multiple teams offered for me to test their scanner, and my reaction to each report was, here we go again, more of my time that I have to spend invalidating false positives to perhaps find one or two nuggets of value underneath it all.

I got a report this week with hundreds of findings after the team was recommended by two people I trust and I about lost it. This skill was born out of absolute necessity — I needed a faster way to cut through the noise to find the diamonds in the rough.

This wasn't just a few sessions of AI to build this. I used all of our reports and findings to calibrate and improve it, testing it on manual audits, competitions, and scanners. My hope is that both projects and security products can find value from my trials and tribulations.

**If you are getting audit scans or manual reviews**, check out the skill and let me know how it did.

**If you have an AI scanner**, let me know if you want me to measure its performance on our codebase, if I haven't already.

**If you're curious to see how various scanners have performed**, DM me.

## Validation

This skill was calibrated against three completed smart contract audit reports where we already knew the correct outcomes — a competitive audit, a manual audit from a professional firm, and an AI-powered scanner in beta. In each case, the team had already reviewed every finding manually before running the skill, so the skill's results could be compared against known ground truth.

| Report Type | Findings Reviewed | Confirmed | Severity Accurate | Severity Overstated | Disputed | PoC Tests |
|-------------|:-:|:-:|:-:|:-:|:-:|:-:|
| Competition | 10 | 9 (90%) | 8 | 1 | 0 (0%) | all passing |
| Manual audit | 10 | 10 (100%) | 8 | 2 | 0 (0%) | 33, all passing |
| AI scanner (beta) | 24 | 8 (33%) | 4 | 4 | 16 (67%) | 75, all passing |

### Key Observations

**The skill matched our independent results.** Across all three reports, the skill's confirmations and disputes aligned with what we had already determined through manual review. This wasn't the skill discovering unknowns — it was reproducing known outcomes, which is what gave us confidence it was working correctly.

**High-quality reports produce high confirmation rates.** The competition had a 90% confirmation rate (1 not yet reviewed) and the manual audit had 100% — zero disputed findings in either. The skill confirmed what good auditors found and only flagged severity disagreements where warranted.

**The skill reliably identifies false positives.** The AI scanner in beta had a 67% dispute rate — the skill flagged findings where the scanner misunderstood protocol-specific protections, cited unreachable preconditions, or described vulnerabilities that existing safeguards already prevented.

**Every finding — confirmed or disputed — has an executable PoC.** Across all three reviews, 108+ PoC tests were written and all pass. No finding is accepted or rejected based on claims alone.

## How It Works

The core insight: every smart contract audit finding is a testable hypothesis. Instead of reading claims and making a judgment call, you write a PoC test that either confirms or disproves the vulnerability. The test is the source of truth.

Key design principles:

- **Every finding gets a PoC** — no exceptions, regardless of severity
- **Exercise, don't emulate** — tests call the actual contract, never reimplement logic
- **Two-layer test pattern** — separates behavior exercise from expectation, making PoCs dual-purpose (validates vulnerability now, verifies fix later)
- **Assertions only** — no logging, no console output. If there's no assertion failure, it proves nothing
- **Save immediately** — artifacts hit disk after each finding, never batched in memory
- **One report per session** — prevents context exhaustion

## Scoring

Each confirmed finding is scored 0-5:

- **Base (0-2):** 1 point if valid + 1 point if severity matches
- **Quality bonus (0-3 avg):** Summary Clarity + Reproduction Evidence + Fix Recommendation

Disputed findings (false positives) score 0. The final scorecard weights findings by severity (Critical=8, High=4, Medium=2, Low/Info=0) to produce an overall audit quality score out of 100.

## Cross-Platform

This skill follows the [Agent Skills](https://agentskills.io) open standard and works across:

- Claude Code
- Cursor
- GitHub Copilot
- Windsurf

## License

MIT
