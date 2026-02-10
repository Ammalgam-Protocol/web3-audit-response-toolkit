// Hardhat + ethers.js + Chai test pattern
// Also applicable to Truffle (replace ethers with web3, use @truffle/contract)

import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

/**
 * BANNED in PoC tests:
 * - `expect().to.be.reverted` without specifying the reason — always use
 *   `.to.be.revertedWith("message")` or `.to.be.revertedWithCustomError(contract, "ErrorName")`
 * - `console.log()` — use expect().to.equal() with a message
 * - `expect(bool).to.be.true` — use expect(value).to.equal(expected)
 */

describe("FindingPoC", function () {
  let contract: Contract;

  beforeEach(async function () {
    // Deploy or attach to the contract under test
    const Factory = await ethers.getContractFactory("ContractUnderTest");
    contract = await Factory.deploy();
  });

  /**
   * PATTERN 1: Value mismatch — exercise function asserts correct outcome,
   * test function expects the assertion to fail on vulnerable code.
   *
   * On vulnerable code: exerciseValidateFinding throws → test passes
   * After fix: remove the expect().to.be.rejectedWith wrapper → test passes directly
   */
  async function exerciseValidateFinding() {
    // Logic to exercise the contract and compute expected vs actual
    const expected = 1;
    const actual = await contract.computeValue();

    expect(actual).to.equal(expected, "Expected and actual values do not match");
  }

  it("validates finding - value mismatch", async function () {
    await expect(exerciseValidateFinding()).to.be.rejectedWith(
      "Expected and actual values do not match"
    );
  });

  /**
   * PATTERN 2: Unexpected revert — a call reverts when it shouldn't.
   *
   * On vulnerable code: call reverts with custom error → test passes
   * After fix: change to expect().to.not.be.reverted → test passes
   */
  it("validates finding - unexpected revert", async function () {
    await expect(
      contract.functionThatShouldNotRevert()
    ).to.be.revertedWithCustomError(contract, "UnexpectedRevert");
  });
});
