# Raydium SDK V2 Demo

## About the Project

This project demonstrates the usage of the [Raydium SDK V2](https://github.com/raydium-io/raydium-sdk-V2), a powerful toolkit for interacting with the Raydium decentralized exchange (DEX) on the Solana blockchain. It provides examples and utilities for performing various operations such as liquidity management, token swaps, and more.

This documentation is designed to help web2 developers transition into the web3 space by providing clear instructions, explanations, and example codes.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following:

1. **Node.js and Yarn**: Install [Node.js](https://nodejs.org/) and [Yarn](https://yarnpkg.com/) on your system.
2. **Wallet Secret Key**: A Solana wallet secret key for signing transactions. You can generate one using the [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools).
3. **RPC URL**: A Solana RPC endpoint for connecting to the blockchain. You can use [QuickNode](https://www.quicknode.com/) or [Alchemy](https://www.alchemy.com/solana) to get an RPC URL.
4. **Raydium API Host (Optional)**: Only required for testing on development environments.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/raydium-io/raydium-sdk-V2-demo.git
   cd raydium-sdk-V2-demo
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Configure the project:
   - Copy `config.ts.template` to `config.ts`:
     ```bash
     cp src/config.ts.template src/config.ts
     ```
   - Replace placeholders in `config.ts` with your configuration:
     ```typescript
     export const CONFIG = {
       WALLET_SECRET_KEY: '<YOUR_WALLET_SECRET_KEY>', // Your wallet secret key
       RPC_URL: '<YOUR_RPC_URL>', // Your preferred RPC URL
       API_HOST: '<API_HOST>' // Optional, only needed for development testing
     };
     ```

---

## Usage

### Running Demo Scripts

To run a specific demo script, use the following command:
```bash
yarn dev src/<FOLDER>/<SCRIPT_NAME>
```
Example:
```bash
yarn dev src/cpmm/deposit.ts
```
**Note**: Uncomment the last line in the script if you want to execute transactions.

### Example: Running a Token Swap

Here is an example of running a token swap using the `swap.ts` script:

1. Open the `src/amm/swap.ts` file and ensure the configuration matches your setup.
2. Run the script:
   ```bash
   yarn dev src/amm/swap.ts
   ```
3. Example output:
   ```bash
   Transaction successful! Swap completed with transaction ID: <TRANSACTION_ID>
   ```

### Running the CLMM Market Maker

Use the following command to run the CLMM market maker:
```bash
yarn clmm-market <POOL_ID> <CREATE_POSITION_DEVIATION> <CLOSE_POSITION_DEVIATION>
```
Example:
```bash
yarn clmm-market 8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj 10 20
```
**Note**: Uncomment the `close position` and `create new position` code parts in the script.

---

## SDK Methods

### Transaction Methods

All transaction-related build functions return the following data:
```javascript
const { execute, transaction, builder, extInfo } = await raydium.clmm.openPositionFromBase({ ...params });
```
- **`transaction` or `transactions`**: All built transactions.
- **`builder`**: All instructions in the transaction (e.g., `builder.allInstructions`, `builder.AllTxData`).
- **`extInfo`**: Transaction-related public keys (e.g., `poolId`, `programId`).

### Example: Fetch Pool List by Mints (Mainnet Only)

```javascript
import { PoolFetchType } from '@raydium-io/raydium-sdk-v2';

const list = await raydium.api.fetchPoolByMints({
  mint1: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R', // required
  mint2: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // optional
  type: PoolFetchType.All, // optional
  sort: 'liquidity', // optional
  order: 'desc', // optional
  page: 1, // optional
});
console.log('Fetched Pool List:', list);
```

### Example: Fetch Mint Info

```javascript
const mintInfo = await raydium.token.getTokenInfo('<Mint address>');
console.log('Mint Info:', mintInfo);
```

### Example: Fetch Token Accounts

```javascript
const tokenAccounts = await raydium.account.fetchWalletTokenAccounts({ forceUpdate: true });
console.log('Token Accounts:', tokenAccounts);
```

### More API Methods

For more API methods, refer to the [Raydium SDK V2 documentation](https://github.com/raydium-io/raydium-sdk-V2#api-methods).

---

## FAQ

### Common Errors

#### 1. **Error: Block height exceeded / exceeded CUs meter at BPF instruction**
   - Transactions expired. Set higher priority fees (`computeBudgetConfig`) to ensure smooth execution.
   - For devnet testing, replace the `programId` with the devnet one.

#### 2. **`raydium.api.fetchPoolById` or `raydium.api.fetchFarmInfoById` returns null**
   - The API does not support devnet pool/farm data. Test on mainnet.
   - Use `raydium.xxxx.getRpcPoolInfos` for devnet `rpc` pool info.
   - Newly created pools may take a few minutes to sync data to the API. Use `raydium.xxxx.getRpcPoolInfos` for immediate info.

#### 3. **Create AMM Pool Error**
   - **Error Code `0x10001a9`**: Use the provided `createMarket.ts` script to create the market instead of external tools.
   - **LP Amount Too Low**: Provide a higher base/quote amount when creating the pool. For SOL/WSOL markets, provide more than 4 SOL (4 * 10^9).

---

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to improve this project.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
