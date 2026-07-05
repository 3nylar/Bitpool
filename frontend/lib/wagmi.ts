import { http } from "wagmi";
import { sepolia, hardhat, type Chain } from "wagmi/chains";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";

// The simulator is designed to run against either:
//  - a public testnet (Sepolia) so real users anywhere can reach it without
//    running any infrastructure themselves -- this is the recommended
//    production target, or
//  - a local Hardhat node (chainId 31337) for local development.
//
// Every token in this app is a valueless "sim" token (see contracts/), so
// there is no reason to ever support mainnet, and the app deliberately does
// not offer it as an option.
const rpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || "https://rpc.sepolia.org";
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

const chains: readonly [Chain, ...Chain[]] =
  process.env.NEXT_PUBLIC_CHAIN_NAME === "localhost" ? [hardhat, sepolia] : [sepolia, hardhat];

export const wagmiConfig = getDefaultConfig({
  appName: "Liquidity Pool Simulator",
  projectId: walletConnectProjectId || "00000000000000000000000000000000",
  chains,
  transports: {
    [sepolia.id]: http(rpcUrl),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  ssr: true,
});

export const activeChain = process.env.NEXT_PUBLIC_CHAIN_NAME === "localhost" ? hardhat : sepolia;
