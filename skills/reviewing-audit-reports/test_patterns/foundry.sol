// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";

/**
 * BANNED in PoC tests:
 * - Bare `vm.expectRevert()` without a message or selector — always use
 *   `vm.expectRevert("specific message")` or `vm.expectRevert(Error.selector)`
 * - `console.log` / `console2.log` / `emit log` — use assertEq with a message
 * - `assertEq(bool, true)` or `assertEq(bool, false)` — use assertGt, assertEq(uint, uint), etc.
 *
 * ENTRY POINT REQUIREMENT:
 * The primary exercise action MUST call a public/external function on a deployed contract.
 * Never test internal functions directly.
 *
 * BANNED — testing internals directly:
 *   Library.someInternalFunction(craftedInputs);     // library call
 *   customHarness.wrappedInternal(craftedInputs);    // standalone harness around internal
 *   // ... pure arithmetic reproducing internal logic  // reimplemented math
 *
 * CORRECT — testing through entry points:
 *   pair.liquidateHard(borrower, to, "");   // public entry point, reaches internals naturally
 *   pair.swap(amount, 0, to, "");           // public entry point
 *   pair.borrow(user, amount, 0, "");       // public entry point
 *
 * ACCEPTABLE — harness for setup/assertion only (NOT as primary exercise):
 *   pair.exposed_resetTotalAssetsCached();  // setup helper
 *   pair.exposed_getTickRange();            // read-only assertion
 */

contract TEST_PATTERNS is Test {

    /**
     * @notice PATTERN 1: Validate that the expected and actual values do not match, and that the
     *   correct error message is emitted when the assertion fails.
     */
    function testValidateFindingExpectationDoesNotMatch() public {
        vm.expectRevert("Expected and actual values do not match: 1 != 5");
        exerciseValidateFinding();
    }

    function exerciseValidateFinding() public pure {

        // Logic to exercise the contract code computes the expected and actual values that do not match

        uint256 expected = 1;
        uint256 actual = 5;

        assertEq(expected, actual, "Expected and actual values do not match");
    }

    /**
     * @notice PATTERN 2: Validate that an unexpected revert occurs when it shouldn't.
     */
    function testValidateFindingUnexpectedRevert() public {
        vm.expectRevert(UnexpectedRevert.selector);
        exerciseUnexpectedRevert();
    }

    error UnexpectedRevert();

    function exerciseUnexpectedRevert() public pure {

        // Logic to exercise the contract code that should not revert but does

        revert UnexpectedRevert();
    }
}
