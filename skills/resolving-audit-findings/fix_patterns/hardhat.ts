// Hardhat + ethers.js + Chai fix patterns
// Converting review PoCs into regression tests
//
// BEFORE: Two-layer PoC from the review skill (passes on vulnerable code).
// AFTER:  Single-layer regression test (fails on vulnerable code, passes after fix).

import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";

describe("FixPatterns", function () {
  let contract: Contract;

  beforeEach(async function () {
    const Factory = await ethers.getContractFactory("ContractUnderTest");
    contract = await Factory.deploy();
  });

  // ===========================================================================
  // PATTERN 1: Value mismatch
  // ===========================================================================

  // --- BEFORE (review skill output) ---
  // The rejectedWith wrapper catches the assertion error, so this passes on buggy code.

  async function before_exerciseValidateFinding() {
    const expected = 1;
    const actual = await contract.computeValue();
    expect(actual).to.equal(expected, "Expected and actual values do not match");
  }

  it("BEFORE: validates finding - value mismatch", async function () {
    await expect(before_exerciseValidateFinding()).to.be.rejectedWith(
      "Expected and actual values do not match"
    );
  });

  // --- AFTER (resolution conversion) ---
  // 1. Delete the test wrapper (the it() with rejectedWith)
  // 2. Move the exercise function body into a new it() block
  // 3. The assertion is unchanged — it already asserts the CORRECT outcome
  // 4. Run: test FAILS (RED) because the bug still returns wrong value
  // 5. Fix the bug → test PASSES (GREEN)

  it("AFTER: validates finding - value mismatch", async function () {
    const expected = 1;
    const actual = await contract.computeValue();
    expect(actual).to.equal(expected, "Expected and actual values do not match");
  });

  // ===========================================================================
  // PATTERN 2: Unexpected revert
  // ===========================================================================

  // --- BEFORE (review skill output) ---

  it("BEFORE: validates finding - unexpected revert", async function () {
    await expect(
      contract.functionThatShouldNotRevert()
    ).to.be.revertedWithCustomError(contract, "UnexpectedRevert");
  });

  // --- AFTER (resolution conversion) ---
  // 1. Replace revertedWithCustomError with not.be.reverted
  // 2. Run: test FAILS (RED) because the call still reverts
  // 3. Fix the bug → test PASSES (GREEN)

  it("AFTER: validates finding - unexpected revert", async function () {
    await expect(
      contract.functionThatShouldNotRevert()
    ).to.not.be.reverted;
  });
});
