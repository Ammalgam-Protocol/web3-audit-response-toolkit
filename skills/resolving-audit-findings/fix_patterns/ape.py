# Ape Framework + pytest fix patterns
# Converting review PoCs into regression tests
#
# BEFORE: Two-layer PoC from the review skill (passes on vulnerable code).
# AFTER:  Single-layer regression test (fails on vulnerable code, passes after fix).

import pytest
import ape


@pytest.fixture
def contract(owner, project):
    """Deploy or attach to the contract under test."""
    return owner.deploy(project.ContractUnderTest)


# ===========================================================================
# PATTERN 1: Value mismatch
# ===========================================================================

# --- BEFORE (review skill output) ---
# The pytest.raises wrapper catches the assertion error, so this passes on buggy code.


def before_exercise_validate_finding(contract):
    expected = 1
    actual = contract.computeValue()
    assert actual == expected, f"Expected and actual values do not match: {expected} != {actual}"


def test_before_validate_finding_value_mismatch(contract):
    with pytest.raises(AssertionError, match="Expected and actual values do not match"):
        before_exercise_validate_finding(contract)


# --- AFTER (resolution conversion) ---
# 1. Delete the test wrapper (test_before_validate_finding_value_mismatch)
# 2. Rename exercise → test (prefix changes from exercise to test)
# 3. The assertion is unchanged — it already asserts the CORRECT outcome
# 4. Run: test FAILS (RED) because the bug still returns wrong value
# 5. Fix the bug → test PASSES (GREEN)


def test_after_validate_finding_value_mismatch(contract):
    expected = 1
    actual = contract.computeValue()
    assert actual == expected, f"Expected and actual values do not match: {expected} != {actual}"


# ===========================================================================
# PATTERN 2: Unexpected revert
# ===========================================================================

# --- BEFORE (review skill output) ---


def test_before_validate_finding_unexpected_revert(contract):
    with ape.reverts("UnexpectedRevert"):
        contract.functionThatShouldNotRevert()


# --- AFTER (resolution conversion) ---
# 1. Remove the ape.reverts wrapper
# 2. Call the function directly — it should NOT revert
# 3. Run: test FAILS (RED) because the call still reverts
# 4. Fix the bug → test PASSES (GREEN)


def test_after_validate_finding_unexpected_revert(contract):
    contract.functionThatShouldNotRevert()  # should complete without reverting
