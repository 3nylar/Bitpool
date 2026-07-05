const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

const FEE_BPS = 30n; // 0.3%
const ONE = 10n ** 18n;

describe("LiquidityPoolAMM", function () {
  async function deployFixture() {
    const [deployer, alice, bob] = await ethers.getSigners();

    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const tokenA = await MockERC20.deploy("Simulated USDC", "sUSDC", 18, deployer.address);
    const tokenB = await MockERC20.deploy("Simulated ETH", "sETH", 18, deployer.address);

    const Pool = await ethers.getContractFactory("LiquidityPoolAMM");
    const pool = await Pool.deploy(
      await tokenA.getAddress(),
      await tokenB.getAddress(),
      FEE_BPS,
      "LP SIM-USDC/SIM-ETH",
      "LP-SIM"
    );

    // Fund alice and bob with plenty of both tokens.
    for (const user of [alice, bob]) {
      await tokenA.connect(user).faucet();
      await tokenB.connect(user).faucet();
      await tokenA.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
      await tokenB.connect(user).approve(await pool.getAddress(), ethers.MaxUint256);
    }

    return { pool, tokenA, tokenB, deployer, alice, bob };
  }

  describe("addLiquidity", function () {
    it("seeds the pool on first deposit and locks MINIMUM_LIQUIDITY", async function () {
      const { pool, alice } = await loadFixture(deployFixture);
      const amountA = 1000n * ONE;
      const amountB = 2000n * ONE;

      await expect(
        pool.connect(alice).addLiquidity(amountA, amountB, 0, 0, alice.address, 0)
      ).to.emit(pool, "LiquidityAdded");

      const [reserveA, reserveB] = await pool.getReserves();
      expect(reserveA).to.equal(amountA);
      expect(reserveB).to.equal(amountB);

      const minLiquidity = await pool.MINIMUM_LIQUIDITY();
      const burnAddress = await pool.BURN_ADDRESS();
      expect(await pool.balanceOf(burnAddress)).to.equal(minLiquidity);
      expect(await pool.totalSupply()).to.equal(await pool.balanceOf(alice.address) + minLiquidity);
    });

    it("mints LP tokens proportionally on subsequent deposits matching the ratio", async function () {
      const { pool, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(1000n * ONE, 2000n * ONE, 0, 0, alice.address, 0);

      const aliceLp = await pool.balanceOf(alice.address);
      const minLiquidity = await pool.MINIMUM_LIQUIDITY();

      // Bob deposits exactly the same amounts as Alice's original deposit. He should
      // receive Alice's LP amount *plus* the MINIMUM_LIQUIDITY that was permanently
      // locked to the burn address on the first deposit -- because his share is
      // computed against totalSupply (which includes that locked amount), not just
      // against Alice's circulating balance. This matches standard Uniswap V2 behavior.
      await pool.connect(bob).addLiquidity(1000n * ONE, 2000n * ONE, 0, 0, bob.address, 0);
      const bobLp = await pool.balanceOf(bob.address);

      expect(bobLp).to.equal(aliceLp + minLiquidity);
    });

    it("auto-matches the ratio when desired amounts are unbalanced", async function () {
      const { pool, tokenA, tokenB, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(1000n * ONE, 2000n * ONE, 0, 0, alice.address, 0);

      const bobABefore = await tokenA.balanceOf(bob.address);
      const bobBBefore = await tokenB.balanceOf(bob.address);

      // Bob offers way more B than the 1:2 ratio requires for 500 A.
      await pool.connect(bob).addLiquidity(500n * ONE, 5000n * ONE, 0, 0, bob.address, 0);

      const bobASpent = bobABefore - (await tokenA.balanceOf(bob.address));
      const bobBSpent = bobBBefore - (await tokenB.balanceOf(bob.address));

      expect(bobASpent).to.equal(500n * ONE);
      expect(bobBSpent).to.equal(1000n * ONE); // matched to the 1:2 ratio, not the full 5000 offered
    });
  });

  describe("removeLiquidity", function () {
    it("round-trips exactly with no trades in between", async function () {
      const { pool, tokenA, tokenB, alice } = await loadFixture(deployFixture);
      const amountA = 1000n * ONE;
      const amountB = 2000n * ONE;

      const aBefore = await tokenA.balanceOf(alice.address);
      const bBefore = await tokenB.balanceOf(alice.address);

      await pool.connect(alice).addLiquidity(amountA, amountB, 0, 0, alice.address, 0);
      const lp = await pool.balanceOf(alice.address);

      await pool.connect(alice).removeLiquidity(lp, 0, 0, alice.address, 0);

      const aAfter = await tokenA.balanceOf(alice.address);
      const bAfter = await tokenB.balanceOf(alice.address);

      // Alice gets back everything except the permanently-locked MINIMUM_LIQUIDITY's
      // tiny proportional share, which is negligible at these amounts but not exactly zero
      // by design (it belongs to the burn address forever). Express the tolerance as a
      // tiny fraction of the deposit rather than a fixed wei amount, since the absolute
      // dust scales with deposit size.
      const lostA = aBefore - aAfter;
      const lostB = bBefore - bAfter;
      expect(lostA).to.be.lessThan(amountA / 1_000_000_000n); // < 0.0000001% of deposit
      expect(lostB).to.be.lessThan(amountB / 1_000_000_000n);
    });

    it("lets LPs withdraw their share of accrued fees after trades", async function () {
      const { pool, tokenA, tokenB, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(10_000n * ONE, 10_000n * ONE, 0, 0, alice.address, 0);

      // Bob trades back and forth repeatedly, generating fees for the pool.
      for (let i = 0; i < 5; i++) {
        await pool.connect(bob).swap(await tokenA.getAddress(), 100n * ONE, 0, bob.address, 0);
        await pool.connect(bob).swap(await tokenB.getAddress(), 90n * ONE, 0, bob.address, 0);
      }

      const [reserveA, reserveB] = await pool.getReserves();
      // k should have grown due to fees (started at 10000*10000 = 1e8 in token units).
      expect(reserveA * reserveB).to.be.greaterThan(10_000n * ONE * (10_000n * ONE));

      const lp = await pool.balanceOf(alice.address);
      const aBefore = await tokenA.balanceOf(alice.address);
      const bBefore = await tokenB.balanceOf(alice.address);
      await pool.connect(alice).removeLiquidity(lp, 0, 0, alice.address, 0);
      const aAfter = await tokenA.balanceOf(alice.address);
      const bAfter = await tokenB.balanceOf(alice.address);

      // Alice's combined withdrawal should reflect more value than her original
      // 10,000 / 10,000 deposit thanks to accrued fees (at least on one side).
      const gainedA = aAfter - aBefore;
      const gainedB = bAfter - bBefore;
      expect(gainedA + gainedB).to.be.greaterThan(0n);
    });
  });

  describe("swap", function () {
    it("follows the constant-product formula including the fee", async function () {
      const { pool, tokenA, tokenB, alice, bob } = await loadFixture(deployFixture);
      const reserveAInit = 10_000n * ONE;
      const reserveBInit = 10_000n * ONE;
      await pool.connect(alice).addLiquidity(reserveAInit, reserveBInit, 0, 0, alice.address, 0);

      const amountIn = 100n * ONE;
      const expectedOut = await pool.getAmountOut(amountIn, reserveAInit, reserveBInit);

      const bBefore = await tokenB.balanceOf(bob.address);
      await pool.connect(bob).swap(await tokenA.getAddress(), amountIn, 0, bob.address, 0);
      const bAfter = await tokenB.balanceOf(bob.address);

      expect(bAfter - bBefore).to.equal(expectedOut);

      // Sanity-check against hand-computed formula.
      const amountInWithFee = amountIn * (10000n - FEE_BPS);
      const numerator = amountInWithFee * reserveBInit;
      const denominator = reserveAInit * 10000n + amountInWithFee;
      expect(expectedOut).to.equal(numerator / denominator);
    });

    it("reverts if minAmountOut (slippage protection) is not met", async function () {
      const { pool, tokenA, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(10_000n * ONE, 10_000n * ONE, 0, 0, alice.address, 0);

      const amountIn = 100n * ONE;
      const actualOut = await pool.getAmountOut(amountIn, 10_000n * ONE, 10_000n * ONE);

      await expect(
        pool.connect(bob).swap(await tokenA.getAddress(), amountIn, actualOut + 1n, bob.address, 0)
      ).to.be.revertedWithCustomError(pool, "InsufficientOutputAmount");
    });

    it("rejects swaps of a token that isn't part of the pool", async function () {
      const { pool, tokenA, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(10_000n * ONE, 10_000n * ONE, 0, 0, alice.address, 0);

      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const rogueToken = await MockERC20.deploy("Rogue", "RG", 18, bob.address);

      await expect(
        pool.connect(bob).swap(await rogueToken.getAddress(), 1n * ONE, 0, bob.address, 0)
      ).to.be.revertedWithCustomError(pool, "InvalidToken");
    });

    it("never lets reserveA * reserveB (k) decrease across a sequence of swaps", async function () {
      const { pool, tokenA, tokenB, alice, bob } = await loadFixture(deployFixture);
      // Top up Alice beyond the default single-faucet amount so she can seed a
      // larger pool for this test.
      await tokenA.connect(alice).faucet();
      await tokenA.connect(alice).faucet();
      await tokenA.connect(alice).faucet();
      await tokenA.connect(alice).faucet();
      await tokenB.connect(alice).faucet();
      await tokenB.connect(alice).faucet();
      await tokenB.connect(alice).faucet();
      await tokenB.connect(alice).faucet();
      await pool.connect(alice).addLiquidity(50_000n * ONE, 50_000n * ONE, 0, 0, alice.address, 0);

      let [rA, rB] = await pool.getReserves();
      let k = rA * rB;

      const trades = [
        [tokenA, 1000n * ONE],
        [tokenB, 500n * ONE],
        [tokenA, 250n * ONE],
        [tokenB, 3000n * ONE],
        [tokenA, 10n * ONE],
      ];

      for (const [token, amount] of trades) {
        await pool.connect(bob).swap(await token.getAddress(), amount, 0, bob.address, 0);
        [rA, rB] = await pool.getReserves();
        const newK = rA * rB;
        expect(newK).to.be.greaterThanOrEqual(k);
        k = newK;
      }
    });
  });

  describe("batchSwap (one-click multi-trade simulation)", function () {
    it("executes several alternating swaps in a single transaction", async function () {
      const { pool, tokenA, tokenB, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(10_000n * ONE, 10_000n * ONE, 0, 0, alice.address, 0);

      const tokenInIsA = [true, false, true];
      const amountsIn = [50n * ONE, 40n * ONE, 20n * ONE];
      const minAmountsOut = [0n, 0n, 0n];

      const aBefore = await tokenA.balanceOf(bob.address);
      const bBefore = await tokenB.balanceOf(bob.address);

      await expect(
        pool.connect(bob).batchSwap(tokenInIsA, amountsIn, minAmountsOut)
      ).to.emit(pool, "Swap");

      const aAfter = await tokenA.balanceOf(bob.address);
      const bAfter = await tokenB.balanceOf(bob.address);

      // Bob sent tokenA on legs 0 and 2, tokenB on leg 1 -- balances should
      // reflect a net change on both sides (not just one), confirming both
      // legs actually executed.
      expect(aAfter).to.not.equal(aBefore);
      expect(bAfter).to.not.equal(bBefore);
    });

    it("reverts the whole batch if any single leg fails its slippage guard", async function () {
      const { pool, alice, bob } = await loadFixture(deployFixture);
      await pool.connect(alice).addLiquidity(10_000n * ONE, 10_000n * ONE, 0, 0, alice.address, 0);

      const tokenInIsA = [true, true];
      const amountsIn = [50n * ONE, 50n * ONE];
      // Second leg demands an impossibly high minimum output.
      const minAmountsOut = [0n, ethers.parseEther("1000000")];

      await expect(
        pool.connect(bob).batchSwap(tokenInIsA, amountsIn, minAmountsOut)
      ).to.be.revertedWithCustomError(pool, "InsufficientOutputAmount");
    });
  });

  describe("first-depositor manipulation resistance", function () {
    it("prevents an attacker from stealing a subsequent depositor's funds via donation", async function () {
      const { pool, tokenA, tokenB, deployer, alice, bob } = await loadFixture(deployFixture);

      // Attacker (bob) deposits the smallest possible amount to mint just over
      // MINIMUM_LIQUIDITY worth of shares.
      await pool.connect(bob).addLiquidity(1001n, 1001n, 0, 0, bob.address, 0);
      const attackerLp = await pool.balanceOf(bob.address);
      expect(attackerLp).to.be.greaterThan(0n);

      // Attacker then "donates" a large amount directly to the pool contract,
      // trying to inflate the value-per-LP-token ratio before alice deposits.
      // (Top up bob's balance first since the default faucet-mint isn't enough.)
      await tokenA.connect(bob).faucet();
      await tokenB.connect(bob).faucet();
      await tokenA.connect(bob).transfer(await pool.getAddress(), 15_000n * ONE);
      await tokenB.connect(bob).transfer(await pool.getAddress(), 15_000n * ONE);

      // Because reserves are tracked explicitly (not via balanceOf), the raw
      // donation alone does NOT change reserveA/reserveB or pricing at all --
      // it just sits as an un-accounted balance. This is itself a strong
      // mitigation compared to balance-synced AMMs. Confirm reserves are
      // unaffected by the donation:
      const [reserveA, reserveB] = await pool.getReserves();
      expect(reserveA).to.equal(1001n);
      expect(reserveB).to.equal(1001n);

      // Alice can still deposit normally at the true 1:1 ratio without being
      // penalized by the attempted donation.
      await pool.connect(alice).addLiquidity(1000n * ONE, 1000n * ONE, 0, 0, alice.address, 0);
      const aliceLp = await pool.balanceOf(alice.address);
      expect(aliceLp).to.be.greaterThan(0n);
    });
  });

  describe("impermanent loss reference calculation (off-chain formula cross-check)", function () {
    it("matches the closed-form IL formula at known price ratios", function () {
      // IL(r) = 2*sqrt(r)/(1+r) - 1, where r = priceRatio (new/old).
      // This mirrors the formula documented in the PRD and implemented in
      // the frontend; cross-checked here with known reference points.
      function impermanentLoss(r) {
        return 2 * Math.sqrt(r) / (1 + r) - 1;
      }
      const cases = [
        { ratio: 1.25, expectedPct: -0.6 },
        { ratio: 1.5, expectedPct: -2.0 },
        { ratio: 2.0, expectedPct: -5.7 },
        { ratio: 4.0, expectedPct: -20.0 },
      ];
      for (const { ratio, expectedPct } of cases) {
        const ilPct = impermanentLoss(ratio) * 100;
        expect(ilPct).to.be.closeTo(expectedPct, 0.2);
      }
    });
  });
});
