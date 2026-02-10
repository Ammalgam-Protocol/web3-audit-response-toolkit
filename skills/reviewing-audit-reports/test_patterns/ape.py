# Ape Framework + pytest test pattern
# Also applicable to Brownie (replace ape imports with brownie equivalents)

import pytest
import ape

# BANNED in PoC tests:
# - `ape.reverts()` without a match string — always use `ape.reverts("specific message")`
# - `print()` — use assert with a message
# - `assert x is True` / `assert x is False` — use assert x == expected_value


@pytest.fixture
def contract(owner, project):
    """Deploy or attach to the contract under test."""
    return owner.deploy(project.ContractUnderTest)


# PATTERN 1: Value mismatch — exercise function asserts correct outcome,
# test function expects the assertion to fail on vulnerable code.
#
# On vulnerable code: exercise_validate_finding raises AssertionError → test passes
# After fix: remove the pytest.raises wrapper → test passes directly

def exercise_validate_finding(contract):
    # Logic to exercise the contract and compute expected vs actual
    expected = 1
    actual = contract.computeValue()

    assert actual == expected, f"Expected and actual values do not match: {expected} != {actual}"


def test_validate_finding_value_mismatch(contract):
    with pytest.raises(AssertionError, match="Expected and actual values do not match: 1 != 0"):
        exercise_validate_finding(contract)


# PATTERN 2: Unexpected revert — a call reverts when it shouldn't.
#
# On vulnerable code: call reverts with custom error → test passes
# After fix: remove the ape.reverts wrapper → test passes directly

def test_validate_finding_unexpected_revert(contract):
    with ape.reverts("UnexpectedRevert"):
        contract.functionThatShouldNotRevert()
