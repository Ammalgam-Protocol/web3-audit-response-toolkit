# Severity Reference

Consolidated severity rubric synthesized from top Web3 auditors: Sherlock, Cantina/Spearbit, Immunefi, OpenZeppelin, Trail of Bits, Zellic.

## Unified Severity Framework

| Severity          | Impact                                                                      | Likelihood                                         | Typical Indicators                                                                                                              |
| ----------------- | --------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Critical**      | Direct loss/theft of funds, protocol insolvency, governance takeover        | Any participant can trigger; no special conditions | Theft of user funds at-rest or in-motion, permanent freezing of assets, unauthorized minting, governance manipulation           |
| **High**          | Significant financial loss (>1% principal, >$10), major protocol disruption | Exploitable without extensive external conditions  | Theft of unclaimed yield, temporary fund freezing, loss >1% AND >$10, high impact + high/medium likelihood                      |
| **Medium**        | Constrained loss, broken core functionality, operational disruption         | Requires specific external conditions or states    | Loss >0.01% AND >$10 , DOS >7 days, griefing, block stuffing, high impact + low likelihood OR medium impact + medium likelihood |
| **Low**           | Minimal financial impact, edge cases                                        | Rare combination of circumstances                  | Rounding/dust losses, admin-only actions (Cantina caps at Low), user errors fixable via frontend                                |
| **Informational** | No measurable security impact                                               | Theoretical or negligible                          | Design improvements, gas optimizations, code quality                                                                            |

## Key Principles Across Auditors

1. **Impact over Likelihood** : Severity driven by impact regardless of probability
2. **Impact x Likelihood Matrix**: 3x3 matrix combining impact and likelihood
3. **Protocol Continuity Test**: Protocol can function without fixes → likely Low
4. **Cumulative Damage** : Repeatable attacks causing cumulative losses can elevate severity
5. **Privilege Requirements** : Exploits requiring elevated privileges may be downgraded
6. **Professional Judgment** : Case-by-case considering threat models and project context

## Severity Dispute Criteria

When disputing severity, document:

- **Claimed severity** vs **assessed severity** with rubric reference
- **Impact analysis**: Quantify actual financial impact
- **Likelihood analysis**: Required conditions and their realism
- **Precedent**: How similar findings were classified elsewhere
- **Protocol context**: Threat model implications

## Cantina Impact x Likelihood Matrix

|                   | High Likelihood | Medium Likelihood | Low Likelihood |
| ----------------- | --------------- | ----------------- | -------------- |
| **High Impact**   | Critical        | High              | Medium         |
| **Medium Impact** | High            | Medium            | Low            |
| **Low Impact**    | Medium          | Low               | Informational  |

## Sherlock Thresholds

- **High**: Loss >1% of principal AND >$10, without extensive external conditions
- **Medium**: Loss >0.01% of principal AND >$10, with constrained conditions
- Losses from user mistakes or admin actions are excluded unless protocol claims to prevent them

## Immunefi Privilege Adjustments

| Privilege Required  | Maximum Severity                      |
| ------------------- | ------------------------------------- |
| None (any user)     | Critical                              |
| Specific role       | One level below impact-based severity |
| Admin/Owner         | Medium (unless protocol is trustless) |
| Multisig + timelock | Low                                   |
