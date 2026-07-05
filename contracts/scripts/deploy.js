const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys two mock tokens and the AMM pool, seeds an initial liquidity
// position, and writes the resulting addresses + ABIs to
// web/lib/contracts/deployments/<network>.json so the frontend can pick
// them up automatically.
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying to network "${network.name}" from ${deployer.address}`);

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const tokenA = await MockERC20.deploy("Simulated USD", "sUSD", 18, deployer.address);
  await tokenA.waitForDeployment();
  const tokenB = await MockERC20.deploy("Simulated ETH", "sETH", 18, deployer.address);
  await tokenB.waitForDeployment();
  console.log("sUSD deployed to:", await tokenA.getAddress());
  console.log("sETH deployed to:", await tokenB.getAddress());

  const FEE_BPS = 30; // 0.3%, matching the industry-standard Uniswap V2 fee.
  const Pool = await ethers.getContractFactory("LiquidityPoolAMM");
  const pool = await Pool.deploy(
    await tokenA.getAddress(),
    await tokenB.getAddress(),
    FEE_BPS,
    "LP sUSD/sETH",
    "LP-SIM"
  );
  await pool.waitForDeployment();
  console.log("LiquidityPoolAMM deployed to:", await pool.getAddress());

  // Seed a starting liquidity position so the simulator never opens on an
  // empty, unpriced pool for the first visitor.
  const seedAmount = ethers.parseEther("50000");
  await (await tokenA.ownerMint(deployer.address, seedAmount)).wait();
  await (await tokenB.ownerMint(deployer.address, seedAmount / 2000n * 1000n)).wait(); // ~1 sETH = 2000 sUSD starting price
  await (await tokenA.approve(await pool.getAddress(), ethers.MaxUint256)).wait();
  await (await tokenB.approve(await pool.getAddress(), ethers.MaxUint256)).wait();
  await (
    await pool.addLiquidity(
      seedAmount,
      seedAmount / 2000n,
      0,
      0,
      deployer.address,
      0
    )
  ).wait();
  console.log("Seeded initial liquidity: 50,000 sUSD / 25 sETH (starting price 1 sETH = 2,000 sUSD)");

  const deploymentInfo = {
    network: network.name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployedAt: new Date().toISOString(),
    contracts: {
      tokenA: { name: "sUSD", address: await tokenA.getAddress() },
      tokenB: { name: "sETH", address: await tokenB.getAddress() },
      pool: { address: await pool.getAddress(), feeBps: FEE_BPS },
    },
  };

  const outDir = path.join(__dirname, "..", "..", "web", "lib", "contracts", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info written to ${outFile}`);
  console.log("\nAdd these to your web/.env.local:");
  console.log(`NEXT_PUBLIC_CHAIN_NAME=${network.name}`);
  console.log(`NEXT_PUBLIC_POOL_ADDRESS=${await pool.getAddress()}`);
  console.log(`NEXT_PUBLIC_TOKEN_A_ADDRESS=${await tokenA.getAddress()}`);
  console.log(`NEXT_PUBLIC_TOKEN_B_ADDRESS=${await tokenB.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
