# Bitpool — Liquidity Pool Simulator

An educational, production-ready web app for learning how automated market
makers (constant-product AMMs) actually work — by running one. Real smart
contract, real on-chain mechanics, real (if valueless) tokens on a public
Ethereum test network. No real money, ever.

This repo contains two independent projects:

```
contracts/   Solidity smart contracts (Hardhat) — the AMM pool + mock tokens
web/         Next.js 15 frontend — landing page, auth, and the simulator dashboard
```

---

## 1. What's actually implemented

**Contracts** (`contracts/contracts/`)

- `LiquidityPoolAMM.sol` — a Uniswap-V2-style constant-product (`x·y=k`) pool for two ERC-20 tokens: `addLiquidity`, `removeLiquidity`, `swap`, and a `batchSwap` convenience function for one-click "simulate market activity." Implements the first-depositor manipulation mitigation, checks-effects-interactions + `ReentrancyGuard`, and full custom-error revert reasons.
- `MockERC20.sol` — a free, valueless, mintable token with a public `faucet()`.
- **13 passing tests** (`contracts/test/LiquidityPoolAMM.test.js`) covering liquidity math, swap math, the fee mechanism, the first-depositor attack, slippage protection, and the batch-swap feature. Run them with `npm test` inside `contracts/`.

**Frontend** (`web/`)

- Landing page with a live-feeling animated hero visual, "how it works," feature grid, and FAQ.
- Authentication via **Auth.js (NextAuth v5)** with two independent sign-in paths:
  - **Wallet (Sign-In With Ethereum / SIWE)** — the primary path. No password; the wallet signs a message, the server verifies it.
  - **Email magic link** — a fallback for people without a wallet yet.
- The simulator dashboard: live pool overview, swap panel with real-time price-impact preview, add/remove liquidity, a live price chart, an impermanent-loss chart (your LP value vs. a "held" baseline), a fee-accrual indicator, and a one-click "simulate market activity" feature.
- Every number in the simulator is read directly from the deployed contract — nothing is faked client-side.

---

## 2. Prerequisites

- Node.js 20+
- npm
- A Sepolia RPC URL (a provider like [Alchemy](https://www.alchemy.com/) or [Infura](https://www.infura.io/) — the public default RPC is fine for light testing but is rate-limited)
- A wallet with a small amount of Sepolia ETH for deployment gas ([sepoliafaucet.com](https://sepoliafaucet.com/) or similar)
- A [WalletConnect Cloud](https://cloud.walletconnect.com/) project ID (free)
- SMTP credentials for sending email magic links (any provider — Postmark, SendGrid, Resend, or even a Gmail app password for testing)

---

## 3. Deploy the contracts

```bash
cd contracts
npm install
cp .env.example .env   # then fill in SEPOLIA_RPC_URL, DEPLOYER_PRIVATE_KEY, ETHERSCAN_API_KEY
npm test                # 13 tests should pass
npm run deploy:sepolia  # deploys MockERC20 x2 + LiquidityPoolAMM, seeds initial liquidity
```

The deploy script prints the three addresses you need and also writes them
to `web/lib/contracts/deployments/sepolia.json` automatically. Copy them
into `web/.env.local` (see below).

Optionally verify the contracts on Etherscan so anyone can read the source:

```bash
npm run verify:sepolia -- <POOL_ADDRESS> <TOKEN_A_ADDRESS> <TOKEN_B_ADDRESS> 30 "LP sUSD/sETH" "LP-SIM"
```

> **A note on this sandbox's build environment:** while developing this
> project, `npx hardhat compile`'s normal path (downloading the solc binary
> from `binaries.soliditylang.org`) was blocked by network restrictions
> specific to that sandbox. A fallback (`npm run compile:offline`, using the
> pure-JS `solc` npm package) was used instead, and all 13 tests pass
> against it. In your own environment, plain `npm run compile` / `npm test`
> will work normally — the offline scripts remain available as a fallback
> if you ever hit a similarly locked-down network.

---

## 4. Configure and run the frontend locally

```bash
cd web
npm install
cp .env.example .env.local   # fill in the contract addresses from step 3, plus auth config
npx prisma generate
npx prisma migrate deploy    # creates the local SQLite dev database
npm run dev
```

Visit `http://localhost:3000`. Sign in with a wallet (Sepolia network) or
email, claim free tokens from the faucet, and start experimenting.

### Auth configuration notes

- `AUTH_SECRET`: generate with `npx auth secret` or `openssl rand -base64 32`.
- Email magic links require real SMTP credentials to actually send mail — without them, wallet sign-in still works fully.
- `DATABASE_URL` defaults to a local SQLite file for zero-setup development. **For production, switch to a managed Postgres database** (Vercel Postgres, Neon, Supabase, etc.): change `provider = "postgresql"` in `web/prisma/schema.prisma`, point `DATABASE_URL` at it, then run `npx prisma migrate deploy`. No other code changes are needed.

---

## 5. Deploying to production (so real users can reach it)

**Recommended stack:** contracts on Sepolia (already done in step 3) + frontend on [Vercel](https://vercel.com).

1. Push this repo to GitHub.
2. Import the `web/` directory as a new Vercel project (set the project **root directory** to `web`).
3. Add all the environment variables from `web/.env.example` in Vercel's Project Settings → Environment Variables, using your real Sepolia contract addresses, a production `DATABASE_URL` (Postgres — see above), real SMTP credentials, and a freshly generated `AUTH_SECRET`.
4. Deploy. Vercel will run `npx prisma generate` automatically as part of the build if you add it to the build command (`prisma generate && next build`), or add a `postinstall` script (already included in `web/package.json`) that does this for you.
5. Your simulator is now live at a public URL — anyone can sign in and use it without running anything locally.

There is nothing in this app that requires the visitor to run a node,
install anything, or hold real cryptocurrency of any kind.

---

## 6. Security notes

- The AMM contract follows checks-effects-interactions and uses `ReentrancyGuard` on every value-moving function.
- The classic "first-depositor" share-price manipulation attack is mitigated exactly as Uniswap V2 does (a `MINIMUM_LIQUIDITY` amount is permanently locked on the first deposit) — see the dedicated test for a simulated attack attempt.
- **This contract has not been professionally audited.** It's built for education on a public test network with valueless tokens. Do not deploy it to mainnet or adapt it to hold real value without a proper audit.
- SIWE (wallet sign-in) uses single-use, server-issued nonces with a 10-minute expiry to prevent signature replay.

---

## 7. Known simplifications (documented, not accidental)

- **Impermanent-loss baseline is stored client-side** (`localStorage`, keyed by wallet address) rather than in a backend indexer database. This is called out directly in `web/lib/hooks/useDepositBaseline.ts`. A larger-scale deployment would move this to the off-chain indexer described in the project's PRD, so it survives across devices.
- **Price/reserve chart history resets on page reload**, backfilled from a short recent block window on load. It's a live session view, not a permanent historical archive.
- **"Simulate market activity" runs from the signed-in user's own wallet** via the contract's `batchSwap` function (one signature, several trades) rather than a separate always-on backend bot wallet — simpler to run, no infrastructure to maintain, and just as real on-chain.

---

## 8. Project structure

```
contracts/
  contracts/LiquidityPoolAMM.sol
  contracts/MockERC20.sol
  test/LiquidityPoolAMM.test.js
  scripts/deploy.js
  scripts/syncAbi.js
  build.js                      (offline solc-js fallback compiler)

web/
  app/
    page.tsx                    landing page
    login/page.tsx               sign-in (wallet + email)
    simulator/page.tsx           main dashboard (auth-protected)
    api/auth/[...nextauth]/      Auth.js route handler
    api/auth/siwe-nonce/         SIWE nonce issuance endpoint
  components/
    landing/                    hero, how-it-works, features, FAQ
    auth/                       wallet + email sign-in components
    simulator/                  pool overview, swap, liquidity, charts, etc.
    ui/                         shared Button/Card/Badge/Tooltip primitives
  lib/
    contracts/                  ABIs + addresses
    hooks/                      pool state, user position, deposit baseline
    math/amm.ts                 client-side AMM math mirroring the contract
    auth.ts, prisma.ts, wagmi.ts
  prisma/schema.prisma
  middleware.ts                 protects /simulator behind sign-in
```
