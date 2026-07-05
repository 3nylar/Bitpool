import type { Abi } from "viem";
import poolAbiJson from "./abi/LiquidityPoolAMM.json";
import erc20AbiJson from "./abi/MockERC20.json";

const poolAbi = poolAbiJson as unknown as Abi;
const erc20Abi = erc20AbiJson as unknown as Abi;

export const CONTRACTS = {
  pool: {
    address: (process.env.NEXT_PUBLIC_POOL_ADDRESS || "") as `0x${string}`,
    abi: poolAbi,
  },
  tokenA: {
    address: (process.env.NEXT_PUBLIC_TOKEN_A_ADDRESS || "") as `0x${string}`,
    abi: erc20Abi,
    symbol: "sUSD",
    displayName: "Simulated USD",
  },
  tokenB: {
    address: (process.env.NEXT_PUBLIC_TOKEN_B_ADDRESS || "") as `0x${string}`,
    abi: erc20Abi,
    symbol: "sETH",
    displayName: "Simulated ETH",
  },
} as const;

export const FEE_BPS = 30; // 0.3%, must match the deployed contract's immutable feeBps.

export function isContractConfigured() {
  return Boolean(
    CONTRACTS.pool.address && CONTRACTS.tokenA.address && CONTRACTS.tokenB.address
  );
}
