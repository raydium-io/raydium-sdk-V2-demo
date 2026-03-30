# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Demo/example project for **Raydium SDK V2** — a Solana DEX SDK. Each file is a standalone script demonstrating a specific operation (swap, add liquidity, create pool, etc.) across different pool types.

## Commands

```bash
# Install dependencies
yarn install

# Run any demo script
yarn dev src/<module>/<script>.ts

# Build TypeScript
yarn build

# Clean build artifacts
yarn clean
```

There is no test suite. Each `src/` file is an independent demo script run individually via `yarn dev`.

## Setup

1. Copy `src/config.ts.template` to `src/config.ts`
2. Set your wallet secret key (bs58-encoded), RPC URL, and cluster (`mainnet` | `devnet`)
3. For gRPC features, set `grpcUrl` and `grpcToken`

`src/config.ts` is gitignored — never commit it.

## Architecture

**SDK initialization**: `src/config.ts` exports `initSdk()` which lazily initializes a singleton `Raydium` instance. All demo scripts import from here.

**Module structure** — each directory covers a pool type or feature:
- `amm/` — AMM V4 (legacy) and Stable pools
- `clmm/` — Concentrated Liquidity Market Maker pools
- `cpmm/` — Constant Product Market Maker pools
- `trade/` — Smart routing across all pool types with caching
- `launchpad/` — Token launch platform (bonding curves, vesting, platform/creator fees)
- `farm/` — Staking operations
- `grpc/` — Real-time pool subscriptions via Yellowstone gRPC
- `cache/` — JSON file caching for pool data with TTL (default 10 min)

**Common script pattern**:
```
1. const raydium = await initSdk()
2. Fetch pool info (API or on-chain)
3. Compute amounts/routes
4. Build transaction via SDK method → returns { execute, transaction }
5. Call execute() to send
```

**Pool type validation**: Each module has a `utils.ts` that validates pool program IDs match the expected type (AMM vs CLMM vs CPMM).

**Transaction versions**: Supports both V0 (versioned) and Legacy transactions, configured in `config.ts`.

## Key Dependencies

- `@raydium-io/raydium-sdk-v2` — core SDK
- `@solana/web3.js` / `@solana/spl-token` — Solana primitives
- `@triton-one/yellowstone-grpc` — gRPC subscriptions
- `decimal.js` — precise decimal arithmetic for token amounts
