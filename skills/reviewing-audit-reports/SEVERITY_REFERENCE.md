# Severity Reference

Deterministic severity rubric producing exactly one severity level per finding. Synthesized from Sherlock, Cantina/Spearbit, Immunefi, OpenZeppelin, Trail of Bits, and Zellic into a single layered framework.

## Decision Procedure

Follow these steps in order. Each finding produces exactly one severity.

```
Step 0: Zero security impact? → Informational, stop.
Step 1: Classify Impact (High / Medium / Low) using Impact Anchors.
Step 2: Classify Likelihood (High / Medium / Low) using Likelihood Definitions.
Step 3: Look up the Impact × Likelihood Matrix → base severity.
Step 4: Apply modifiers in order:
  4.1  Privilege cap        (can only lower)
  4.2  Cumulative damage    (can raise by 1, but not above cap or Critical)
  4.3  Protocol continuity  (can lower by 1, minimum Informational)
→ Final severity.
```

Document which step determined each classification in the Severity Assessment section of your artifact.

---

## Impact × Likelihood Matrix (Step 3)

The single classification engine. Look up the intersection of Step 1 and Step 2.

|                   | High Likelihood | Medium Likelihood | Low Likelihood |
| ----------------- | --------------- | ----------------- | -------------- |
| **High Impact**   | Critical        | High              | Medium         |
| **Medium Impact** | High            | Medium            | Low            |
| **Low Impact**    | Medium          | Low               | Informational  |

Note: The matrix inherently weights impact over likelihood — High Impact + Low Likelihood yields Medium (not Low), preserving impact-first severity without contradicting the matrix.

---

## Impact Anchors (Step 1)

Concrete thresholds defining what High, Medium, and Low impact mean. When a finding spans multiple rows, use the highest matching level.

| Impact Level | Financial Threshold | Functional Indicators |
| ------------ | ------------------- | --------------------- |
| **High**     | Loss >1% of principal AND >$10 | Direct theft/loss of funds, protocol insolvency, governance takeover, permanent freezing of assets, unauthorized minting |
| **Medium**   | Loss >0.01% of principal AND >$10 | Core functionality broken, DoS >7 days, griefing with material cost to victims, temporary fund freezing, theft of unclaimed yield |
| **Low**      | Below Medium thresholds | Rounding/dust losses, edge-case behavior, minor operational disruption |

- Losses from user mistakes are excluded unless the protocol explicitly claims to prevent them.
- Admin-initiated losses follow the Privilege Adjustment modifier (Step 4.1), not this table.

---

## Likelihood Definitions (Step 2)

| Likelihood Level | Definition | Examples |
| ---------------- | ---------- | -------- |
| **High**         | Any participant can trigger; no special conditions; repeatable | Calling a public function with crafted parameters; front-running a common transaction type |
| **Medium**       | Requires specific but realistic external conditions or states | Specific token price ratio; oracle delay window; particular governance proposal state |
| **Low**          | Rare combination of circumstances unlikely to occur organically | Multi-block MEV + specific liquidation threshold + stale oracle in the same transaction; race condition requiring sub-second timing across multiple parties |

---

## Modifier 1: Privilege Adjustment (Step 4.1)

Applied after the matrix lookup. Caps severity based on the privilege level required to execute the exploit. **Can only lower severity, never raise it.**

| Privilege Required  | Maximum Severity |
| ------------------- | ---------------- |
| None (any user)     | Critical         |
| Specific role       | One level below base severity |
| Admin / Owner       | Medium           |
| Multisig + timelock | Low              |

**Trustless-protocol exception:** If the protocol's documentation or architecture explicitly claims to be trustless (no admin keys, no privileged roles, immutable contracts), privilege caps do not apply — the absence of trust assumptions means any privilege escalation is itself a Critical-eligible vulnerability.

---

## Modifier 2: Cumulative Damage Elevation (Step 4.2)

Applied after the privilege cap. Elevates severity by one level when **all three conditions** hold:

1. The attack is **repeatable** (attacker can execute it multiple times)
2. Each execution causes **incremental loss** that compounds
3. The **cumulative loss** over a realistic time horizon exceeds the Impact Anchor threshold for the next severity tier

**Cannot exceed** the privilege cap from Step 4.1 or Critical.

**Worked example:** A dust-extraction attack (Low impact per execution) can be repeated every block. Over 30 days, cumulative loss exceeds 0.01% of principal AND >$10 (Medium threshold). Any user can trigger it (no privilege cap). Base severity: Medium (Low Impact × High Likelihood). Cumulative damage elevates to High because cumulative loss crosses the Medium→High threshold AND no privilege cap blocks it.

---

## Modifier 3: Protocol Continuity Check (Step 4.3)

Applied last. Downgrades severity by one level (minimum Informational) when **all three conditions** hold:

1. **No financial loss** — no user or protocol funds are at risk
2. **No functional degradation** — protocol operates within its documented parameters
3. **Design preference only** — the finding describes an alternative design choice, not a flaw

If any condition fails, this modifier does not apply.

---

## Key Principles

1. **One framework, one answer** — the Decision Procedure is the sole classification method; do not apply Sherlock, Cantina, or Immunefi rules independently
2. **Impact-weighted matrix** — the matrix structurally favors impact over likelihood (High Impact + Low Likelihood = Medium, not Low)
3. **Modifiers are ordered** — privilege cap first (can only lower), cumulative damage second (can raise by 1), protocol continuity last (can lower by 1); this order prevents circular adjustments
4. **Quantitative over qualitative** — use Impact Anchors and Likelihood Definitions before professional judgment; judgment fills gaps, not replaces thresholds
5. **Document the path** — every severity assessment must cite which Impact Anchor, Likelihood Definition, matrix cell, and modifiers (if any) produced the final severity

---

## Quick Reference Table

Summary view only — the Decision Procedure above is the source of truth.

| Severity          | Typical Profile | Key Indicators |
| ----------------- | --------------- | -------------- |
| **Critical**      | High Impact + High Likelihood, no privilege required | Direct fund theft, governance takeover, exploitable by any user |
| **High**          | High Impact + Medium Likelihood, or Medium Impact + High Likelihood | Significant loss (>1% principal), major disruption, realistic conditions |
| **Medium**        | High Impact + Low Likelihood, Medium + Medium, or privilege-capped High | Constrained loss, specific conditions, admin-capped exploits |
| **Low**           | Medium Impact + Low Likelihood, or multisig-capped findings | Edge cases, minimal financial impact, rare circumstances |
| **Informational** | Low Impact + Low Likelihood, or protocol continuity downgrade | No security impact, design preferences, gas optimizations |

---

## Disputed vs Confirmed (Informational)

A finding can only be one of these. The distinction is precise:

| Classification | When to Use | PoC Behavior |
|---|---|---|
| **Disputed** | The auditor's claim about what the code does is **factually wrong**. The described vulnerability does not exist. | PoC proves the system behaves correctly — the auditor misread the code. |
| **Confirmed (Informational)** | The auditor identified a **real observable behavior** (code quality issue, naming confusion, design smell), but it has **no security impact** and no profitable exploit path. | PoC may show the behavior exists, but demonstrates it causes no harm. |

**Decision rule:** If you can write a test that proves the auditor's described behavior *does not occur*, it's Disputed. If the behavior occurs but causes no damage, it's Confirmed (Informational).

**Examples from practice:**
- Auditor claims "function X erases interest" but interest accrual happens before the call → **Disputed** (claim is wrong)
- Auditor claims "parameter naming could cause maintenance bugs" and the naming IS confusing, but the system works correctly → **Confirmed (Informational)**
- Auditor claims "stale reserves during callback" and reserves ARE stale, but this is fundamental AMM design identical to Uniswap V2 → **Disputed** (known design characteristic, not a vulnerability)
- Auditor claims "excess repayment confiscated" but the excess is documented anti-skimming protocol fees → **Disputed** (intentional design)

**Caution:** Do not let Confirmed (Informational) become a dumping ground for disputes. The bar is: a reasonable developer reading the finding would agree the described code-level observation is real, even if the security conclusion is wrong.

## Severity Dispute Criteria

When disputing severity, document:

- **Claimed severity** vs **assessed severity** with Decision Procedure step references (e.g., "Step 1: Medium Impact per Anchor row 2; Step 4.1: capped at Medium by Admin privilege")
- **Impact analysis**: Quantify actual financial impact using Impact Anchors
- **Likelihood analysis**: Classify using Likelihood Definitions with specific conditions cited
- **Precedent**: How similar findings were classified elsewhere
- **Protocol context**: Threat model implications
