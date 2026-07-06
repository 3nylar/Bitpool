// Copies the ABI arrays for LiquidityPoolAMM and MockERC20 out of the
// Hardhat/solc artifacts and into frontend/lib/contracts/abi/, so the frontend
// always builds against the ABI that matches whatever was last compiled.
// Run automatically as part of `npm run compile` in a full local setup, or
// manually with `npm run sync-abi`.
const fs = require("fs");
const path = require("path");

const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "contracts");
const OUT_DIR = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "lib",
  "contracts",
  "abi",
);

const targets = [
  {
    source: "LiquidityPoolAMM.sol/LiquidityPoolAMM.json",
    out: "LiquidityPoolAMM.json",
  },
  { source: "MockERC20.sol/MockERC20.json", out: "MockERC20.json" },
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const { source, out } of targets) {
  const artifactPath = path.join(ARTIFACTS_DIR, source);
  if (!fs.existsSync(artifactPath)) {
    console.error(
      `Artifact not found: ${artifactPath}. Run "npm run compile" first.`,
    );
    process.exit(1);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  fs.writeFileSync(
    path.join(OUT_DIR, out),
    JSON.stringify(artifact.abi, null, 2),
  );
  console.log(`Synced ${out}`);
}
