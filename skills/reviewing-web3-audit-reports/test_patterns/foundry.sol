// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";

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
