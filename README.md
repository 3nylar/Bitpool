# Bitpool

<p align="center">
  <strong>Learn how DeFi liquidity pools work by actually using one.</strong>
</p>

<p align="center">
  An interactive Uniswap V2-style AMM simulator built with Solidity, Next.js, and Ethereum Sepolia.
</p>

<p align="center">
  <a href="https://bitpool-sim.vercel.app">Live Demo</a>
  ·
  <a href="https://github.com/3nylar/Bitpool">GitHub</a>
</p>

---

## What is Bitpool?

Bitpool is an interactive **automated market maker (AMM) simulator** designed to make DeFi mechanics easier to understand through hands-on experimentation.

Instead of only reading about:

- `x × y = k`
- liquidity pools
- swaps
- trading fees
- price impact
- impermanent loss

...you can interact with an actual Solidity AMM deployed on **Ethereum Sepolia** and watch the pool state change on-chain.

> **No real money. No mainnet funds. Just DeFi mechanics you can actually interact with.**

---

## Try It

**[Launch Bitpool →](https://bitpool-sim.vercel.app)**

Connect a wallet on **Ethereum Sepolia**, claim free test tokens from the faucet, and start experimenting with the pool.

The simulator reads its pool state directly from the deployed smart contracts rather than pretending the numbers are happening client-side.

---

## Features

### Token Swaps

Execute swaps against a constant-product AMM and see how your trade affects:

- execution price
- pool reserves
- price impact
- trading fees
- output amount

### Liquidity Provision

Add liquidity to the pool and receive an LP position.

You can:

- deposit both tokens
- monitor your position
- remove liquidity
- track the value of your LP position

### Impermanent Loss

Bitpool visualizes your LP position against a simple "hold" baseline so you can see how changes in the pool's relative token price affect your position.

### Live Pool Data

The dashboard exposes live on-chain information including:

- token reserves
- pool price
- liquidity
- swap activity
- fees
- price movement

### Price Impact

Preview how a trade affects the pool before executing it.

### Trading Fees

Swaps generate fees for liquidity providers, allowing you to see how fee accumulation affects an LP position.

### Simulate Market Activity

Use the built-in market activity simulation to execute multiple swaps on-chain and watch the pool respond.

### Wallet Authentication

Bitpool supports **Sign-In With Ethereum (SIWE)** so users can authenticate by signing a message with their wallet.

Email magic-link authentication is also available as a fallback.

---

## How the AMM Works

Bitpool uses the constant-product AMM model:

```text
x × y = k
```

Where:

- `x` = reserve of Token A
- `y` = reserve of Token B
- `k` = constant product

When a user swaps tokens, the pool's reserves change while the invariant is maintained, subject to the pool's trading fee.

This lets you see the mechanics behind decentralized exchanges instead of treating them as a black box.

---

## Architecture

```text
                         BITPOOL
                            │
              ┌─────────────┴─────────────┐
              │                           │
          FRONTEND                    BLOCKCHAIN
              │                           │
        Next.js 15                  Ethereum Sepolia
              │                           │
       wagmi / viem                        │
              │                           │
              └─────────────┬─────────────┘
                            │
                    LiquidityPoolAMM
                            │
                 ┌──────────┴──────────┐
                 │                     │
              Token A               Token B
                 │                     │
                 └──────────┬──────────┘
                            │
                       x × y = k
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
        Swaps          Liquidity           Fees
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                    Pool Analytics
                            │
             ┌──────────────┴──────────────┐
             │                             │
        Price Impact                Impermanent Loss
```

---

## Tech Stack

### Smart Contracts

- **Solidity**
- **Hardhat**
- **OpenZeppelin**
- **Ethereum Sepolia**
- ERC-20 mock tokens

### Frontend

- **Next.js 15**
- **React**
- **TypeScript**
- **Tailwind CSS**
- **wagmi**
- **viem**

### Authentication

- **Auth.js / NextAuth v5**
- **Sign-In With Ethereum (SIWE)**
- Email magic links

### Data & Persistence

- **Prisma**
- **SQLite** for local development
- PostgreSQL-compatible setup for production

---

## What's Actually Implemented

### Smart Contracts

`contracts/contracts/`

#### `LiquidityPoolAMM.sol`

A Uniswap V2-style constant-product AMM supporting:

- `addLiquidity`
- `removeLiquidity`
- `swap`
- `batchSwap`

The contract also includes:

- `x × y = k` constant-product pricing
- trading fees
- slippage protection
- custom errors
- `ReentrancyGuard`
- checks-effects-interactions
- `MINIMUM_LIQUIDITY` protection against first-depositor share-price manipulation

#### `MockERC20.sol`

A free, valueless ERC-20 token used for experimentation.

Includes a public faucet so users can obtain test tokens without real funds.

### Tests

The contract suite currently includes **13 passing tests** covering areas such as:

- liquidity math
- swap math
- trading fees
- slippage protection
- first-depositor attack mitigation
- batch swaps

Run the test suite with:

```bash
cd contracts
npm test
```

---

## Deployed Network

Bitpool currently runs on:

**Ethereum Sepolia**

The project intentionally uses a public Ethereum test network and valueless test tokens.

### Contract Addresses

After deployment, the contract addresses are written to:

```text
frontend/lib/contracts/deployments/sepolia.json
```

If you deploy your own instance, you can verify the contracts on Etherscan and use your own addresses in the frontend.

---

## Run Locally

### Prerequisites

You'll need:

- Node.js 20+
- npm
- A Sepolia RPC URL
- A wallet with a small amount of Sepolia ETH for deployment gas
- A WalletConnect Cloud project ID
- SMTP credentials if you want to enable email magic links

---

### 1. Clone the repository

```bash
git clone https://github.com/3nylar/Bitpool.git
cd Bitpool
```

---

### 2. Install and test the contracts

```bash
cd contracts
npm install
```

Create your environment file:

```bash
cp .env.example .env
```

Configure:

```text
SEPOLIA_RPC_URL=
DEPLOYER_PRIVATE_KEY=
ETHERSCAN_API_KEY=
```

Run the tests:

```bash
npm test
```

Deploy to Sepolia:

```bash
npm run deploy:sepolia
```

The deployment script deploys:

- Mock Token A
- Mock Token B
- LiquidityPoolAMM

and seeds the pool with initial liquidity.

The generated addresses are also written to the frontend deployment file.

---

### 3. Configure the frontend

```bash
cd ../frontend
npm install
```

Create the local environment file:

```bash
cp .env.example .env.local
```

Add the required contract addresses and authentication configuration.

Generate Prisma:

```bash
npx prisma generate
```

Create the local database:

```bash
npx prisma migrate deploy
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## Authentication

Bitpool supports two authentication paths.

### Sign-In With Ethereum

Users can authenticate with their wallet without creating a password.

The flow uses:

1. Server-issued nonce
2. Wallet signature
3. Server-side signature verification
4. Single-use nonce
5. Nonce expiry

This helps prevent signature replay attacks.

### Email Magic Link

Users can alternatively authenticate using an email magic link.

Wallet authentication does not require SMTP configuration.

---

## Security

The AMM contract includes several defensive measures:

- `ReentrancyGuard`
- checks-effects-interactions
- custom Solidity errors
- slippage protection
- minimum liquidity locking
- first-depositor attack mitigation

### Important

**Bitpool has not been professionally audited.**

The contracts are intended for **education and experimentation on Ethereum Sepolia**.

Do **not** deploy the contracts to mainnet or use them to hold real funds without a professional smart-contract security audit.

---

## Known Simplifications

Bitpool intentionally makes a few simplifications to keep the project focused and easy to run.

### Impermanent-loss baseline

The user's LP baseline is currently stored client-side using `localStorage`, keyed by wallet address.

A larger production deployment would move this into an indexed backend so the position can persist across devices.

### Chart history

Price and reserve chart history currently represents the active simulator session.

The chart can backfill a short recent block window when the page loads, but it is not a permanent historical index.

### Market simulation

The "Simulate Market Activity" feature uses the signed-in user's wallet to execute the `batchSwap` function.

It does not depend on a permanently running bot wallet.

---

## Project Structure

```text
Bitpool/
│
├── contracts/
│   ├── contracts/
│   │   ├── LiquidityPoolAMM.sol
│   │   └── MockERC20.sol
│   │
│   ├── test/
│   │   └── LiquidityPoolAMM.test.js
│   │
│   ├── scripts/
│   │   ├── deploy.js
│   │   └── syncAbi.js
│   │
│   └── build.js
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── login/
│   │   ├── simulator/
│   │   └── api/
│   │
│   ├── components/
│   │   ├── landing/
│   │   ├── auth/
│   │   ├── simulator/
│   │   └── ui/
│   │
│   ├── lib/
│   │   ├── contracts/
│   │   ├── hooks/
│   │   ├── math/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   └── wagmi.ts
│   │
│   ├── prisma/
│   │   └── schema.prisma
│   │
│   └── middleware.ts
│
└── README.md
```

---

## Roadmap

### AMM & DeFi

- [x] Constant-product AMM
- [x] Token swaps
- [x] Add/remove liquidity
- [x] Trading fees
- [x] Price-impact preview
- [x] Impermanent-loss visualization
- [x] Market activity simulation
- [x] Sepolia deployment
- [x] Contract test suite

### Analytics

- [ ] Persistent historical pool data
- [ ] Event indexing
- [ ] Advanced LP analytics
- [ ] Historical impermanent-loss tracking
- [ ] More detailed fee analytics

### Protocol

- [ ] Multiple liquidity pools
- [ ] Multi-token support
- [ ] More configurable pool parameters
- [ ] Expanded contract test coverage

### Production

- [ ] Professional smart-contract audit
- [ ] Production database
- [ ] Mainnet deployment after audit
- [ ] Production monitoring

---

## Why This Project Exists

AMMs are often introduced through equations and diagrams.

That's useful, but it doesn't always make the mechanics intuitive.

Bitpool was built around a simple idea:

> **Don't just learn how an AMM works. Use one.**

By interacting with the pool, you can see how a trade changes reserves, how liquidity providers earn fees, and how changes in relative token prices can create impermanent loss.

The goal is to make DeFi mechanics **observable, interactive, and easier to understand.**

---

## Contributing

Contributions, ideas, bug reports, and educational improvements are welcome.

If you find a bug or have an idea for improving the simulator:

1. Open an issue.
2. Explain the problem or proposed improvement.
3. Include reproduction steps where applicable.
4. Submit a pull request for approved changes.

---

## License

See the repository for the applicable license and project terms.

---

## Author

**Enilara Adefila**

Built as an exploration of:

- decentralized finance
- automated market makers
- Solidity smart contracts
- Ethereum
- Web3 frontend development
- on-chain application architecture

---

<p align="center">
  <strong>Bitpool — Learn AMMs by actually using one.</strong>
</p>
