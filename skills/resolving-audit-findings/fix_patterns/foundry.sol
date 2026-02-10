// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";

/**
 * Fix patterns for Foundry/Forge — converting review PoCs into regression tests.
 *
 * BEFORE: Two-layer PoC from the review skill (passes on vulnerable code).
 * AFTER:  Single-layer regression test (fails on vulnerable code, passes after fix).
 */
contract FIX_PATTERNS is Test {

    // =========================================================================
    // PATTERN 1: Value mismatch — assertion expected wrong value
    // =========================================================================

    // --- BEFORE (review skill output) ---
    // The test wrapper catches the assertion failure, so this passes on buggy code.

    function before_testValidateFinding() public {
        vm.expectRevert("Expected and actual values do not match: 1 != 5");
        before_exerciseValidateFinding();
    }

    function before_exerciseValidateFinding() public pure {
        uint256 expected = 1;
        uint256 actual = 5; // buggy: should be 1
        assertEq(expected, actual, "Expected and actual values do not match");
    }

    // --- AFTER (resolution conversion) ---
    // 1. Delete the test wrapper (before_testValidateFinding)
    // 2. Rename exercise → test (prefix changes from exercise to test)
    // 3. The assertion is unchanged — it already asserts the CORRECT outcome
    // 4. Run: test FAILS (RED) because the bug still produces 5 instead of 1
    // 5. Fix the bug → test PASSES (GREEN)

    function after_testValidateFinding() public pure {
        uint256 expected = 1;
        uint256 actual = 1; // fixed: now returns correct value
        assertEq(expected, actual, "Expected and actual values do not match");
    }

    // =========================================================================
    // PATTERN 2: Unexpected revert — call reverts when it shouldn't
    // =========================================================================

    // --- BEFORE (review skill output) ---

    error UnexpectedRevert();

    function before_testUnexpectedRevert() public {
        vm.expectRevert(UnexpectedRevert.selector);
        before_exerciseUnexpectedRevert();
    }

    function before_exerciseUnexpectedRevert() public pure {
        revert UnexpectedRevert(); // buggy: should not revert
    }

    // --- AFTER (resolution conversion) ---
    // 1. Delete the test wrapper (before_testUnexpectedRevert)
    // 2. Rename exercise → test
    // 3. The function body is unchanged — it calls the code that should NOT revert
    // 4. Run: test FAILS (RED) because the call still reverts
    // 5. Fix the bug → test PASSES (GREEN) because the call no longer reverts

    function after_testUnexpectedRevert() public pure {
        // After fix, this call completes without reverting
        // (In a real test, this would call the fixed contract function)
    }
}
