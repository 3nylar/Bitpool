import { formatUnits, parseUnits } from "viem";

export function fmtToken(value: bigint, decimals = 18, maxFractionDigits = 4): string {
  const asNumber = Number(formatUnits(value, decimals));
  return asNumber.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}

export function toUnits(value: string, decimals = 18): bigint {
  if (!value || Number.isNaN(Number(value))) return 0n;
  try {
    return parseUnits(value as `${number}`, decimals);
  } catch {
    return 0n;
  }
}

export function fmtPercent(fraction: number, digits = 2): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}

export function fmtUsdLike(value: number, digits = 2): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
